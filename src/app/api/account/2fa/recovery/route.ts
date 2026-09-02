import { NextRequest } from "next/server";
import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  return proxy("/api/v1/web/account/2fa/recovery", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: String(body?.code ?? "") }),
  });
}
