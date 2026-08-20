/**
 * marketplace.ts — client-side types + fetch wrappers for the marketplace UI.
 *
 * All calls hit same-origin Next.js Route Handlers (the BFF), never the bot
 * directly. The session lives in an httpOnly cookie the browser can't read, so
 * "am I signed in?" is answered by whether GET /api/profile succeeds.
 */
import { appCheckHeader } from "./firebase";
import { notifySessionChanged } from "./session";
import { jsonOrThrow, safeFetch } from "./api-error";

export interface Listing {
  listing_id: string;
  seller_id: string;
  seller_name: string;
  craft_name: string;
  craft_type: string;
  part_count: number;
  mass: number;
  cost: number;
  price: number;
  sales_count: number;
  created_at?: string | null;
  mods: string[];
  thumbnail_url?: string | null;
  blueprint_url?: string | null;
  craft_url?: string | null;
  craft_filename?: string | null;
  status: string;
  /** Life-support mod the craft is provisioned for: usi|tac|snacks|kerbalism|none. */
  life_support?: string;
  /** Days one kerbal survives on what's aboard (0 when unknown, e.g. a Kerbalism
   *  install whose profile rates couldn't be read). */
  ls_endurance_days?: number;
  /** Total seats, so the per-kerbal endurance can be turned into a range. */
  ls_crew_capacity?: number;
  /** The craft carries a Textures Unlimited paint job — it needs TU (and the recolour
   *  packs in `mods`) to look like its blueprint. Sent by the KSP client at list-time;
   *  older listings have it inferred from the mod row by the bot. */
  custom_textures?: boolean;
  /** Community vote tallies. Who voted is never sent — only your own vote comes
   *  back, from `fetchMyVotes`. */
  likes?: number;
  dislikes?: number;
}

/** A vote is the state you want, not a toggle — see the bot's VoteRequest. */
export const VOTE_UP = 1;
export const VOTE_DOWN = -1;
export const VOTE_NONE = 0;

const LS_NAMES: Record<string, string> = {
  usi: "USI-LS",
  tac: "TAC-LS",
  snacks: "Snacks",
  kerbalism: "Kerbalism",
};

/**
 * Human-readable life-support flag for a craft, or null when it carries none.
 *
 * Endurance is stored per kerbal, so the range reads "longest solo, shortest at a full
 * crew": "USI-LS · ~180 d solo · ~45 d for full crew of 4". Kept in step with
 * `life_support_label` in the bot's cogs/marketplace.py — the same listing is shown in
 * Discord and here, and the two should not disagree.
 */
export function lifeSupportLabel(l: Listing): string | null {
  const key = (l.life_support ?? "none").toLowerCase();
  const name = LS_NAMES[key];
  if (!name) return null;

  const days = l.ls_endurance_days ?? 0;
  const capacity = l.ls_crew_capacity ?? 0;
  if (days <= 0) return `${name} · endurance n/a`;
  if (capacity >= 2) {
    return `${name} · ~${Math.round(days)} d solo · ~${Math.round(days / capacity)} d for full crew of ${capacity}`;
  }
  return `${name} · ~${Math.round(days)} d / kerbal`;
}

/**
 * The Textures Unlimited tag, in one place so the card and the detail view can't
 * drift apart. The hint is the part that matters: TU is not a requirement to *use*
 * the craft — the mod drops paint-job modules the buyer's install can't accept, so it
 * arrives in stock colours rather than broken (see TextureTransfer's ReconcileCraftBody).
 */
export const CUSTOM_TEXTURES_LABEL = "Modded Textures Available";
export const CUSTOM_TEXTURES_HINT =
  "Painted with Textures Unlimited. Install TU and the recolour packs listed under Mods " +
  "to see it as pictured — without them the craft still loads, in stock colours.";

export interface ListingsPage {
  listings: Listing[];
  total: number;
  page: number;
  pages: number;
  available_mods: string[];
}

export interface Profile {
  user_id: string;
  username: string;
  guild_id: string;
  xp: number;
  level: number;
  balance: number;
  currency_name: string;
}

export interface BuyResult {
  success: boolean;
  message: string;
  balance: number;
  craft_url?: string | null;
  craft_filename?: string | null;
  already_owned: boolean;
}

export interface ListingFilters {
  page?: number;
  sort?: string;
  price_min?: number;
  price_max?: number;
  craft_type?: string;
  parts_max?: number;
  mass_max?: number;
  mods?: string[];
  mod_mode?: ModMode;
  q?: string;
}

export type ModMode = "required" | "allowed" | "restricted";
export const MOD_MODES: { value: ModMode; label: string; hint: string }[] = [
  { value: "required", label: "Required", hint: "Craft must include every selected mod" },
  { value: "allowed", label: "Allowed", hint: "Craft may only use the selected mods (nothing else)" },
  { value: "restricted", label: "Restricted", hint: "Craft must not use any of the selected mods" },
];

export const PAGE_SIZE = 25;
export const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "new", label: "Newest" },
  { value: "likes", label: "Most liked" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
  { value: "sales", label: "Best selling" },
] as const;

/** One line under the sort picker explaining what the less obvious modes do. */
export const SORT_HINTS: Record<string, string> = {
  recommended: "New craft (under 15 days) picking up likes fastest, then the best-liked rest.",
  likes: "Ranked by likes minus dislikes, all-time.",
};

function buildQuery(f: ListingFilters): string {
  const p = new URLSearchParams();
  if (f.page) p.set("page", String(f.page));
  if (f.sort) p.set("sort", f.sort);
  if (f.price_min != null) p.set("price_min", String(f.price_min));
  if (f.price_max != null) p.set("price_max", String(f.price_max));
  if (f.craft_type) p.set("craft_type", f.craft_type);
  if (f.parts_max != null) p.set("parts_max", String(f.parts_max));
  if (f.mass_max != null) p.set("mass_max", String(f.mass_max));
  if (f.q) p.set("q", f.q);
  for (const m of f.mods ?? []) p.append("mods", m);
  if (f.mods?.length && f.mod_mode && f.mod_mode !== "required") p.set("mod_mode", f.mod_mode);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * fetch + App Check header, for our app's private/abuse-sensitive endpoints.
 * The public listings grid uses plain `fetch` (it's CDN-cached and needs no token).
 */
async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
  const res = await safeFetch(input, { ...init, headers });
  // The BFF refreshes or clears the session hint on every authed call, so nudge the
  // header to re-read it rather than making it wait for the next navigation. A
  // re-read that finds no change costs nothing — the state is identical.
  notifySessionChanged();
  return res;
}

export async function fetchListings(f: ListingFilters): Promise<ListingsPage> {
  const res = await safeFetch(`/api/marketplace/listings${buildQuery(f)}`, { cache: "no-store" });
  return jsonOrThrow<ListingsPage>(res);
}

/** The current user's profile, or null when not signed in (401). */
export async function fetchProfile(): Promise<Profile | null> {
  const res = await authedFetch(`/api/profile`, { cache: "no-store" });
  if (res.status === 401) return null;
  return jsonOrThrow<Profile>(res);
}

export async function fetchMine(): Promise<Listing[]> {
  const res = await authedFetch(`/api/marketplace/mine`, { cache: "no-store" });
  const data = await jsonOrThrow<{ listings: Listing[] }>(res);
  return data.listings;
}

export async function fetchPurchases(): Promise<Listing[]> {
  const res = await authedFetch(`/api/marketplace/purchases`, { cache: "no-store" });
  const data = await jsonOrThrow<{ listings: Listing[] }>(res);
  return data.listings;
}

export async function buyListing(id: string): Promise<BuyResult> {
  const res = await authedFetch(`/api/marketplace/${encodeURIComponent(id)}/buy`, { method: "POST" });
  return jsonOrThrow<BuyResult>(res);
}

// ── Votes & reports ──────────────────────────────────────────────────────────
//
// Both are authed: an anonymous like is worth nothing, and an anonymous report
// costs a moderator a channel. The UI shows the tallies to everyone and asks for
// a sign-in only at the point of pressing a button.

export interface VoteResult {
  success: boolean;
  likes: number;
  dislikes: number;
  my_vote: number;
}

/** Every listing the signed-in user has voted on: {listing_id: 1 | -1}. Empty
 *  (not an error) when signed out, so a page can call it unconditionally. */
export async function fetchMyVotes(): Promise<Record<string, number>> {
  const res = await authedFetch(`/api/marketplace/votes`, { cache: "no-store" });
  if (res.status === 401) return {};
  const data = await jsonOrThrow<{ votes: Record<string, number> }>(res);
  return data.votes ?? {};
}

export async function voteListing(id: string, vote: number): Promise<VoteResult> {
  const res = await authedFetch(`/api/marketplace/${encodeURIComponent(id)}/vote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ vote }),
  });
  return jsonOrThrow<VoteResult>(res);
}

export async function reportListing(id: string, reason: string): Promise<{ message: string }> {
  const res = await authedFetch(`/api/marketplace/${encodeURIComponent(id)}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return jsonOrThrow<{ message: string }>(res);
}

export async function delistListing(id: string): Promise<void> {
  const res = await authedFetch(`/api/marketplace/${encodeURIComponent(id)}/delist`, { method: "POST" });
  await jsonOrThrow(res);
}

export async function relistListing(id: string): Promise<void> {
  const res = await authedFetch(`/api/marketplace/${encodeURIComponent(id)}/relist`, { method: "POST" });
  await jsonOrThrow(res);
}

export async function deleteListing(id: string): Promise<void> {
  const res = await authedFetch(`/api/marketplace/${encodeURIComponent(id)}/delete`, { method: "POST" });
  await jsonOrThrow(res);
}

export async function logout(): Promise<void> {
  await authedFetch(`/api/auth/logout`, { method: "POST" });
  notifySessionChanged();
}

// ── Auth (link-code flow) ────────────────────────────────────────────────────

export interface LinkResponse {
  status: "ok" | "approval_required" | "pending";
  username?: string;
  challenge_id?: string;
}

export async function startLink(code: string): Promise<LinkResponse> {
  const res = await authedFetch(`/api/auth/link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return jsonOrThrow<LinkResponse>(res);
}

export async function pollLink(challengeId: string): Promise<LinkResponse> {
  const res = await authedFetch(`/api/auth/link/poll`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challenge_id: challengeId }),
  });
  return jsonOrThrow<LinkResponse>(res);
}

export function formatCoins(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

/**
 * Same-origin href that forces a download of a craft file. The raw `craft_url`
 * points at public GCS (served as text/plain), which the browser renders inline;
 * routing through our proxy re-serves it as an attachment so it actually saves.
 */
export function craftDownloadHref(craftUrl: string, filename?: string | null): string {
  const p = new URLSearchParams({ url: craftUrl });
  if (filename) p.set("name", filename);
  return `/api/marketplace/download?${p.toString()}`;
}

// ── CKAN file → mod selection ────────────────────────────────────────────────

/**
 * Pull mod identifiers out of a CKAN file. Handles both a metapackage export
 * ("installed mods" — has a `depends` array of {name}) and a single .ckan
 * metadata file (has `identifier`).
 */
export function parseCkanIdentifiers(text: string): string[] {
  const out = new Set<string>();
  const add = (s: unknown) => {
    if (typeof s === "string" && s.trim()) out.add(s.trim());
  };
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    add(data.identifier);
    for (const key of ["depends", "recommends"]) {
      const arr = data[key];
      if (Array.isArray(arr)) {
        for (const d of arr) add(typeof d === "string" ? d : (d as { name?: string })?.name);
      }
    }
  } catch {
    // Not JSON / unreadable — return whatever we have (likely nothing).
  }
  return [...out];
}

/**
 * Match CKAN identifiers against the marketplace's mod facet (GameData folder
 * names). CKAN identifiers and folder names usually line up but differ in case
 * and punctuation, so compare on a normalized (alphanumeric-only) form.
 */
export function matchMods(identifiers: string[], available: string[]): string[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const ids = identifiers.map(norm).filter(Boolean);
  return available.filter((a) => {
    const an = norm(a);
    return ids.some((i) => i === an || i.includes(an) || an.includes(i));
  });
}
