"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, SlidersHorizontal, Rocket, ChevronLeft, ChevronRight, X } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ListingCard } from "@/components/marketplace/listing-card";
import { ConfirmPurchaseDialog } from "@/components/marketplace/confirm-purchase-dialog";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import {
  fetchListings,
  fetchProfile,
  buyListing,
  reportListing,
  formatCoins,
  parseCkanIdentifiers,
  matchMods,
  SORTS,
  SORT_HINTS,
  MOD_MODES,
  VOTE_NONE,
  type ModMode,
  type ListingsPage,
  type ListingFilters,
  type Profile,
  type Listing,
} from "@/lib/marketplace";
import { useListingVotes } from "@/lib/use-listing-votes";
import { cn } from "@/lib/utils";

// "Recommended" is the landing sort: the grid's job is to surface craft worth
// buying, and newest-first only does that while the marketplace is small.
const EMPTY: ListingFilters = { page: 1, sort: "recommended", mods: [], mod_mode: "required" };

export default function MarketplacePage() {
  const [filters, setFilters] = useState<ListingFilters>(EMPTY);
  const [data, setData] = useState<ListingsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Listing | null>(null);
  const [bought, setBought] = useState<Record<string, string | null>>({});
  const [reporting, setReporting] = useState<Listing | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter draft (text/number inputs) committed via debounce.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  const load = useCallback(async (f: ListingFilters) => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchListings(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced reload whenever filters change.
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => load(filters), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  function patch(p: Partial<ListingFilters>, resetPage = true) {
    setFilters((f) => ({ ...f, ...p, ...(resetPage ? { page: 1 } : {}) }));
  }

  function toggleMod(mod: string) {
    setFilters((f) => {
      const has = (f.mods ?? []).includes(mod);
      const mods = has ? (f.mods ?? []).filter((m) => m !== mod) : [...(f.mods ?? []), mod];
      return { ...f, mods, page: 1 };
    });
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const { myVotes, vote, votingId, withVotes } = useListingVotes(!!profile, showToast);

  // Voting on a craft you're selling is refused by the API, so the button says so
  // rather than failing when pressed. Being signed out is different: it stays
  // pressable and answers with the same "sign in" toast the Buy button gives,
  // because that is a thing the visitor can fix.
  function voteControls(l: Listing) {
    const own = profile?.user_id === l.seller_id;
    return {
      myVote: myVotes[l.listing_id] ?? VOTE_NONE,
      canVote: !own,
      hint: own ? "You can't vote on your own craft." : undefined,
      busy: votingId === l.listing_id,
      onVote: profile
        ? vote
        : () => showToast("Sign in to vote: head to your Account to link Discord."),
      onReport: own ? undefined : () => openReport(l),
    };
  }

  function openReport(l: Listing) {
    if (!profile) {
      showToast("Sign in to report a listing: head to your Account to link Discord.");
      return;
    }
    setReportError(null);
    setReporting(l);
  }

  async function submitReport(reason: string) {
    const l = reporting;
    if (!l) return;
    setReportBusy(true);
    setReportError(null);
    try {
      const r = await reportListing(l.listing_id, reason);
      setReporting(null);
      showToast(r.message || "Reported. The moderators have it.");
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Couldn't send that report.");
    } finally {
      setReportBusy(false);
    }
  }

  // Buy click → open the confirmation dialog (shows cost + balance before/after).
  // The actual purchase only fires from `confirmBuy` once the user confirms.
  function handleBuy(l: Listing) {
    if (!profile) {
      showToast("Sign in to buy: head to your Account to link Discord.");
      return;
    }
    setConfirming(l);
  }

  async function confirmBuy() {
    const l = confirming;
    if (!l) return;
    setBusyId(l.listing_id);
    try {
      const r = await buyListing(l.listing_id);
      if (!r.success) {
        showToast(r.message);
        return;
      }
      setProfile((p) => (p ? { ...p, balance: r.balance } : p));
      setBought((b) => ({ ...b, [l.listing_id]: r.craft_url ?? null }));
      showToast(r.already_owned ? "Re-downloaded (already owned)." : "Purchased and queued for KSP import!");
      setConfirming(null);
      load(filters); // refresh sale counts
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Purchase failed.");
    } finally {
      setBusyId(null);
    }
  }

  const availableMods = data?.available_mods ?? [];
  const activeFilterCount =
    (filters.mods?.length ?? 0) +
    (filters.craft_type ? 1 : 0) +
    (filters.price_min != null ? 1 : 0) +
    (filters.price_max != null ? 1 : 0) +
    (filters.parts_max != null ? 1 : 0) +
    (filters.mass_max != null ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {/* Wider than the site `container` (1200px) so the grid fits more craft per row. */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Craft Marketplace</h1>
            <p className="text-muted-foreground">
              Buy community-built craft with KCoins, delivered straight into your KSP save.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {profile ? (
              <Badge variant="secondary" className="h-9 px-3 text-sm">
                {formatCoins(profile.balance)} KCoins
              </Badge>
            ) : (
              <Button asChild variant="outline">
                <Link href="/account">Sign in</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filters */}
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters({ ...EMPTY })}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            <FilterField label="Search">
              <input
                value={filters.q ?? ""}
                onChange={(e) => patch({ q: e.target.value || undefined })}
                placeholder="Craft or seller name"
                className="filter-input"
              />
            </FilterField>

            <FilterField label="Sort">
              <select
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value }, false)}
                className="filter-input"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {filters.sort && SORT_HINTS[filters.sort] && (
                <p className="text-xs text-muted-foreground">{SORT_HINTS[filters.sort]}</p>
              )}
            </FilterField>

            <FilterField label="Editor">
              <div className="flex gap-2">
                {["", "VAB", "SPH"].map((t) => (
                  <button
                    key={t || "all"}
                    onClick={() => patch({ craft_type: t || undefined })}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                      (filters.craft_type ?? "") === t
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t || "All"}
                  </button>
                ))}
              </div>
            </FilterField>

            <FilterField label="Price (KCoins)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={filters.price_min ?? ""}
                  onChange={(e) => patch({ price_min: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Min"
                  className="filter-input"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number"
                  min={0}
                  value={filters.price_max ?? ""}
                  onChange={(e) => patch({ price_max: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Max"
                  className="filter-input"
                />
              </div>
            </FilterField>

            <FilterField label="Max parts">
              <input
                type="number"
                min={0}
                value={filters.parts_max ?? ""}
                onChange={(e) => patch({ parts_max: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Any"
                className="filter-input"
              />
            </FilterField>

            <FilterField label="Max mass (t)">
              <input
                type="number"
                min={0}
                value={filters.mass_max ?? ""}
                onChange={(e) => patch({ mass_max: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Any"
                className="filter-input"
              />
            </FilterField>

            {availableMods.length > 0 && (
              <ModFilter
                available={availableMods}
                selected={filters.mods ?? []}
                mode={filters.mod_mode ?? "required"}
                onToggle={toggleMod}
                onSetMany={(mods) => setFilters((f) => ({ ...f, mods, page: 1 }))}
                onSetMode={(mode) => patch({ mod_mode: mode })}
              />
            )}
          </aside>

          {/* Grid */}
          <section>
            {toast && (
              <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
                {toast}
              </div>
            )}

            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : loading && !data ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : data && data.listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
                <Rocket className="h-10 w-10 opacity-40" />
                <p>No craft match your filters.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{data?.total ?? 0} craft</span>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {data?.listings.map(withVotes).map((l) => (
                    <ListingCard
                      key={l.listing_id}
                      listing={l}
                      votes={voteControls(l)}
                      onBuy={handleBuy}
                      busy={busyId === l.listing_id}
                      downloadUrl={bought[l.listing_id]}
                    />
                  ))}
                </div>

                {data && data.pages > 1 && (
                  <>
                    <Separator className="my-6" />
                    <Pagination
                      page={data.page}
                      pages={data.pages}
                      onChange={(p) => patch({ page: p }, false)}
                    />
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      {reporting && (
        <ReportDialog
          listing={reporting}
          busy={reportBusy}
          error={reportError}
          onSubmit={submitReport}
          onClose={() => !reportBusy && setReporting(null)}
        />
      )}
      {confirming && profile && (
        <ConfirmPurchaseDialog
          listing={confirming}
          balance={profile.balance}
          busy={busyId === confirming.listing_id}
          onConfirm={confirmBuy}
          onCancel={() => setConfirming(null)}
        />
      )}
      <SiteFooter />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ModFilter({
  available,
  selected,
  mode,
  onToggle,
  onSetMany,
  onSetMode,
}: {
  available: string[];
  selected: string[];
  mode: ModMode;
  onToggle: (mod: string) => void;
  onSetMany: (mods: string[]) => void;
  onSetMode: (mode: ModMode) => void;
}) {
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => available.filter((m) => m.toLowerCase().includes(search.toLowerCase())),
    [available, search],
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!f) return;
    try {
      const matched = matchMods(parseCkanIdentifiers(await f.text()), available);
      if (matched.length === 0) {
        setMsg("No mods from that file are used by any listing.");
        return;
      }
      onSetMany(Array.from(new Set([...selected, ...matched])));
      setMsg(`Selected ${matched.length} mod${matched.length > 1 ? "s" : ""} from your CKAN file.`);
    } catch {
      setMsg("Couldn't read that file.");
    }
  }

  return (
    <FilterField label="Mods">
      <div className="space-y-2">
        <div className="flex gap-1">
          {MOD_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              title={m.hint}
              onClick={() => onSetMode(m.value)}
              className={cn(
                "flex-1 rounded-md border px-1 py-1.5 text-xs transition-colors",
                mode === m.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {MOD_MODES.find((m) => m.value === mode)?.hint}
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mods"
          className="filter-input"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".ckan,application/json"
            onChange={onFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Select from CKAN file
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onSetMany([]);
                setMsg(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear ({selected.length})
            </button>
          )}
        </div>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">No mods match.</p>
          ) : (
            filtered.map((m) => {
              const on = selected.includes(m);
              return (
                <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggle(m)}
                    className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                  />
                  <span className={on ? "text-foreground" : "text-muted-foreground"}>{m}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </FilterField>
  );
}

function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  const nums = useMemo(() => {
    const out: number[] = [];
    const from = Math.max(1, page - 2);
    const to = Math.min(pages, from + 4);
    for (let i = from; i <= to; i++) out.push(i);
    return out;
  }, [page, pages]);

  return (
    <div className="flex items-center justify-center gap-1">
      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft />
      </Button>
      {nums[0] > 1 && <span className="px-1 text-muted-foreground">…</span>}
      {nums.map((n) => (
        <Button
          key={n}
          variant={n === page ? "default" : "outline"}
          size="icon"
          onClick={() => onChange(n)}
        >
          {n}
        </Button>
      ))}
      {nums[nums.length - 1] < pages && <span className="px-1 text-muted-foreground">…</span>}
      <Button
        variant="outline"
        size="icon"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
