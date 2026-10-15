import { guard, signOut } from "@/lib/server-api";

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

  // Actually revoke, don't just stop sending the cookie. Clearing it alone left
  // the token valid for its full 30 days, so anything that had captured a
  // `__session` kept working no matter how many times the account's owner signed
  // out.
  //
  // WEB-ONLY revocation. This used to call `logout_all`, which bumps the account's
  // single global token version — so signing out of a browser also 401'd every KSP
  // install the account had. Each install only found out at its next launch, which
  // made one sign-out here read as the mod unlinking itself at random for days
  // afterwards. `logout_web` bumps a counter only web-audience tokens check: every
  // browser session for this account ends, the game keeps playing.
  //
  // Ending the game sessions too is still one button away — /api/auth/logout_all,
  // offered on the account page as "Log out everywhere".
  return signOut("/api/v1/auth/logout_web");
}
