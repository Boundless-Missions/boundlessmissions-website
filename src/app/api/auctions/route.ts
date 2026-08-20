import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Never cached: is_yours / is_leading are per-user, and the lowest bid moves.
// Read-only on purpose: auctions are opened from inside KSP, so there is no POST.
export async function GET() {
  return proxy("/api/v1/web/auctions");
}
