import { NextRequest } from "next/server";
import { proxy } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The parameters `web_marketplace_listings` actually reads (api_server.py). Every
 * other key is dropped rather than forwarded.
 *
 * This is a cache-key defence, not an input filter — the bot validates its own
 * types and FastAPI simply ignores anything it does not declare. The problem is
 * upstream of that: the response is CDN-cached (`s-maxage=60`) keyed on the full
 * URL, so a pass-through query string means `?page=1&z=1`, `?page=1&z=2`, … are
 * unlimited distinct keys that all miss, and each miss costs a function
 * invocation plus `mkt.list_active`'s full scan of every ACTIVE listing. Reducing
 * the query to a known set collapses that back onto one entry per real filter
 * combination.
 */
const ALLOWED = new Set([
  "page", "sort", "price_min", "price_max", "craft_type",
  "parts_max", "mass_max", "mods", "mod_mode", "q",
]);

/** `mods` is repeatable (FastAPI `Query(default=[])`); everything else is scalar. */
const REPEATABLE = new Set(["mods"]);

/** A filter value long enough to be a cache-busting payload rather than a filter. */
const MAX_VALUE_LENGTH = 120;
/**
 * Enough for a real mod selection (the facet list is the only repeatable key and
 * has nowhere near this many entries), and low enough that the query cannot be
 * padded into a large cache key. Set generously because going over truncates,
 * which would quietly narrow a genuine filter — a CKAN import on an RO/RP-1
 * install selects well over a hundred mods. It bounds `mods` only; the scalar
 * keys are emitted first and are never dropped.
 */
const MAX_PARAMS = 250;

/**
 * Keys whose value is a number, and the bucket each is rounded onto.
 *
 * Dropping unknown keys bounds the *size* of a cache key but not the *number* of
 * them, which is what actually costs money: every distinct canonical query is a
 * CDN miss, one SSR invocation and one `mkt.list_active` scan. `?price_min=1`,
 * `?price_min=2`, … are all "known" keys and all distinct, so the busting loop
 * survived canonicalization untouched.
 *
 * Rounding collapses that. A price filter is a coarse instrument — nobody
 * meaningfully distinguishes 10 000 from 10 001 coins — so snapping to a bucket
 * loses nothing a user asked for while turning an unbounded axis into a few dozen
 * values. `page` is clamped instead of rounded, since page 3 must stay page 3.
 */
const NUMERIC_BUCKET: Record<string, number> = {
  price_min: 500,
  price_max: 500,
  parts_max: 25,
  mass_max: 5,
};

/** Beyond this there is no catalog left to page through; the bot returns empty. */
const MAX_PAGE = 200;

/** Free text, normalized so trivial variants share one entry. */
const MAX_QUERY_LENGTH = 48;

/**
 * Closed vocabularies, and the reason they are here.
 *
 * The numeric bucketing above bounds the NUMBER of distinct cache keys on the four
 * numeric axes, which was the whole point of it — and then `sort`, `craft_type` and
 * `mod_mode` fell straight through `normalizeValue`'s `return raw`. Each is an
 * `ALLOWED` key, so `?sort=<120 arbitrary characters>` produced a *canonical* query,
 * and the number of those is unbounded. That is the same cache-busting lever, on the
 * one route with no auth and no App Check, whose only other brakes are the CDN (which
 * this defeats) and a per-IP limiter that does nothing while API_TRUSTED_PROXIES is
 * empty.
 *
 * All three are closed sets in the UI and on the server, and an unrecognised value
 * already falls back to the default server-side — so dropping it changes no behaviour
 * for any real caller while collapsing the axis to its real cardinality. Kept in step
 * with `lib/marketplace.ts` SORTS and the two filter controls in
 * `app/marketplace/page.tsx`; a value added there and forgotten here degrades to the
 * default rather than breaking, which is the safe direction.
 */
const ENUM_VALUES: Record<string, Set<string>> = {
  sort: new Set(["recommended", "new", "likes", "price_asc", "price_desc", "sales"]),
  craft_type: new Set(["VAB", "SPH"]),
  mod_mode: new Set(["required", "allowed", "restricted"]),
};

function normalizeValue(key: string, raw: string): string | null {
  if (key === "page") {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0) return null;
    return String(Math.min(n, MAX_PAGE));
  }
  const bucket = NUMERIC_BUCKET[key];
  if (bucket !== undefined) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    // Round AWAY from the centre so a bucket never excludes something the raw
    // filter would have included: a minimum rounds down, a maximum rounds up.
    const snapped = key.endsWith("_min")
      ? Math.floor(n / bucket) * bucket
      : Math.ceil(n / bucket) * bucket;
    return String(snapped);
  }
  if (key === "q") {
    // Case and surrounding space are not part of the question being asked, and
    // the bot's search is already case-insensitive.
    const t = raw.trim().toLowerCase().slice(0, MAX_QUERY_LENGTH);
    return t || null;
  }
  const vocab = ENUM_VALUES[key];
  if (vocab) return vocab.has(raw) ? raw : null;
  // `mods` is the only key left, and it is bounded by MAX_PARAMS below. Anything
  // else is not in ALLOWED and never reaches here.
  return raw;
}

function canonicalQuery(src: URLSearchParams): string {
  const out: [string, string][] = [];
  // Scalar keys FIRST, and never subject to the cap. `mods` is the only repeatable
  // key and the mod filter has a CKAN-file import that selects every mod in the
  // player's install — well over a hundred on an RO/RP-1 setup. Iterating ALLOWED
  // in order put `mods` ahead of `mod_mode` and `q`, so a big selection consumed
  // the budget and silently dropped them: `mod_mode` then defaulted to "required"
  // server-side, turning "show me crafts I can load" into "craft must include all
  // 100+ of these mods" — an empty grid, no error, and a different question
  // answered than the one asked. A dropped `q` returns the whole catalog instead
  // of a search. Truncating the mod list narrows a filter; dropping these two
  // inverts it, so they are the ones that must survive.
  for (const key of ALLOWED) {
    if (REPEATABLE.has(key)) continue;
    const v = src.get(key);
    if (v === null || v.length > MAX_VALUE_LENGTH) continue;
    const norm = normalizeValue(key, v);
    if (norm !== null) out.push([key, norm]);
  }
  for (const key of ALLOWED) {
    if (!REPEATABLE.has(key)) continue;
    for (const v of src.getAll(key)) {
      if (v.length > MAX_VALUE_LENGTH) continue;
      out.push([key, v]);
      if (out.length >= MAX_PARAMS) break;
    }
    if (out.length >= MAX_PARAMS) break;
  }
  // Sorted by key (and by value within a repeated key) so that reorderings of the
  // same filter — which the grid does produce, checkbox order is click order —
  // land on one cache entry instead of one per permutation.
  out.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  const qs = new URLSearchParams(out).toString();
  return qs ? `?${qs}` : "";
}

export async function GET(req: NextRequest) {
  // Public endpoint — no auth required to browse the catalog.
  const qs = canonicalQuery(req.nextUrl.searchParams);
  // Public catalog, identical for every visitor: let the Firebase CDN serve
  // repeated reads (incl. floods) instead of hitting the function + bot each time.
  // Cached per full URL, so each filter/sort/page combo caches separately — which
  // is why the query above is canonicalized first. Short TTL keeps it fresh;
  // stale-while-revalidate hides the refresh latency.
  return proxy(
    `/api/v1/web/marketplace/listings${qs}`,
    {},
    false,
    "public, s-maxage=60, stale-while-revalidate=300",
  );
}
