import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { search } = new URL(req.url);
  return proxy(`/api/v1/web/admin/craftbans/backfill${search}`, { method: "POST" });
}
