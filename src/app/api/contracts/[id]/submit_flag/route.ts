import { NextRequest } from "next/server";
import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Matches the bot's `_FLAG_MAX_BYTES`. Checked before the body is buffered
// — see `guard`.
const MAX_FLAG_BYTES = 8 * 1024 * 1024;

/**
 * Forward the uploaded flag untouched.
 *
 * Same shape as the avatar proxy: the multipart body is passed straight through
 * rather than parsed and rebuilt, because the bot enforces the type, size and
 * decode checks and re-encoding here would only add a second place for them to
 * disagree. `content-type` must be forwarded verbatim — it carries the boundary.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard(req, MAX_FLAG_BYTES);
  if (denied) return denied;
  const { id } = await params;
  const contentType = req.headers.get("content-type") ?? "";
  const body = await req.arrayBuffer();
  return proxy(`/api/v1/web/contracts/${encodeURIComponent(id)}/submit_flag`, {
    method: "POST",
    headers: contentType ? { "content-type": contentType } : {},
    body,
  });
}
