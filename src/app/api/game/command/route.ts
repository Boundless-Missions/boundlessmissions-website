import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Asks the caller's own running KSP to raise a window (currently only the submit
 * window). The command name is checked against an allow-list by the bot, not here —
 * this is a pipe, and putting the policy in two places is how they drift apart.
 */
export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.text();
  return proxy("/api/v1/web/game/command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}
