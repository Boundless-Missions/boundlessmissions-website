import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Never cached: the full-res link is signed and short-lived, and which of the two
// images this returns changes the moment the issuer approves.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/v1/web/contracts/${encodeURIComponent(id)}/flag`);
}
