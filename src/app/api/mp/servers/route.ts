import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The caller's own game servers, each with its admin agent's live state. */
export async function GET() {
  return proxy("/api/v1/web/mp/servers");
}
