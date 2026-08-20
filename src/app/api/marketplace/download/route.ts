import { NextRequest, NextResponse } from "next/server";
import { describeStatus, UPSTREAM_DOWN_STATUS } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin download proxy for marketplace craft files.
 *
 * The craft live on public Google Cloud Storage and are served as text/plain, so
 * linking to them directly just renders the .craft in the browser tab (and the
 * HTML `download` attribute is ignored cross-origin). This route streams the
 * file back from our own origin with `Content-Disposition: attachment`, so the
 * browser saves it — for every listing, including ones uploaded before the bot
 * started tagging blobs itself.
 *
 * To avoid being an open relay, only public objects under our Storage bucket's
 * `marketplace/` prefix are proxied.
 */
const STORAGE_HOST = "storage.googleapis.com";
const BUCKET = "upoksp-gk-backend.firebasestorage.app";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  const name = req.nextUrl.searchParams.get("name") || "craft.craft";
  if (!raw) {
    return NextResponse.json({ detail: "Missing url." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ detail: "Invalid url." }, { status: 400 });
  }

  const allowed =
    target.protocol === "https:" &&
    target.host === STORAGE_HOST &&
    target.pathname.startsWith(`/${BUCKET}/marketplace/`) &&
    target.pathname.toLowerCase().endsWith(".craft");
  if (!allowed) {
    return NextResponse.json({ detail: "URL not allowed." }, { status: 400 });
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

  // Sanitize the suggested filename for the Content-Disposition header.
  const safe = name.replace(/[^A-Za-z0-9._-]/g, "_") || "craft.craft";
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${safe}"`,
      "cache-control": "private, no-store",
    },
  });
}
