import { NextResponse } from "next/server";
import { botFetch, clearSessionCookie, guard } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // App Check, like every other mutating route — and here it is the only gate
  // there is. The handler clears the cookie whatever the bot says, and SameSite
  // governs *sending* a cookie, not setting one, so a cross-site
  // `<form action=".../api/auth/logout" method="POST">` on any page the victim
  // visits would otherwise sign them out on demand. The header cannot be
  // supplied cross-origin (the preflight fails; no route emits CORS headers),
  // which is what makes this the fix rather than a speed bump.
  const denied = await guard(req);
  if (denied) return denied;

  // Actually revoke the session, don't just stop sending it. Clearing the cookie
  // alone left the token itself valid for its full 30 days, so anything that had
  // captured a `__session` kept working no matter how many times the owner of the
  // account signed out — and a user with no KSP install had no revoke surface at
  // all, since the mod is the only other place that offers one.
  //
  // `logout_all` bumps the account's token version, so this signs the account out
  // of every device including a linked KSP client. That is the deliberate
  // trade-off: "sign out" that leaves a stolen token live is not a sign-out, and
  // re-linking the game is a smaller cost than a month of unrevocable access.
  //
  // Failure is tolerated on purpose. The cookie must clear even when the bot is
  // down, or a user who wants out of a shared browser is told "try again later"
  // and left signed in — the worse of the two failures by a distance.
  try {
    await botFetch("/api/v1/auth/logout_all", { method: "POST" });
  } catch (e) {
    console.error("[bff] logout_all failed; clearing the cookie regardless:", e);
  }

  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
