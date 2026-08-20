import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Never cached: this is per-user and changes the moment either party acts.
export async function GET() {
  return proxy("/api/v1/web/contracts");
}
