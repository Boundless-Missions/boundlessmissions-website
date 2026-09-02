import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.text();
  return proxy(`/api/v1/web/admin/users/${encodeURIComponent(id)}/adjust`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}
