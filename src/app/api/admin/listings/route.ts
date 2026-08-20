import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { search } = new URL(req.url);
  return proxy(`/api/v1/web/admin/listings${search}`);
}
