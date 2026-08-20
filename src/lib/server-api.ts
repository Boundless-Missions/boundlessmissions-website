/**
 * server-api.ts — server-only helpers for the BFF proxy.
 *
 * The browser never talks to the bot API directly: every call goes through a
 * same-origin Next.js Route Handler that reads the httpOnly session cookie and
 * forwards it as a Bearer token to the bot. The bot session token therefore
 * never reaches client JS.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appCheckOk } from "./app-check";
import { describeStatus, UPSTREAM_DOWN_STATUS } from "./api-error";
import { SESSION_HINT_COOKIE } from "@/config/session";

/** 403 returned when App Check enforcement is on and the token is missing/invalid. */
function appCheckDenied(): NextResponse {
  return NextResponse.json({ detail: "App Check verification failed." }, { status: 403 });
}

const BOT_API_URL = (process.env.BOT_API_URL || "http://localhost:5022").replace(/\/$/, "");

// MUST be "__session": Firebase Hosting's CDN strips every cookie except one
// named exactly `__session` from requests/responses to a Hosting-fronted backend.
// Any other name (e.g. "bm_session") gets dropped, so the session never sticks
// and the user can't stay logged in. https://firebase.google.com/docs/hosting/manage-cache#using_cookies
export const SESSION_COOKIE = "__session";
const SESSION_MAX_AGE = 30 * 24 * 3600; // matches the bot's 30-day token lifetime

export function botUrl(path: string): string {
  return BOT_API_URL + path;
}

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/** Forward a request to the bot API, attaching the Bearer token when `auth`. */
export async function botFetch(
  path: string,
  init: RequestInit = {},
  auth = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = await getSessionToken();
    if (!token) return jsonResponse(401, "You're signed out. Sign in again to continue.");
    headers.set("Authorization", `Bearer ${token}`);
  }

  // A bot that is not listening rejects the fetch (ECONNREFUSED, DNS, TLS). Left
  // to itself that throws out of the route handler, Next renders its own 500 HTML
  // page, and the browser gets an unparseable body — so the user is told "500"
  // about a backend that is simply down. Answer it ourselves instead.
  try {
    return await fetch(botUrl(path), { ...init, headers, cache: "no-store" });
  } catch (e) {
    // The real cause belongs in the function logs, never in the response: it names
    // internal hosts and ports.
    console.error(`[bff] bot API unreachable at ${botUrl(path)}:`, e);
    return jsonResponse(UPSTREAM_DOWN_STATUS, describeStatus(UPSTREAM_DOWN_STATUS));
  }
}

/** Does this body already carry a non-empty `detail` for the user to read? */
function hasDetail(body: string): boolean {
  if (!body.trim()) return false;
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    return typeof parsed.detail === "string" && parsed.detail.trim().length > 0;
  } catch {
    return false; // HTML error page, plain text, anything not ours
  }
}

/** A `{ detail }` body, the shape every caller of ours already expects. */
function jsonResponse(status: number, detail: string): Response {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Proxy a bot response straight back to the browser, preserving status + body.
 *
 * `cacheControl` (optional) is applied ONLY to successful (2xx) responses, so the
 * Firebase Hosting CDN can absorb repeated reads of public, identical-for-everyone
 * data (e.g. the marketplace catalog) instead of invoking the function + bot every
 * time. Never pass it for auth'd/per-user routes — their responses must stay private.
 */
export async function proxy(
  path: string,
  init: RequestInit = {},
  auth = true,
  cacheControl?: string,
): Promise<NextResponse> {
  // Auth'd routes are our app's private surface — gate them behind App Check.
  // (Public routes pass auth=false, e.g. the cached listings grid, and skip this.)
  if (auth && !(await appCheckOk())) return appCheckDenied();
  const r = await botFetch(path, init, auth);
  let body = await r.text();
  const headers: Record<string, string> = {
    "content-type": r.headers.get("content-type") || "application/json",
  };

  // Fill in a failure that explains nothing. Caddy answers a stopped bot with a
  // zero-length 502, and an HTML error page from anything in front of us parses no
  // better — either way the browser has a number and no sentence. The status is
  // preserved (401 handling below and in the pages depends on it); only the body
  // is replaced, and only when there was nothing usable in it.
  if (!r.ok && !hasDetail(body)) {
    body = JSON.stringify({ detail: describeStatus(r.status) });
    headers["content-type"] = "application/json";
  }
  if (cacheControl && r.ok) headers["cache-control"] = cacheControl;
  const res = new NextResponse(body, { status: r.status, headers });

  // Any authed call is evidence about the session, so keep the readable hint in
  // step with it here rather than only at login. This is what migrates sessions
  // that predate the hint cookie, and what clears it when a token is revoked
  // somewhere else entirely — "log out all devices" from inside KSP, say.
  if (auth) {
    if (r.ok) setSessionHint(res);
    else if (r.status === 401) clearSessionHint(res);
  }
  return res;
}

/**
 * The JS-readable companion flag. Same lifetime as the session so the two expire
 * together; explicitly NOT httpOnly, because being readable is its whole job.
 */
function setSessionHint(res: NextResponse): void {
  res.cookies.set(SESSION_HINT_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

function clearSessionHint(res: NextResponse): void {
  res.cookies.set(SESSION_HINT_COOKIE, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  setSessionHint(res);
}

/**
 * Forward a link / link-poll call to the bot. On a successful "ok" status the
 * token is stripped from the body and stashed in the httpOnly cookie instead, so
 * it never reaches the browser. "approval_required" / "pending" pass through.
 */
export async function forwardLink(path: string, payload: unknown): Promise<NextResponse> {
  // The link/poll flow is a prime abuse target — require App Check too.
  if (!(await appCheckOk())) return appCheckDenied();
  const r = await botFetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }, false);
  const data = await r.json().catch(() => ({}));
  if (!r.ok && !(data as { detail?: unknown }).detail) {
    return NextResponse.json({ detail: describeStatus(r.status) }, { status: r.status });
  }
  if (r.ok && data && data.status === "ok" && data.token) {
    const { token, ...safe } = data as { token: string } & Record<string, unknown>;
    const res = NextResponse.json(safe, { status: 200 });
    setSessionCookie(res, token);
    return res;
  }
  return NextResponse.json(data, { status: r.status });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  clearSessionHint(res);
}
