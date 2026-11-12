import { NextRequest, NextResponse } from "next/server";
import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remote admin of one of the caller's game servers (ksp-mp-remote-host-admin.md).
 *
 * A thin pipe: who may issue what, the opt-in on the host, step-up for a stop and
 * the rate limits are all decided by the bot, and the command is signed there —
 * nothing this handler forwards can widen what the host agent will run.
 *
 * The body allowance is a modset's (256 KiB on the host) plus framing, well over
 * the 64 KiB default, and still checked before anything is buffered.
 */
const MODSET_BODY_BYTES = 320 * 1024;
const SERVER_ID = /^srv_[0-9a-f]{16}$/;

function badId() {
  return NextResponse.json({ detail: "Not found." }, { status: 404 });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!SERVER_ID.test(id)) return badId();
  return proxy(`/api/v1/web/mp/servers/${id}/commands`);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard(req, MODSET_BODY_BYTES);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!SERVER_ID.test(id)) return badId();
  const body = await req.json().catch(() => ({}));
  return proxy(`/api/v1/web/mp/servers/${id}/commands`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cmd: String(body?.cmd ?? ""),
      args: body?.args && typeof body.args === "object" ? body.args : {},
      totp_code: String(body?.totp_code ?? ""),
    }),
  });
}
