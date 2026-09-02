import { NextRequest } from "next/server";
import { forwardLink, guard, MAX_JSON_BYTES } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // No session required: this route MINTS one, so demanding a session here
  // would lock out sign-in itself. App Check and the size cap still apply.
  const denied = await guard(req, MAX_JSON_BYTES, { session: false });
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  return forwardLink("/api/v1/web/auth/link", { code: String(body?.code ?? "") });
}
