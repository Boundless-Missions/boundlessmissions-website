import { NextRequest } from "next/server";
import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Pass the grid's filter/sort/pagination query straight through to the bot.
  // Public endpoint — no auth required to browse the catalog.
  const qs = req.nextUrl.search; // includes leading "?"
  // Public catalog, identical for every visitor: let the Firebase CDN serve
  // repeated reads (incl. floods) instead of hitting the function + bot each time.
  // Cached per full URL, so each filter/sort/page combo caches separately. Short
  // TTL keeps it fresh; stale-while-revalidate hides the refresh latency.
  return proxy(
    `/api/v1/web/marketplace/listings${qs}`,
    {},
    false,
    "public, s-maxage=60, stale-while-revalidate=300",
  );
}
