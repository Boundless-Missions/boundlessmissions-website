import { NextRequest } from "next/server";
import { forwardLink } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return forwardLink("/api/v1/web/auth/link/poll", {
    challenge_id: String(body?.challenge_id ?? ""),
  });
}
