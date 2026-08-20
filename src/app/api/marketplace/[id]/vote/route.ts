import { NextRequest } from "next/server";
import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The body ({vote}) is forwarded as-is; the bot validates it (and refuses a
  // vote on your own craft), so there is nothing to check twice here.
  return proxy(`/api/v1/web/marketplace/${encodeURIComponent(id)}/vote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
  });
}
