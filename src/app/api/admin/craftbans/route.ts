import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return proxy("/api/v1/web/admin/craftbans");
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxy("/api/v1/web/admin/craftbans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}
