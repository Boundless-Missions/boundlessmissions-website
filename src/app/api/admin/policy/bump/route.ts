import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.text();
  return proxy("/api/v1/web/admin/policy/bump", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}
