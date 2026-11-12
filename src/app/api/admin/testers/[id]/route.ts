import { NextResponse } from "next/server";
import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Account ids are Discord snowflakes or `a_…` website ids; nothing else may
// reach a bot URL from this segment.
const ACCOUNT_ID = /^(?:\d{5,25}|a_[A-Za-z0-9_-]{4,64})$/;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ACCOUNT_ID.test(id)) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  return proxy(`/api/v1/web/admin/testers/${id}`, { method: "DELETE" });
}
