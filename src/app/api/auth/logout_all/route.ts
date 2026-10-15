import { guard, signOut } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Same App Check reasoning as the plain sign-out next door, and more of it: this
  // route ends the account's KSP sessions as well, so a cross-site POST that reached
  // it would unlink the victim's game installs, not merely sign them out of a tab.
  const denied = await guard(req);
  if (denied) return denied;

  // Everything: this browser, any other browser, and every linked KSP client. The
  // account keeps its data — this revokes sessions, it deletes nothing — but the
  // game asks for a fresh link code afterwards, which is the whole point of asking
  // for it explicitly rather than doing it on every sign-out.
  return signOut("/api/v1/auth/logout_all");
}
