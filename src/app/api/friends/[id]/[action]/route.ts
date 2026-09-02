import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * accept / decline / remove for one friendship.
 *
 * The action is allow-listed rather than passed through: this path segment reaches
 * the bot inside a URL, and forwarding an arbitrary one would let a crafted link
 * address endpoints this route was never meant to open.
 */
const ACTIONS = new Set(["accept", "decline", "remove"]);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!ACTIONS.has(action)) {
    return new Response(JSON.stringify({ detail: "Unknown action." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  return proxy(`/api/v1/web/friends/${encodeURIComponent(id)}/${action}`, { method: "POST" });
}
