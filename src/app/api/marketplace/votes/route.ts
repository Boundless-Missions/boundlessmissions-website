import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-user, so never cached — unlike the listings grid this sits next to.
export async function GET() {
  return proxy(`/api/v1/web/marketplace/votes`);
}
