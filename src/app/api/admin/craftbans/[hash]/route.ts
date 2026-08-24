import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return proxy(`/api/v1/web/admin/craftbans/${encodeURIComponent(hash)}`, { method: "DELETE" });
}
