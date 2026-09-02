import { NextRequest } from "next/server";
import { forwardLink, guard, MAX_JSON_BYTES } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Swap a Firebase ID token for a Boundless Missions session.
 *
 * `forwardLink` is reused rather than reimplemented: it already strips the token
 * out of the bot's reply and into the httpOnly cookie, which is the one thing that
 * must not be got wrong here — the session token must never reach browser JS.
 */
export async function POST(req: NextRequest) {
  // No session required: this route MINTS one, so demanding a session here
  // would lock out sign-in itself. App Check and the size cap still apply.
  const denied = await guard(req, MAX_JSON_BYTES, { session: false });
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  return forwardLink("/api/v1/web/auth/signin", {
    id_token: String(body?.id_token ?? ""),
  });
}
