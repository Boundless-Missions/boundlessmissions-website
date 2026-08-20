/**
 * auctions.ts — client-side types + fetch wrappers for the auctions page.
 *
 * Same shape as contracts.ts: every call hits a same-origin Route Handler, which
 * attaches the httpOnly session cookie as a Bearer token. The bot session token
 * never reaches client JS.
 *
 * These are the same auctions Discord runs — one shared document per auction, so
 * a bid placed here and a press of the Discord "Bid Lower" button are the same
 * write, and the channel embeds are re-rendered by the bot on every bid. Only
 * OPEN auctions are served: a closed auction becomes a contract, which the
 * Contracts tab shows.
 */
import { appCheckHeader } from "./firebase";
import { notifySessionChanged } from "./session";
import { jsonOrThrow, safeFetch } from "./api-error";

export interface Auction {
  auction_id: string;
  mission: string;
  issuer_name: string;
  start_value: number;
  /** The lowest bid so far; equals start_value until someone bids. */
  current_bid: number;
  current_bidder_name?: string | null;
  bid_count: number;
  /** A new bid must undercut current_bid by at least this much. */
  min_decrement: number;
  fine: number;
  due_date: string;
  /** Naive-UTC ISO instant; may move later while open (anti-snipe). */
  ends_at: string;
  created_at?: string | null;
  /** craft_build / active_vessel / flag_design, or null when untyped. */
  mission_type?: string | null;
  modlist?: string | null;
  /** You issued this auction (can end it, cannot bid on it). */
  is_yours: boolean;
  /** Your bid is the current lowest. */
  is_leading: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

/** What the winner has to deliver — the same set the Discord command offers. */
export const WORK_LABELS: Record<string, string> = {
  craft_build: "Craft build — submit a blueprint from the VAB/SPH",
  active_vessel: "Active mission — fly a craft to the target",
  flag_design: "Flag design — submitted and reviewed in Discord",
};

async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
  const res = await safeFetch(input, { ...init, headers });
  // The BFF refreshes or clears the session hint on every authed call, so nudge
  // the header to re-read it rather than making it wait for the next navigation.
  notifySessionChanged();
  return res;
}

/** Null when not signed in, so the page can render the link prompt instead of an error. */
export async function fetchAuctions(): Promise<Auction[] | null> {
  const res = await authedFetch("/api/auctions", { cache: "no-store" });
  if (res.status === 401) return null;
  const data = await jsonOrThrow<{ auctions: Auction[] }>(res);
  return data.auctions;
}

/**
 * A refused action is not an exception: the bot answers a business refusal ("bid
 * must be at most …") with 200 and `success: false`, and that sentence is meant
 * to be shown. Only 4xx/5xx throw.
 */
async function post(path: string, body?: unknown): Promise<ActionResult> {
  const res = await authedFetch(
    path,
    body === undefined
      ? { method: "POST" }
      : {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  return jsonOrThrow<ActionResult>(res);
}

export const bidOnAuction = (id: string, amount: number) =>
  post(`/api/auctions/${encodeURIComponent(id)}/bid`, { amount });
export const endAuction = (id: string) =>
  post(`/api/auctions/${encodeURIComponent(id)}/end`);

// ── Display helpers ──────────────────────────────────────────────────────────

/**
 * Parse the bot's naive-UTC isoformat ("2026-08-20T12:34:56.789012") as UTC.
 * The fractional part is trimmed because JS Date only promises milliseconds.
 */
export function parseUtc(iso: string): Date {
  return new Date(iso.replace(/\.\d+/, "") + "Z");
}

/** "in 2d 4h" / "in 12m" / "ending now" — the countdown shown on each card. */
export function endsIn(iso: string, now: Date = new Date()): string {
  const ms = parseUtc(iso).getTime() - now.getTime();
  if (Number.isNaN(ms)) return iso;
  if (ms <= 0) return "ending now";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `in ${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  return `in ${Math.floor(h / 24)}d ${h % 24}h`;
}
