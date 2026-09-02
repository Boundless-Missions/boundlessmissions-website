import { NextRequest } from "next/server";
import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Matches the bot's `_AVATAR_MAX_BYTES`. Checked before the body is buffered
// — see `guard`.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * Forward the uploaded image untouched.
 *
 * The multipart body is passed straight through rather than parsed and rebuilt:
 * the bot enforces the type and size limits, and re-encoding here would only add
 * a second place for them to disagree. `content-type` must be forwarded verbatim
 * because it carries the multipart boundary.
 */
export async function POST(req: NextRequest) {
  const denied = await guard(req, MAX_AVATAR_BYTES);
  if (denied) return denied;
  const contentType = req.headers.get("content-type") ?? "";
  const body = await req.arrayBuffer();
  return proxy("/api/v1/web/account/avatar", {
    method: "POST",
    headers: contentType ? { "content-type": contentType } : {},
    body,
  });
}
