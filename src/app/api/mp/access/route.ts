import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 200 for the owner, guild admins and testers; 404 for everyone else. */
export async function GET() {
  return proxy("/api/v1/web/mp/access");
}
