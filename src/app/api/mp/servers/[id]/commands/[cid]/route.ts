import { NextRequest, NextResponse } from "next/server";
import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVER_ID = /^srv_[0-9a-f]{16}$/;
const COMMAND_ID = /^hc_[0-9a-f]{20}$/;

/** One command's outcome, with its full result while the bot still holds it. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await ctx.params;
  if (!SERVER_ID.test(id) || !COMMAND_ID.test(cid)) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }
  return proxy(`/api/v1/web/mp/servers/${id}/commands/${cid}`);
}
