import { NextRequest } from "next/server";
import { forwardLink, guard, MAX_JSON_BYTES } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Finish a sign-in that stopped for a second factor.
 *
 * `forwardLink` again, for the same reason the sign-in route uses it: it strips
 * the token out of the reply and into the httpOnly cookie, so it never reaches
 * browser JS.
 */
export async function POST(req: NextRequest) {
  // No session required: this route MINTS one, so demanding a session here
  // would lock out sign-in itself. App Check and the size cap still apply.
  const denied = await guard(req, MAX_JSON_BYTES, { session: false });
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  return forwardLink("/api/v1/web/auth/totp", {
    challenge_id: String(body?.challenge_id ?? ""),
    code: String(body?.code ?? ""),
  });
}
