import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return proxy("/api/v1/web/admin/testers");
}

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  return proxy("/api/v1/web/admin/testers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: String(body?.username ?? ""),
      note: String(body?.note ?? ""),
    }),
  });
}
