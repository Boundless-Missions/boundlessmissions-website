import { NextRequest } from "next/server";
import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Turn down every pending incoming friend request at once.
 *
 * Its own route rather than another word in `[id]/[action]`: that one addresses a
 * pair and needs two path segments, and this addresses the whole inbox. It is the
 * counterpart of the bot's `MAX_INCOMING` cap — a full inbox refuses every *new*
 * request, including the wanted ones, so filling it is the attack, and clearing it
 * one decline at a time is a hundred round trips against a rate limiter. Without
 * this route a website-only account had no way out at all, since the bot's
 * `/api/v1/web/friends/decline_all` was unreachable from a browser.
 *
 * No body, but `guard` still runs first: App Check is the cheapest refusal
 * available and this is a bulk mutation.
 */
export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  return proxy("/api/v1/web/friends/decline_all", { method: "POST" });
}
