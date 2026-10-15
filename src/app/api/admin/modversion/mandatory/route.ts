import { guard, proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Thin pipe: whether a version may be forced, and whether the label exists at all,
// are both decided by the bot (`admin_modversion_mandatory`, owner-only, 404 on an
// unknown label). A rule enforced in two places is a rule that drifts.
export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  return proxy("/api/v1/web/admin/modversion/mandatory", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
  });
}
