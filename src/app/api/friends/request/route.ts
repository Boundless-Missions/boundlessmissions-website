import { NextRequest } from "next/server";
import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  // Both fields are forwarded as strings the bot decides between: a username is
  // what someone typed, a user_id is what a list already held. Neither is trusted
  // here — the bot resolves the name and refuses an id with no player behind it.
  return proxy("/api/v1/web/friends/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: String(body?.username ?? ""),
      user_id: String(body?.user_id ?? ""),
    }),
  });
}
