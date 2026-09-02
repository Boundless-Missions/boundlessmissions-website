"use client";

/**
 * admin.ts — client-side types + fetch wrappers for the admin console.
 *
 * Everything goes through the same-origin BFF (/api/admin/...), which forwards
 * the httpOnly session to the bot. The bot gates in two tiers — the configured
 * BOT_OWNER_ID gets everything, holders of a guild's mapped bot-admin role get
 * the guild-scoped moderation surface, everyone else gets 404 — so nothing here
 * is a security boundary: `useAdminAccess` only decides which tabs are drawn.
 */
import { useEffect, useState } from "react";

import { appCheckHeader } from "./firebase";
import { jsonOrThrow, safeFetch } from "./api-error";
import { useSignedIn } from "./session";
import type { Listing } from "./marketplace";

async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
  return safeFetch(input, { ...init, headers, cache: "no-store" });
}

// ── Admin access detection ───────────────────────────────────────────────────

/** Who the console is for: the owner (unscoped) or a guild admin (scoped). */
export interface AdminAccess {
  is_owner: boolean;
  /** Guild ids this user holds the mapped admin role in; empty for the owner,
   *  whose authority is not per-guild. */
  admin_guild_ids: string[];
}

/**
 * One whoami round-trip per page load, shared by every mounted header. The
 * promise (not just the answer) is cached so the desktop header and the mobile
 * drawer mounting together don't race two requests.
 */
let accessProbe: Promise<AdminAccess | null> | null = null;

function probeAccess(): Promise<AdminAccess | null> {
  accessProbe ??= (async () => {
    try {
      const res = await authedFetch("/api/admin/whoami");
      if (!res.ok) return null;
      // An older bot build sends only {is_owner: true}; the defaults repair it.
      const data = (await res.json()) as Partial<AdminAccess>;
      return {
        is_owner: data.is_owner === true,
        admin_guild_ids: data.admin_guild_ids ?? [],
      };
    } catch {
      return null;
    }
  })();
  return accessProbe;
}

/** Forget the cached answer — call on logout so the tab vanishes immediately. */
export function resetAdminProbe(): void {
  accessProbe = null;
}

/** The cached whoami answer as a promise — for code outside a component. */
export function fetchAdminAccess(): Promise<AdminAccess | null> {
  return probeAccess();
}

/**
 * The signed-in user's console access, or null (not an admin / not yet known).
 * Null until known — the Admin tab appearing a beat late is fine; it appearing
 * for someone without access is not.
 */
export function useAdminAccess(): AdminAccess | null {
  const signedIn = useSignedIn();
  const [access, setAccess] = useState<AdminAccess | null>(null);

  useEffect(() => {
    if (signedIn !== true) {
      if (signedIn === false) resetAdminProbe();
      setAccess(null);
      return;
    }
    let cancelled = false;
    probeAccess().then((a) => {
      if (!cancelled) setAccess(a);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return access;
}

// ── Types (mirror the bot's /api/v1/web/admin responses) ─────────────────────

/**
 * The bot-wide fields (`users`, `mod_version`, `policy_version`,
 * `suspensions_active` and the two gate switches) are only served to the
 * owner; a guild admin's overview carries the guild list and the listing
 * counts for their guilds alone. Optional here so the tab renders for both.
 */
export interface AdminOverview {
  users?: number;
  listings_active: number;
  listings_delisted: number;
  guilds: { id: string; name: string; member_count: number }[];
  mod_version?: {
    latest_version?: string | null;
    latest_hash?: string | null;
    has_dll: boolean;
    updated_at?: string | null;
  };
  policy_version?: number;
  suspensions_active?: number;
  version_check_enabled?: boolean;
  device_binding_enabled?: boolean;
}

/**
 * A suspension currently in force. `until` is epoch *seconds* (the bot's own
 * unit) — multiply before handing it to Date. Absent/null means not suspended;
 * an expired one is never sent, since the bot resolves expiry on read.
 */
export interface AdminSuspension {
  reason: string;
  by: string;
  hours: number;
  until: number;
  until_iso: string;
  created_at: string;
}

export interface AdminUserRow {
  user_id: string;
  username: string;
  xp: number;
  level: number;
  balance: number;
  messages: number;
  rescues: number;
  joined_at: string;
  suspension: AdminSuspension | null;
  /** Unpaid contract fines, repaid out of a share of this user's later earnings. */
  debt: number;
  /** Who those fines are owed to. `creditor_id: ""` is a bot-issued mission. */
  debts: { creditor_id: string; amount: number }[];
}

export interface AdminChannel {
  id: string;
  name: string;
  category: string | null;
  locked: boolean;
}

export interface AdminRole {
  id: string;
  name: string;
  members: number;
}

export interface AdminGuild {
  id: string;
  name: string;
  member_count: number;
  channels: AdminChannel[];
  roles: AdminRole[];
}

export interface ModVersionConfig {
  latest_version?: string;
  latest_hash?: string;
  download_url?: string;
  has_dll?: boolean;
  updated_at?: string;
  updated_by?: string;
  versions?: Record<string, { hash: string; download_url: string; has_dll: boolean }>;
}

export interface AdminControlsState {
  version_check_enabled: boolean;
  device_binding_enabled: boolean;
  policy: Record<string, unknown>;
  policy_version: number;
  cost_guard_enabled: boolean;
  firebase_budget_usd: number;
  gemini_budget_usd: number;
}

// ── Costs ────────────────────────────────────────────────────────────────────

/** One priced component of the Firebase bill. `used` is everything measured;
 *  `billable` is what survives the daily free tier. For a small month the second
 *  is zero while the first is not, and showing only one of them is how the old
 *  estimator managed to report spend on a $0.00 bill. */
export interface CostLine {
  label: string;
  used: number;
  billable: number;
  usd: number;
  bytes: boolean;
  at_rest?: boolean;
}

export type CostLevel = "normal" | "warning" | "degraded" | "frozen";

export interface AdminCosts {
  enabled: boolean;
  month: string;
  level: CostLevel;
  thresholds: { warn: number; degrade: number };
  gemini: { usd: number; budget: number; ok: boolean; unlimited: boolean };
  firebase: {
    usd: number;
    budget: number;
    ok: boolean;
    unlimited: boolean;
    fraction: number;
    lines: CostLine[];
  };
  storage: {
    stored_bytes: number;
    stored_gb: number;
    free_gb: number;
    projected_month_usd: number;
  };
  /** Tier 1. `ok` false means these figures are the local estimate alone, which
   *  cannot see direct-download egress or bytes at rest — i.e. they read low. */
  metrics: {
    enabled: boolean;
    ok: boolean;
    error: string | null;
    fetched_at: number;
    authoritative: Record<string, number>;
    local: Record<string, number>;
    drift: Record<string, number>;
    signed_urls: number;
  };
  /** Tier 2 — the BigQuery billing export: actual charges net of free-tier
   *  credits. Hours behind, so it is shown beside the estimate and never drives
   *  the brake. `ok` false is normal for days after enabling the export. */
  billed: {
    enabled: boolean;
    ok: boolean;
    error: string | null;
    dataset: string;
    invoice_month?: string;
    currency?: string;
    total_usd?: number;
    gross_usd?: number;
    credits_usd?: number;
    services?: { service: string; gross: number; credits: number; net: number }[];
    table?: string | null;
    fetched_at?: number;
  };
  history: { month: string; firebase_usd: number; gemini_usd: number; closed_at?: string }[];
}

// ── Calls ────────────────────────────────────────────────────────────────────

export async function fetchOverview(): Promise<AdminOverview> {
  return jsonOrThrow(await authedFetch("/api/admin/overview"));
}

export async function fetchAdminListings(q: string): Promise<Listing[]> {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const data = await jsonOrThrow<{ listings: Listing[] }>(
    await authedFetch(`/api/admin/listings${qs}`),
  );
  return data.listings;
}

export async function editAdminListing(
  id: string,
  patch: { craft_name?: string; price?: number; seller_name?: string; status?: string },
): Promise<Listing> {
  const data = await jsonOrThrow<{ listing: Listing }>(
    await authedFetch(`/api/admin/listings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
  return data.listing;
}

export async function deleteAdminListing(id: string): Promise<void> {
  await jsonOrThrow(
    await authedFetch(`/api/admin/listings/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

export async function fetchAdminUsers(q: string): Promise<{ users: AdminUserRow[]; total: number }> {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return jsonOrThrow(await authedFetch(`/api/admin/users${qs}`));
}

export async function adjustAdminUser(
  id: string,
  body: {
    balance_delta?: number;
    balance_set?: number;
    xp_set?: number;
    /** Write off every unpaid fine — the escape hatch for one issued in error. */
    clear_debts?: boolean;
  },
): Promise<AdminUserRow> {
  const data = await jsonOrThrow<{ user: AdminUserRow }>(
    await authedFetch(`/api/admin/users/${encodeURIComponent(id)}/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return data.user;
}

export async function logoutAllAdminUser(id: string): Promise<void> {
  await jsonOrThrow(
    await authedFetch(`/api/admin/users/${encodeURIComponent(id)}/logout_all`, { method: "POST" }),
  );
}

/**
 * Suspend an account from the mod and the website for `hours`. Not a Discord
 * ban and not a wipe — see the bot's data/suspensions.py. Returns what is now in
 * force, plus whether the player could actually be DMed about it.
 */
export async function suspendAdminUser(
  id: string,
  body: { hours: number; reason: string; notify: boolean },
): Promise<{ suspension: AdminSuspension; notified: boolean }> {
  return jsonOrThrow(
    await authedFetch(`/api/admin/users/${encodeURIComponent(id)}/suspend`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/** Lift a suspension early. `lifted: false` means it had already run out. */
export async function unsuspendAdminUser(
  id: string,
  notify = true,
): Promise<{ lifted: boolean; notified: boolean }> {
  return jsonOrThrow(
    await authedFetch(
      `/api/admin/users/${encodeURIComponent(id)}/suspend?notify=${notify}`,
      { method: "DELETE" },
    ),
  );
}

export async function deleteAdminUser(id: string): Promise<void> {
  await jsonOrThrow(
    await authedFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

export async function sendAdminDm(body: {
  user_id: string;
  title: string;
  content: string;
}): Promise<void> {
  await jsonOrThrow(
    await authedFetch("/api/admin/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function sendAdminAnnounce(body: {
  guild_id: string;
  channel_id?: string;
  role_id?: string;
  title: string;
  content: string;
  open_tickets: boolean;
}): Promise<{ mode: string; targets?: number }> {
  return jsonOrThrow(
    await authedFetch("/api/admin/announce", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function fetchAdminGuilds(): Promise<AdminGuild[]> {
  const data = await jsonOrThrow<{ guilds: AdminGuild[] }>(await authedFetch("/api/admin/guilds"));
  return data.guilds;
}

export async function setChannelLock(
  channelId: string,
  body: { guild_id: string; locked: boolean; reason?: string },
): Promise<void> {
  await jsonOrThrow(
    await authedFetch(`/api/admin/channels/${encodeURIComponent(channelId)}/lock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function fetchModVersion(): Promise<ModVersionConfig> {
  const data = await jsonOrThrow<{ config: ModVersionConfig }>(
    await authedFetch("/api/admin/modversion"),
  );
  return data.config;
}

export async function publishModVersion(form: FormData): Promise<ModVersionConfig> {
  const data = await jsonOrThrow<{ config: ModVersionConfig }>(
    await authedFetch("/api/admin/modversion/publish", { method: "POST", body: form }),
  );
  return data.config;
}

export async function fetchAdminControls(): Promise<AdminControlsState> {
  return jsonOrThrow(await authedFetch("/api/admin/controls"));
}

export async function setAdminControls(body: {
  version_check_enabled?: boolean;
  device_binding_enabled?: boolean;
  cost_guard_enabled?: boolean;
  firebase_budget_usd?: number;
  gemini_budget_usd?: number;
}): Promise<AdminControlsState> {
  return jsonOrThrow(
    await authedFetch("/api/admin/controls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/**
 * Fill in whatever the bot didn't send.
 *
 * The costs payload gained sections over time (metrics, then billed), and a bot
 * running an older build simply omits the newer ones — which is the normal state
 * for the minutes around a deploy, and was enough to crash the whole tab on
 * `data.billed.ok`. A console that reports on the bot must not be the thing that
 * breaks when the bot is mid-upgrade, so the shape is repaired once here rather
 * than guarded at every read site.
 *
 * A section that is absent is reported as such, which is a different statement
 * from a section that came back saying it has no data.
 */
function normalizeCosts(raw: Partial<AdminCosts> | null | undefined): AdminCosts {
  const d = raw ?? {};
  const stale = "This bot build doesn't report it yet. Restart the bot to pick up the new version.";
  return {
    enabled: d.enabled ?? false,
    month: d.month ?? "",
    level: d.level ?? "normal",
    thresholds: { warn: 0.5, degrade: 0.8, ...(d.thresholds ?? {}) },
    gemini: { usd: 0, budget: 0, ok: true, unlimited: true, ...(d.gemini ?? {}) },
    firebase: {
      usd: 0,
      budget: 0,
      ok: true,
      unlimited: true,
      fraction: 0,
      ...(d.firebase ?? {}),
      // An older bot sent these as positional tuples rather than objects, which
      // wouldn't throw but would render a table of blank rows — worse than
      // showing nothing, because it looks like real data. Only well-formed lines
      // get through.
      lines: (d.firebase?.lines ?? []).filter(
        (l): l is CostLine => typeof l === "object" && l !== null && typeof l.label === "string",
      ),
    },
    storage: {
      stored_bytes: 0,
      stored_gb: 0,
      free_gb: 0,
      projected_month_usd: 0,
      ...(d.storage ?? {}),
    },
    metrics: {
      enabled: false,
      ok: false,
      error: d.metrics ? null : stale,
      fetched_at: 0,
      authoritative: {},
      local: {},
      drift: {},
      signed_urls: 0,
      ...(d.metrics ?? {}),
    },
    billed: {
      enabled: false,
      ok: false,
      error: d.billed ? null : stale,
      dataset: "",
      ...(d.billed ?? {}),
    },
    history: d.history ?? [],
  };
}

export async function fetchAdminCosts(): Promise<AdminCosts> {
  return normalizeCosts(await jsonOrThrow(await authedFetch("/api/admin/costs")));
}

/** Re-poll Cloud Monitoring and the billing export now, clearing a remembered
 *  permission failure first — the button to press after granting IAM roles. */
export async function refreshAdminCosts(): Promise<AdminCosts> {
  return normalizeCosts(
    await jsonOrThrow(await authedFetch("/api/admin/costs/refresh", { method: "POST" })),
  );
}

export async function bumpPolicy(body: {
  summary?: string;
  privacy_url?: string;
  terms_url?: string;
}): Promise<void> {
  await jsonOrThrow(
    await authedFetch("/api/admin/policy/bump", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

// ── Craft bans ───────────────────────────────────────────────────────────────
//
// Owner-only. A craft ban is keyed on a hash of the craft rather than on a
// listing or a person, so it survives the file being re-uploaded — see the bot's
// data/craft_bans.py for what each of the three fingerprints does and does not
// survive.

export type CraftBanKind = "exact" | "design" | "parts";

export interface CraftBan {
  hash: string;
  kind: CraftBanKind;
  /** Shown verbatim to the player whose upload is refused. */
  reason: string;
  /** Internal; never leaves the console. */
  note: string;
  /** What the craft was called when it was banned. */
  label: string;
  listing_id: string;
  by: string;
  created_at: string;
  active: boolean;
  revoked_at: string | null;
  revoked_by: string | null;
  /** How many uploads this ban has actually refused — whether it still earns its
   *  place in the list. */
  hits: number;
  last_hit_at: string | null;
}

/** One of the three hashes a craft can be banned by, and what it would take
 *  down right now. Read before issuing a ban, never after. */
export interface CraftBanCandidate {
  kind: CraftBanKind;
  hash: string;
  matches: number;
  match_names: string[];
  already_banned: boolean;
}

export interface CraftBanPreview {
  listing_id: string;
  craft_name: string;
  seller_name: string;
  kinds: CraftBanCandidate[];
  part_count: number;
  distinct_parts: number;
}

export async function fetchCraftBans(): Promise<CraftBan[]> {
  const data = await jsonOrThrow<{ bans: CraftBan[] }>(await authedFetch("/api/admin/craftbans"));
  return data.bans ?? [];
}

/** Fingerprint a listing's craft without banning anything. */
export async function previewCraftBan(listingId: string): Promise<CraftBanPreview> {
  return jsonOrThrow(
    await authedFetch(`/api/admin/craftbans/preview?listing_id=${encodeURIComponent(listingId)}`),
  );
}

/**
 * Ban a craft. Give either `listing_id` (the craft is fetched and fingerprinted
 * on the bot) or a bare `hash`. `sweep` decides what happens to listings already
 * up that match — "delist" keeps the files and every buyer's re-download.
 */
export async function addCraftBan(body: {
  hash?: string;
  listing_id?: string;
  kind: CraftBanKind;
  reason: string;
  note?: string;
  label?: string;
  sweep?: "delist" | "delete" | "none";
}): Promise<{ ban: CraftBan; matched: number; delisted: string[]; deleted: string[] }> {
  return jsonOrThrow(
    await authedFetch("/api/admin/craftbans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/** Lift a ban. Listings it took down are not put back up — the seller relists. */
export async function revokeCraftBan(hash: string): Promise<void> {
  await jsonOrThrow(
    await authedFetch(`/api/admin/craftbans/${encodeURIComponent(hash)}`, { method: "DELETE" }),
  );
}

/** Fingerprint listings uploaded before fingerprinting existed. One Storage
 *  download per listing, so it is capped and reports what is left. */
export async function backfillCraftHashes(
  limit = 100,
): Promise<{ updated: number; failed: number; remaining: number }> {
  return jsonOrThrow(
    await authedFetch(`/api/admin/craftbans/backfill?limit=${limit}`, { method: "POST" }),
  );
}
