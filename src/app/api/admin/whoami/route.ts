import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 200 {is_owner, is_admin, admin_guild_ids} for the configured BOT_OWNER_ID and
// for holders of a guild's mapped bot-admin role; 404 for anyone else. The
// client uses this purely to decide whether (and how much of) the Admin tab to draw.
export async function GET() {
  return proxy("/api/v1/web/admin/whoami");
}
