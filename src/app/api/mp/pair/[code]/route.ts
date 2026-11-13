import { NextRequest, NextResponse } from "next/server";
import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pairing a freshly installed server (data/mp_pairing.py in the bot). GET shows
 * which machine is asking for this code; POST confirms it under the caller's
 * account. Who may pair is decided by the bot (the Servers page's own gate).
 */
const CODE = /^[0-9A-Za-z]{4}-?[0-9A-Za-z]{4}$/;

function badCode() {
  return NextResponse.json({ detail: "That code is not valid." }, { status: 404 });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!CODE.test(code)) return badCode();
  return proxy(`/api/v1/web/mp/pair/${encodeURIComponent(code)}`);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const denied = await guard(req);
  if (denied) return denied;
  const { code } = await ctx.params;
  if (!CODE.test(code)) return badCode();
  const body = await req.json().catch(() => ({}));
  return proxy(`/api/v1/web/mp/pair/${encodeURIComponent(code)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: String(body?.name ?? "").slice(0, 64) }),
  });
}
