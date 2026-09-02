import { NextRequest, NextResponse } from "next/server";
import { describeStatus, UPSTREAM_DOWN_STATUS } from "@/lib/api-error";
import { botFetch, getSessionToken } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin download proxy for marketplace craft files.
 *
 * The craft live on Google Cloud Storage and are served as text/plain, so linking
 * to them directly just renders the .craft in the browser tab (and the HTML
 * `download` attribute is ignored cross-origin). This route streams the file back
 * from our own origin with `Content-Disposition: attachment`, so the browser saves
 * it — for every listing, including ones uploaded before the bot started tagging
 * blobs itself.
 *
 * It takes a LISTING ID, never a URL. Two things follow from that, and both were
 * the point:
 *
 *  - The credential leaves the browser. `craft_url` is a GCS V4 signature, and it
 *    used to ride in the query string of a same-origin GET — which is exactly what
 *    request logs, browser history and autofill record. An id is not a credential.
 *  - The route stops being an open relay. With the URL as the whole input, anyone
 *    holding one (they are bearer credentials, and publishable) could stream a
 *    25 MB object in a loop and bill the project for the bytes twice over — once
 *    into the function, once out of it. Now every request costs a session.
 *
 * Entitlement is the bot's answer rather than ours, and it is ONE question:
 * `GET /api/v1/web/marketplace/{id}/download` either mints a short-lived signature
 * for a craft this session owns or answers 404. It used to be asked by fetching
 * the caller's whole `purchases` list and then their whole `mine` list and
 * searching both for the id — which made the *failing* request the expensive one:
 * an id you do not own missed both views and so paid for two full uncached
 * Firestore queries, each of which signs a URL per row on the bot's event loop
 * before this route throws the lot away. That is a cost lever pointed at
 * `cost_guard`, so the search moved to the one place that can answer it with a
 * keyed read.
 *
 * The bot answers 404 for "no such listing" and for "not yours" alike, and this
 * route keeps that: the catalog is public, but who bought what is not, and a
 * distinct 403 would report it. 401/403/429 are relayed verbatim instead, so the
 * page offers a sign-in (or shows the suspension, or the limiter's own sentence)
 * rather than claiming the craft is missing.
 *
 * The allow-list stays even though the URL now comes from our own backend: it is
 * what keeps a mistake upstream from turning this into a fetch of somewhere else.
 */
const STORAGE_HOST = "storage.googleapis.com";
const BUCKET = "upoksp-gk-backend.firebasestorage.app";

/** The bot's answer: a signed GCS URL with a 15-minute life, plus the name the
 *  seller uploaded under. */
interface CraftDownload {
  url?: string | null;
  filename?: string | null;
}

export async function GET(req: NextRequest) {
  // NOT App Check, and that is the whole point of this comment.
  //
  // Every other non-public route guards with `guard(req)`, which requires the
  // `x-firebase-appcheck` header. This route cannot: it is reached by a top-level
  // browser NAVIGATION from `<a href={craftDownloadHref(...)}>`, because that is
  // what makes `Content-Disposition: attachment` save a file. A navigation carries
  // cookies and nothing else — no `fetch`, no custom headers, and there is no
  // middleware or service worker in this project to attach one on the way. Adding
  // App Check here therefore did not harden the route, it 403'd every download on
  // the site; and it did so invisibly, because `.env.local` sets
  // ENFORCE_APP_CHECK=false so it still worked on a dev machine.
  //
  // The session cookie is the refusal that a navigation CAN satisfy, and it is the
  // one that matters: entitlement is the bot's answer, `botFetch` sends this
  // session as the Bearer token, and `/api/v1/web/marketplace/{id}/download` is
  // `Depends(get_web_user)` behind a per-account rate limit. This check is only the
  // cheap local half — it saves a bot round-trip for a caller who is plainly signed
  // out. There is no body to buffer on a GET, so `tooLargeResponse` has nothing to
  // do here either.
  if (!(await getSessionToken())) {
    return NextResponse.json({ detail: "Sign in to download this craft." }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ detail: "Missing listing id." }, { status: 400 });
  }

  // Encoded into the path, so an id carrying slashes or dots addresses no other
  // endpoint on the bot.
  const r = await botFetch(`/api/v1/web/marketplace/${encodeURIComponent(id)}/download`);

  if (r.status === 404) {
    // One answer for "not yours" and "no such listing" on purpose: the catalog is
    // public, but who bought what is not, and a distinct 403 would report it.
    return NextResponse.json(
      { detail: "You don't have that craft. Buy it first, or open it from My Uploads." },
      { status: 404 },
    );
  }
  if (!r.ok) {
    // Signed out, revoked, suspended or rate limited: the bot's own answer is the
    // one the page should show. Anything else it says is relayed the same way,
    // with a sentence filled in when the body carried none.
    // Verbatim, not rewritten: a suspension answers with a structured `detail`
    // the page renders itself, so flattening it to a sentence would lose the
    // reason and the countdown. Only a body with nothing usable in it is replaced.
    const body = (await r.json().catch(() => null)) as { detail?: unknown } | null;
    return NextResponse.json(body?.detail ? body : { detail: describeStatus(r.status) },
                             { status: r.status });
  }

  const grant = (await r.json().catch(() => ({}))) as CraftDownload;
  if (!grant.url) {
    console.error(`[download] listing ${id} came back with no craft url`);
    return NextResponse.json({ detail: describeStatus(502) }, { status: 502 });
  }

  let target: URL;
  try {
    target = new URL(grant.url);
  } catch {
    console.error(`[download] listing ${id} has an unparseable craft url`);
    return NextResponse.json({ detail: describeStatus(502) }, { status: 502 });
  }

  const allowed =
    target.protocol === "https:" &&
    target.host === STORAGE_HOST &&
    target.pathname.startsWith(`/${BUCKET}/marketplace/`) &&
    target.pathname.toLowerCase().endsWith(".craft");
  if (!allowed) {
    console.error(`[download] listing ${id} craft url is outside the allow-list`);
    return NextResponse.json({ detail: describeStatus(502) }, { status: 502 });
  }

  // Storage being unreachable is our problem, not the visitor's, and the two cases
  // want different sentences: a 404 means the file is gone for good, anything else
  // means try again later.
  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { cache: "no-store" });
  } catch (e) {
    console.error("[download] storage unreachable:", e);
    return NextResponse.json({ detail: describeStatus(UPSTREAM_DOWN_STATUS) },
                             { status: UPSTREAM_DOWN_STATUS });
  }

  if (upstream.status === 404) {
    return NextResponse.json(
      { detail: "That craft file is no longer in storage. The listing may have been deleted." },
      { status: 404 },
    );
  }
  if (!upstream.ok || !upstream.body) {
    console.error(`[download] storage returned ${upstream.status} for ${target.pathname}`);
    return NextResponse.json(
      { detail: "Couldn't fetch that craft file from storage. That's a problem on our side; try again shortly." },
      { status: 502 },
    );
  }

  // The filename comes from the listing, not from the caller — one fewer thing
  // arriving from the page to sanitize, and the name the seller actually uploaded.
  const safe = (grant.filename || "craft.craft").replace(/[^A-Za-z0-9._-]/g, "_") || "craft.craft";
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${safe}"`,
      "cache-control": "private, no-store",
    },
  });
}
