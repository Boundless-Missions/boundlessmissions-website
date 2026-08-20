import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Multipart passthrough: re-send the browser's FormData so undici writes a fresh
// multipart boundary (forwarding the raw body would keep a boundary header we
// no longer control). Content-type is deliberately NOT set by hand.
export async function POST(req: Request) {
  const form = await req.formData();
  return proxy("/api/v1/web/admin/modversion/publish", {
    method: "POST",
    body: form,
  });
}
