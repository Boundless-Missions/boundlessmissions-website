import { guard, proxy } from "@/lib/server-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Carries the re-authentication token through to the bot: enabling a second
// factor needs proof of the primary credential, not just a live session.
export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.text();
  return proxy("/api/v1/web/account/2fa/begin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}
