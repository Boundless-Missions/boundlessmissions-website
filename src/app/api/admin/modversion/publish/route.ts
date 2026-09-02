import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Matches the bot's own ceiling on the DLL (`admin_publish_version`, 20 MB).
// Checked on content-length first because this route is owner-only and the
// multipart parse below happens before anything can say so — see `guard`.
const MAX_DLL_BYTES = 20 * 1024 * 1024;

// Multipart passthrough: re-send the browser's FormData so undici writes a fresh
// multipart boundary (forwarding the raw body would keep a boundary header we
// no longer control). Content-type is deliberately NOT set by hand.
export async function POST(req: Request) {
  const denied = await guard(req, MAX_DLL_BYTES);
  if (denied) return denied;
  const form = await req.formData();
  return proxy("/api/v1/web/admin/modversion/publish", {
    method: "POST",
    body: form,
  });
}
