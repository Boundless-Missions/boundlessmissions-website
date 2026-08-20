import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return proxy("/api/v1/web/admin/costs/refresh", { method: "POST" });
}
