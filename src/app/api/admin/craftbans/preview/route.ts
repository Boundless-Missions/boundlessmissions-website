import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A static segment alongside [hash]: Next matches static first, so /preview
// never resolves as a ban hash.
export async function GET(req: Request) {
  const { search } = new URL(req.url);
  return proxy(`/api/v1/web/admin/craftbans/preview${search}`);
}
