import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard(req);
  if (denied) return denied;
  const { id } = await params;
  // The body ({amount}) is forwarded as-is; the bot enforces the undercut rule
  // against the freshest lowest bid, so there is nothing to check twice here.
  return proxy(`/api/v1/web/auctions/${encodeURIComponent(id)}/bid`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
  });
}
