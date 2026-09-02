/**
 * server-api.ts — server-only helpers for the BFF proxy.
 *
 * The browser never talks to the bot API directly: every call goes through a
 * same-origin Next.js Route Handler that reads the httpOnly session cookie and
 * forwards it as a Bearer token to the bot. The bot session token therefore
 * never reaches client JS.
 */
import { cookies, headers as requestHeaders } from "next/headers";
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

/**
 * Does this value even have the SHAPE of one of our session tokens?
 *
 * The pre-buffer gate in `guard()` used to be `!(await getSessionToken())` — i.e. "is
 * there a cookie" — which is a question the CALLER answers. Sending
 * `Cookie: __session=x` alongside a replayed App Check token (a bearer value with about
 * an hour of life and no binding to a session, as the note in `guard` concedes) passed
 * it, and the handler then buffered its full byte allowance — 20 MB on the owner-only
 * modversion publish route — before anything asked who was calling.
 *
 * The BFF cannot VERIFY the token: it is an HMAC over the payload and the key lives on
 * the bot. But the wire format is `base64url(json).hexsha256`, so it can cheaply reject
 * anything that is not that, which is what an attacker supplying a cookie has. This is
 * a filter, not an authorisation check — the bot's dependency chain is still the only
 * thing that decides — and it deliberately errs toward accepting: a malformed real token
 * would be refused by the bot a moment later anyway.
 */
export function looksLikeSessionToken(value: string | null | undefined): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0 || dot !== value.lastIndexOf(".")) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (sig.length !== 64 || !/^[0-9a-f]+$/.test(sig)) return false;
  return /^[A-Za-z0-9_-]+={0,2}$/.test(payload);
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

  // Carry the visitor's address through to the bot. Without it every request
  // from the website arrives as one address, which collapses every per-IP bucket
  // the bot has into a single shared one — five wrong link codes from one host
  // then lock *every* website visitor out of linking for ten minutes, and the
  // same goes for the sign-in, 2FA, report and vote limits.
  //
  // This is inert until `API_TRUSTED_PROXIES` on the bot names the peer we
  // connect from: `_client_ip` ignores X-Forwarded-For from an untrusted peer and
  // uses the socket address instead. So it cannot make anything worse — a spoofed
  // header from a browser is discarded exactly as it is today — it simply does
  // nothing until that config is set. That list has to name both hops for the
  // walk to reach the visitor — the peer the bot sees (Caddy) and this function's
  // egress address, which Caddy appends to the chain. `_client_ip` walks the
  // chain from the RIGHT past trusted hops, so a value a browser forged and
  // prepended is never the one it lands on; the header is passed through
  // unmodified rather than rebuilt for exactly that reason.
  //
  // Naming only those two hops is not enough, though, and getting it wrong is
  // its own outage: Google's front end inserts hops of its own in front of this
  // function, so a trusted list that stops short leaves `_client_ip` landing on
  // a Google load-balancer address — which collapses every website visitor into
  // one bucket again, the exact self-DoS this is meant to prevent. Verify the
  // list against a real captured header before turning it on.
  const inboundXff = (await requestHeaders()).get("x-forwarded-for");
  if (inboundXff) headers.set("X-Forwarded-For", inboundXff);

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
 * Refuse an over-large upload on `content-length`, before the handler touches the
 * body — returns a 413 response to hand straight back, or null to carry on.
 *
 * The App Router has no request body limit of its own (the 4 MB `bodyParser` cap
 * is Pages Router only), so `await req.arrayBuffer()` / `req.formData()` buffers
 * whatever arrives — and every upload route does that *before* `proxy` runs App
 * Check and before the bot's own gate (owner-only, on the publish route) can
 * refuse it. So an anonymous 32 MB POST at maxInstances concurrency was paid for
 * in memory and GB-seconds by a request that was going to be 403'd anyway. The
 * bot's `_limit_request_size` makes the same check, but it is downstream of the
 * buffering here.
 *
 * `limit` should match the bot's cap for that endpoint. Multipart framing adds a
 * little to the declared length, hence the small envelope allowance — the bot
 * still enforces the exact ceiling on the decoded part, so this is only a cheap
 * early refusal and never the check that matters.
 *
 * A missing `content-length` is NOT refused: the bot's `_BodyCapMiddleware`
 * counts bytes as they arrive and covers the chunked case, and rejecting on an
 * absent header here would break any client that streams.
 */
export function tooLargeResponse(req: Request, limit: number): NextResponse | null {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit + 16 * 1024) {
    return NextResponse.json({ detail: "That file is too large." }, { status: 413 });
  }
  return null;
}

/**
 * The ceiling for a JSON body. Every JSON route on this site sends a handful of
 * short fields — a code, an id, a reason, a ban list — so nothing legitimate is
 * within two orders of magnitude of this; it is a bound on what an anonymous
 * caller can make the function hold, not a validation rule.
 */
export const MAX_JSON_BYTES = 64 * 1024;

/**
 * The refusals that cost nothing, run as a route handler's FIRST statement —
 * before it touches the body.
 *
 * Both checks existed already; the ordering is the fix. `await req.text()` /
 * `.json()` / `.formData()` buffers the whole body into the SSR function's heap,
 * and App Check — the thing that would have rejected an anonymous request — used
 * to run one statement later, inside `proxy`. Hosting caps a request at ~32 MB
 * and the function takes 80 concurrent ones, so a flood of bodies that were all
 * going to be 403'd was paid for in memory and GB-seconds first, and roughly
 * eight of them at once is the whole heap.
 *
 * `proxy`/`forwardLink` still check App Check themselves and that is deliberate:
 * routes with no body never call this, so the gate cannot live only here. The
 * second verification is a signature check against a cached key set, not a
 * round-trip.
 */
export interface GuardOptions {
  /**
   * Whether a session cookie is required. Defaults to TRUE, so a route that
   * forgets to think about it gets the safe answer.
   *
   * Pass `false` ONLY on the four routes that MINT a session and therefore cannot
   * have one yet: `/api/auth/signin`, `/api/auth/totp`, `/api/auth/link` and
   * `/api/auth/link/poll` (they are exactly the routes that call `forwardLink`
   * rather than `proxy`). Requiring a session on those would be the "gate that
   * assumes an identity everyone has" mistake — it would lock out sign-in itself.
   */
  session?: boolean;
}

export async function guard(
  req: Request,
  limit = MAX_JSON_BYTES,
  opts: GuardOptions = {},
): Promise<NextResponse | null> {
  const tooLarge = tooLargeResponse(req, limit);
  if (tooLarge) return tooLarge;
  // The session check is deliberately BEFORE App Check and before the body is
  // read: it is a cookie read with no I/O, where App Check is a signature check
  // against a cached key set.
  //
  // It closes the half of the pre-buffer allowance that App Check does not. An
  // App Check token is a bearer value with about an hour of life and no binding
  // to a session, so one browser page-load yields a token that can be replayed
  // from a script — and every body-reading route then granted its full byte
  // allowance to that anonymous caller before anything asked who they were. The
  // widest allowance (20 MB, `admin/modversion/publish`) belonged to the route
  // with the narrowest real audience: the single BOT_OWNER_ID account, whose
  // 20 MB multipart body was parsed into the SSR function's heap before the bot's
  // `get_owner` could refuse it.
  if (opts.session !== false && !looksLikeSessionToken(await getSessionToken())) {
    return NextResponse.json({ detail: describeStatus(401) }, { status: 401 });
  }
  if (!(await appCheckOk())) return appCheckDenied();
  return null;
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
  // Pinned, not reflected. Every `/api/v1/web/*` answer is JSON, so copying the
  // upstream `content-type` onto a same-origin body we did not author only
  // creates a way for something upstream to pick the type our own origin serves
  // — `nosniff` covers a guess, not an explicit `text/html`.
  const headers: Record<string, string> = { "content-type": "application/json" };

  // Fill in a failure that explains nothing. Caddy answers a stopped bot with a
  // zero-length 502, and an HTML error page from anything in front of us parses no
  // better — either way the browser has a number and no sentence. The status is
  // preserved (401 handling below and in the pages depends on it); only the body
  // is replaced, and only when there was nothing usable in it.
  if (!r.ok && !hasDetail(body)) {
    body = JSON.stringify({ detail: describeStatus(r.status) });
  }
  if (cacheControl && r.ok) headers["cache-control"] = cacheControl;
  const res = new NextResponse(body, { status: r.status, headers });

  // Any authed call is evidence about the session, so keep the readable hint in
  // step with it here rather than only at login. This is what migrates sessions
  // that predate the hint cookie, and what clears it when a token is revoked
  // somewhere else entirely — "log out all devices" from inside KSP, say.
  if (auth) {
    if (r.ok) setSessionHint(res);
    // clearSessionCookie, not clearSessionHint: this branch correctly identifies that
    // the token is dead (revoked by "log out all devices", by an owner-console
    // logout_all, by an account deletion, or simply expired) and used to clear only the
    // COSMETIC half of the pair. The httpOnly `__session` stayed in the jar with its
    // original 30-day maxAge, so the browser kept transmitting a revoked credential on
    // every subsequent request and each one cost a full round-trip to the bot to be told
    // 401 again. clearSessionCookie clears both.
    else if (r.status === 401) clearSessionCookie(res);
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
