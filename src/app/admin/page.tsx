"use client";

/**
 * /admin — the admin console.
 *
 * Two tiers, both re-checked server-side on every call: the BOT_OWNER_ID
 * account gets everything; holders of a guild's mapped bot-admin role (set via
 * /admin setrole) get the guild-scoped moderation tabs — overview, listings,
 * messaging (announce only), channels — with every list and action cut to the
 * guilds they admin. Anyone else gets 404 from every endpoint, so someone who
 * types the URL sees the same "not found" they'd get for a page that doesn't
 * exist. Which tabs are drawn here is presentation; the API is the gate.
 */
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Coins,
  Gauge,
  LayoutDashboard,
  Loader2,
  Lock,
  LockOpen,
  Megaphone,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  Timer,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  adjustAdminUser,
  bumpPolicy,
  deleteAdminListing,
  deleteAdminUser,
  editAdminListing,
  fetchAdminControls,
  fetchAdminCosts,
  fetchAdminGuilds,
  fetchAdminListings,
  fetchAdminAccess,
  fetchAdminUsers,
  fetchModVersion,
  fetchOverview,
  logoutAllAdminUser,
  publishModVersion,
  refreshAdminCosts,
  sendAdminAnnounce,
  sendAdminDm,
  setAdminControls,
  setChannelLock,
  suspendAdminUser,
  unsuspendAdminUser,
  type AdminAccess,
  type AdminControlsState,
  type AdminCosts,
  type AdminGuild,
  type AdminOverview,
  type AdminSuspension,
  type AdminUserRow,
  type ModVersionConfig,
} from "@/lib/admin";
import { formatCoins, formatScore, listingScore, type Listing } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

type Tab =
  | "overview"
  | "listings"
  | "users"
  | "messaging"
  | "channels"
  | "version"
  | "costs"
  | "controls";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "listings", label: "Listings", icon: <Package className="h-4 w-4" /> },
  { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { id: "messaging", label: "Messaging", icon: <Megaphone className="h-4 w-4" /> },
  { id: "channels", label: "Channels", icon: <Lock className="h-4 w-4" /> },
  { id: "version", label: "Mod Version", icon: <UploadCloud className="h-4 w-4" /> },
  { id: "costs", label: "Costs", icon: <Gauge className="h-4 w-4" /> },
  { id: "controls", label: "Controls", icon: <Settings2 className="h-4 w-4" /> },
];

// Bot-wide levers a guild role must never reach (mirrors the bot's get_owner).
const OWNER_ONLY_TABS: ReadonlySet<Tab> = new Set(["users", "version", "costs", "controls"]);

export default function AdminPage() {
  const [gate, setGate] = useState<"checking" | "denied" | "ok">("checking");
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  // Guild structure is shared by Messaging + Channels; fetched once on demand.
  const [guilds, setGuilds] = useState<AdminGuild[] | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const [a, o] = await Promise.all([fetchAdminAccess(), fetchOverview()]);
      if (!a) throw new Error("no access");
      setAccess(a);
      setOverview(o);
      setGate("ok");
    } catch {
      // 404 (not owner or admin), 401 (signed out) and a dead backend all land
      // here; the page deliberately doesn't distinguish — it simply isn't
      // available.
      setGate("denied");
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const loadGuilds = useCallback(async () => {
    setGuilds(await fetchAdminGuilds());
  }, []);

  useEffect(() => {
    if (gate === "ok" && (tab === "messaging" || tab === "channels") && guilds === null) {
      loadGuilds().catch(() => setGuilds([]));
    }
  }, [gate, tab, guilds, loadGuilds]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 py-8">
        {gate === "checking" && (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {gate === "denied" && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
            <ShieldAlert className="h-10 w-10 opacity-40" />
            <p>There&rsquo;s nothing here.</p>
          </div>
        )}

        {gate === "ok" && (
          <>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
                <p className="text-sm text-muted-foreground">
                  {access?.is_owner
                    ? "Developer master controls. Every action here is logged."
                    : "Community moderation, scoped to the servers you admin. Every action here is logged."}
                </p>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
              {TABS.filter((t) => access?.is_owner || !OWNER_ONLY_TABS.has(t.id)).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                    tab === t.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {tab === "overview" && <OverviewTab data={overview} onRefresh={loadOverview} />}
            {tab === "listings" && <ListingsTab />}
            {tab === "users" && <UsersTab />}
            {tab === "messaging" && <MessagingTab guilds={guilds} isOwner={access?.is_owner === true} />}
            {tab === "channels" && <ChannelsTab guilds={guilds} onRefresh={loadGuilds} />}
            {tab === "version" && <VersionTab />}
            {tab === "costs" && <CostsTab />}
            {tab === "controls" && <ControlsTab />}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function NoticeBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
      {message}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-muted-foreground">{children}</label>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ data, onRefresh }: { data: AdminOverview | null; onRefresh: () => void }) {
  if (!data) return <Spinner />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Linked players" value={String(data.users)} />
        <StatCard label="Active listings" value={String(data.listings_active)} />
        <StatCard label="Delisted listings" value={String(data.listings_delisted)} />
        <StatCard label="Policy version" value={`v${data.policy_version}`} />
        {/* Highlighted only when non-zero: a suspension is a state someone has to
            remember to review, and "0" in the same grey as every other tile is
            how it stops being noticed. */}
        <StatCard
          label="Suspended"
          value={String(data.suspensions_active)}
          alert={data.suspensions_active > 0}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="font-semibold">Mod distribution</h2>
          {/* Deliberately a div rather than a paragraph: Badge renders a div,
              and the HTML parser auto-closes an open paragraph the moment it
              meets one. That makes the server markup and the client tree
              disagree, which React reports as a hydration error rather than as
              the invalid nesting it actually is. */}
          <div className="text-sm text-muted-foreground">
            Latest published:{" "}
            <span className="font-medium text-foreground">
              {data.mod_version.latest_version ?? "none"}
            </span>
            {data.mod_version.latest_hash && (
              <span className="ml-2 font-mono text-xs">
                {data.mod_version.latest_hash.slice(0, 12)}…
              </span>
            )}
            {data.mod_version.has_dll ? (
              <Badge variant="secondary" className="ml-2">attestation on</Badge>
            ) : (
              <Badge variant="outline" className="ml-2">attestation off</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Version gate: <b>{data.version_check_enabled ? "enabled" : "disabled"}</b> · Device
            binding: <b>{data.device_binding_enabled ? "enabled" : "disabled"}</b>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 font-semibold">Servers</h2>
          <div className="space-y-2">
            {data.guilds.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-md border border-border px-4 py-2.5 text-sm">
                <span className="font-medium">{g.name}</span>
                <span className="text-muted-foreground">{g.member_count} members</span>
              </div>
            ))}
            {data.guilds.length === 0 && (
              <p className="text-sm text-muted-foreground">The bot is not connected yet.</p>
            )}
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
            Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <Card className={cn(alert && "border-destructive/50")}>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold tabular-nums", alert && "text-destructive")}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Listings ─────────────────────────────────────────────────────────────────

function ListingsTab() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null);

  const load = useCallback(async (query: string) => {
    setError(null);
    try {
      setItems(await fetchAdminListings(query));
    } catch (e) {
      setError(errMsg(e, "Failed to load listings."));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  async function toggleStatus(l: Listing) {
    setBusyId(l.listing_id);
    setError(null);
    try {
      const next = l.status === "active" ? "delisted" : "active";
      const updated = await editAdminListing(l.listing_id, { status: next });
      setItems((cur) => (cur ?? []).map((x) => (x.listing_id === l.listing_id ? updated : x)));
    } catch (e) {
      setError(errMsg(e, "Failed to change status."));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    const l = pendingDelete;
    if (!l) return;
    setBusyId(l.listing_id);
    try {
      await deleteAdminListing(l.listing_id);
      setItems((cur) => (cur ?? []).filter((x) => x.listing_id !== l.listing_id));
    } catch (e) {
      setError(errMsg(e, "Failed to delete listing."));
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by craft, seller or listing id"
          className="filter-input max-w-md"
        />
        <Button type="submit" variant="outline" size="sm">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No listings match.</p>
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <div
              key={l.listing_id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.craft_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.seller_name} · {l.part_count} parts · {l.sales_count} sold ·{" "}
                  {/* The split behind the rating, which only this console shows: it is
                      what says whether a buried craft was disliked by a crowd or by a
                      handful of people, and that is the reinstatement decision. */}
                  rating {formatScore(listingScore(l))} ({l.likes ?? 0}↑ {l.dislikes ?? 0}↓) ·{" "}
                  <span className="font-mono">{l.listing_id}</span>
                </p>
              </div>
              <Badge variant="secondary" className="gap-1 tabular-nums">
                <Coins className="h-3.5 w-3.5" /> {formatCoins(l.price)}
              </Badge>
              <Badge variant={l.status === "active" ? "secondary" : "outline"}>
                {l.auto_delisted ? "delisted (rating)" : l.status}
              </Badge>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setEditing(l)} disabled={busyId === l.listing_id}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleStatus(l)} disabled={busyId === l.listing_id}>
                  {l.status === "active" ? "Delist" : "Relist"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setPendingDelete(l)} disabled={busyId === l.listing_id}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ListingEditDialog
          listing={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((cur) => (cur ?? []).map((x) => (x.listing_id === updated.listing_id ? updated : x)));
            setEditing(null);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Permanently delete listing?"
          description={
            <>
              Delete <span className="font-medium text-foreground">&ldquo;{pendingDelete.craft_name}&rdquo;</span> by{" "}
              {pendingDelete.seller_name}? Its Discord posts and files are removed for good.
            </>
          }
          confirmLabel="Delete"
          destructive
          busy={busyId === pendingDelete.listing_id}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function ListingEditDialog({
  listing,
  onClose,
  onSaved,
}: {
  listing: Listing;
  onClose: () => void;
  onSaved: (l: Listing) => void;
}) {
  const [name, setName] = useState(listing.craft_name);
  const [price, setPrice] = useState(String(listing.price));
  const [seller, setSeller] = useState(listing.seller_name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const patch: Parameters<typeof editAdminListing>[1] = {};
      if (name.trim() && name.trim() !== listing.craft_name) patch.craft_name = name.trim();
      if (seller.trim() && seller.trim() !== listing.seller_name) patch.seller_name = seller.trim();
      const p = parseInt(price, 10);
      if (!Number.isNaN(p) && p !== listing.price) patch.price = p;
      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }
      onSaved(await editAdminListing(listing.listing_id, patch));
    } catch (e) {
      setError(errMsg(e, "Failed to save."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-semibold">Edit listing</h2>
        <ErrorBanner message={error} />
        <div className="space-y-3">
          <div>
            <FieldLabel>Craft name</FieldLabel>
            <input value={name} onChange={(e) => setName(e.target.value)} className="filter-input" />
          </div>
          <div>
            <FieldLabel>Price</FieldLabel>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              className="filter-input"
            />
          </div>
          <div>
            <FieldLabel>Seller display name</FieldLabel>
            <input value={seller} onChange={(e) => setSeller(e.target.value)} className="filter-input" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Users ────────────────────────────────────────────────────────────────────

function UsersTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [suspending, setSuspending] = useState<AdminUserRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);

  const load = useCallback(async (query: string) => {
    setError(null);
    try {
      const data = await fetchAdminUsers(query);
      setRows(data.users);
      setTotal(data.total);
    } catch (e) {
      setError(errMsg(e, "Failed to load users."));
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  async function logoutAll(u: AdminUserRow) {
    setBusyId(u.user_id);
    setError(null);
    setNotice(null);
    try {
      await logoutAllAdminUser(u.user_id);
      setNotice(`Revoked every session for ${u.username || u.user_id}.`);
    } catch (e) {
      setError(errMsg(e, "Failed to revoke sessions."));
    } finally {
      setBusyId(null);
    }
  }

  async function lift(u: AdminUserRow) {
    setBusyId(u.user_id);
    setError(null);
    setNotice(null);
    try {
      const res = await unsuspendAdminUser(u.user_id);
      setRows((cur) => (cur ?? []).map((x) => (x.user_id === u.user_id ? { ...x, suspension: null } : x)));
      setNotice(
        res.lifted
          ? `${u.username || u.user_id} can use the mod and site again` +
            (res.notified ? " and has been DMed." : " (couldn't DM them).")
          : "That suspension had already expired on its own.",
      );
    } catch (e) {
      setError(errMsg(e, "Failed to lift the suspension."));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    const u = pendingDelete;
    if (!u) return;
    setBusyId(u.user_id);
    try {
      await deleteAdminUser(u.user_id);
      setRows((cur) => (cur ?? []).filter((x) => x.user_id !== u.user_id));
      setNotice(`Deleted account ${u.username || u.user_id} and revoked its sessions.`);
    } catch (e) {
      setError(errMsg(e, "Failed to delete account."));
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <NoticeBanner message={notice} />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by Discord id or name"
          className="filter-input max-w-md"
        />
        <Button type="submit" variant="outline" size="sm">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No users match.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            Showing {rows.length} of {total}
          </p>
          <div className="space-y-2">
            {rows.map((u) => (
              <div
                key={u.user_id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3",
                  u.suspension ? "border-destructive/50" : "border-border",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.username || "(unknown name)"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{u.user_id}</p>
                </div>
                <span className="text-sm text-muted-foreground">Lv {u.level}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{u.xp} XP</span>
                <Badge variant="secondary" className="gap-1 tabular-nums">
                  <Coins className="h-3.5 w-3.5" /> {formatCoins(u.balance)}
                </Badge>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditing(u)} disabled={busyId === u.user_id}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => logoutAll(u)} disabled={busyId === u.user_id}>
                    Log out all
                  </Button>
                  {u.suspension ? (
                    <Button size="sm" variant="outline" onClick={() => lift(u)} disabled={busyId === u.user_id}>
                      Lift suspension
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setSuspending(u)} disabled={busyId === u.user_id}>
                      <Ban className="h-3.5 w-3.5" /> Suspend
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => setPendingDelete(u)} disabled={busyId === u.user_id}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* Full width under the row: the reason is the part a moderator
                    needs when deciding whether to lift it, and a badge would clip
                    it to nothing. */}
                {u.suspension && <SuspensionNote s={u.suspension} />}
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <UserEditDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((cur) => (cur ?? []).map((x) => (x.user_id === updated.user_id ? updated : x)));
            setEditing(null);
          }}
        />
      )}

      {suspending && (
        <SuspendDialog
          user={suspending}
          onClose={() => setSuspending(null)}
          onDone={(updated, message) => {
            setRows((cur) => (cur ?? []).map((x) => (x.user_id === updated.user_id ? updated : x)));
            setNotice(message);
            setSuspending(null);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this account?"
          description={
            <>
              Erase{" "}
              <span className="font-medium text-foreground">
                {pendingDelete.username || pendingDelete.user_id}
              </span>
              &rsquo;s XP, balance and unlocks, and revoke every session. This cannot be undone.
            </>
          }
          confirmLabel="Delete account"
          destructive
          busy={busyId === pendingDelete.user_id}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/** "3 days", "4 hours", "in 12 minutes" — whichever unit reads without maths. */
function humaniseDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 90) return `${s} second${s === 1 ? "" : "s"}`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} minute${m === 1 ? "" : "s"}`;
  const h = s / 3600;
  if (h < 48) return `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h)} hours`;
  const d = s / 86400;
  return `${d < 10 ? d.toFixed(1).replace(/\.0$/, "") : Math.round(d)} days`;
}

/**
 * What is in force, under the user row. The countdown is computed on render from
 * `until` rather than shown as the duration that was issued: a suspension the
 * console describes as "72 hours" three days after it started is telling the
 * moderator the one thing they didn't ask.
 */
function SuspensionNote({ s }: { s: AdminSuspension }) {
  const left = s.until * 1000 - Date.now();
  return (
    <div className="w-full rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-destructive">
        <Ban className="h-3.5 w-3.5" />
        Suspended from the mod and the website
        <span className="inline-flex items-center gap-1 font-normal text-muted-foreground">
          <Timer className="h-3 w-3" />
          {left > 0 ? `${humaniseDuration(left / 1000)} left` : "expiring now"} · ends{" "}
          {new Date(s.until * 1000).toLocaleString()}
        </span>
      </p>
      <p className="mt-1 text-muted-foreground">
        {s.reason || "(no reason recorded)"}
        {s.by && <span className="ml-1 opacity-70">— by {s.by}</span>}
      </p>
    </div>
  );
}

const DURATION_PRESETS: { label: string; hours: number }[] = [
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

/**
 * Issue a suspension. Both fields are required by the API, so both are required
 * here: a duration, because there is no permanent option (that is a Discord ban),
 * and a reason, because it is the text shown to the player at the gate — the
 * suspension has to explain itself without a moderator present.
 */
function SuspendDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onDone: (u: AdminUserRow, message: string) => void;
}) {
  const [hours, setHours] = useState("24");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(hours);
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 8760 && reason.trim().length > 0;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await suspendAdminUser(user.user_id, {
        hours: parsed,
        reason: reason.trim(),
        notify,
      });
      onDone(
        { ...user, suspension: res.suspension },
        `${user.username || user.user_id} is suspended for ${humaniseDuration(parsed * 3600)}` +
          (notify ? (res.notified ? " and has been DMed." : " — but the DM could not be delivered.") : "."),
      );
    } catch (e) {
      setError(errMsg(e, "Failed to suspend."));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-semibold">Suspend {user.username || user.user_id}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Blocks the KSP mod and this website until it expires. Their Discord membership,
          balance, XP, contracts and listings are untouched — for a permanent removal use a
          Discord ban instead.
        </p>
        <ErrorBanner message={error} />
        <div className="space-y-3">
          <div>
            <FieldLabel>Duration</FieldLabel>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((p) => (
                <Button
                  key={p.hours}
                  type="button"
                  size="sm"
                  variant={parsed === p.hours ? "default" : "outline"}
                  onClick={() => setHours(String(p.hours))}
                  disabled={busy}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                className="filter-input"
              />
              <span className="shrink-0 text-xs text-muted-foreground">hours (max 365 days)</span>
            </div>
          </div>
          <div>
            <FieldLabel>Reason (shown to the player)</FieldLabel>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="e.g. Repeated junk bug reports"
              className="filter-input resize-y"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{reason.length}/300</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5"
              disabled={busy}
            />
            <span>
              DM them from the bot
              <span className="block text-xs text-muted-foreground">
                Without this the only place the reason appears is inside the game.
              </span>
            </span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || !valid}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Suspend
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserEditDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSaved: (u: AdminUserRow) => void;
}) {
  const [balance, setBalance] = useState(String(user.balance));
  const [xp, setXp] = useState(String(user.xp));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body: { balance_set?: number; xp_set?: number } = {};
      const b = parseInt(balance, 10);
      const x = parseInt(xp, 10);
      if (!Number.isNaN(b) && b !== user.balance) body.balance_set = b;
      if (!Number.isNaN(x) && x !== user.xp) body.xp_set = x;
      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }
      onSaved(await adjustAdminUser(user.user_id, body));
    } catch (e) {
      setError(errMsg(e, "Failed to save."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-semibold">Edit {user.username || user.user_id}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Level is derived from XP and recomputes on its own.
        </p>
        <ErrorBanner message={error} />
        <div className="space-y-3">
          <div>
            <FieldLabel>Balance</FieldLabel>
            <input
              value={balance}
              onChange={(e) => setBalance(e.target.value.replace(/[^0-9-]/g, ""))}
              inputMode="numeric"
              className="filter-input"
            />
          </div>
          <div>
            <FieldLabel>Total XP</FieldLabel>
            <input
              value={xp}
              onChange={(e) => setXp(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              className="filter-input"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Messaging ────────────────────────────────────────────────────────────────

function MessagingTab({ guilds, isOwner }: { guilds: AdminGuild[] | null; isOwner: boolean }) {
  // DM-from-bot reaches any player globally, so it stays an owner lever; guild
  // admins get announcements alone (the server refuses the DM call anyway).
  return (
    <div className={cn("grid gap-6", isOwner && "lg:grid-cols-2")}>
      {isOwner && <DmCard />}
      <AnnounceCard guilds={guilds} />
    </div>
  );
}

function DmCard() {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendAdminDm({ user_id: userId.trim(), title: title.trim(), content: content.trim() });
      setNotice("Message delivered.");
      setContent("");
    } catch (e) {
      setError(errMsg(e, "Failed to send."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-1 font-semibold">Direct message a player</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Sent from the bot account as an official message.
        </p>
        <ErrorBanner message={error} />
        <NoticeBanner message={notice} />
        <div className="space-y-3">
          <div>
            <FieldLabel>Discord user id</FieldLabel>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 184356925786554368"
              className="filter-input font-mono"
            />
          </div>
          <div>
            <FieldLabel>Title (optional)</FieldLabel>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="filter-input" />
          </div>
          <div>
            <FieldLabel>Message</FieldLabel>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="filter-input h-auto resize-y"
            />
          </div>
          <Button onClick={send} disabled={busy || !userId.trim() || !content.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send DM
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnnounceCard({ guilds }: { guilds: AdminGuild[] | null }) {
  const [guildId, setGuildId] = useState("");
  const [mode, setMode] = useState<"channel" | "tickets">("channel");
  const [channelId, setChannelId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const guild = guilds?.find((g) => g.id === guildId) ?? null;
  const role = guild?.roles.find((r) => r.id === roleId) ?? null;
  const ready =
    !!guild &&
    !!content.trim() &&
    (mode === "channel" ? !!channelId : !!roleId);

  async function send() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await sendAdminAnnounce({
        guild_id: guildId,
        channel_id: mode === "channel" ? channelId : undefined,
        role_id: roleId || undefined,
        title: title.trim(),
        content: content.trim(),
        open_tickets: mode === "tickets",
      });
      setNotice(
        res.mode === "tickets"
          ? `Opening ${res.targets} tickets in the background. Discord rate limits make this take a while.`
          : "Announcement posted.",
      );
      setContent("");
    } catch (e) {
      setError(errMsg(e, "Failed to announce."));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (guilds === null) {
    return (
      <Card>
        <CardContent className="p-6">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-1 font-semibold">Announce</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Post to a channel, or open a private ticket for every member of a role.
        </p>
        <ErrorBanner message={error} />
        <NoticeBanner message={notice} />
        <div className="space-y-3">
          <div>
            <FieldLabel>Server</FieldLabel>
            <select
              value={guildId}
              onChange={(e) => {
                setGuildId(e.target.value);
                setChannelId("");
                setRoleId("");
              }}
              className="filter-input"
            >
              <option value="">Pick a server…</option>
              {guilds.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {(["channel", "tickets"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                  mode === m
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "channel" ? "Channel post" : "Ticket per member"}
              </button>
            ))}
          </div>

          {mode === "channel" && (
            <div>
              <FieldLabel>Channel</FieldLabel>
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="filter-input"
                disabled={!guild}
              >
                <option value="">Pick a channel…</option>
                {guild?.channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                    {c.category ? ` (${c.category})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <FieldLabel>{mode === "tickets" ? "Role (one ticket per member)" : "Ping role (optional)"}</FieldLabel>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="filter-input"
              disabled={!guild}
            >
              <option value="">{mode === "tickets" ? "Pick a role…" : "No ping"}</option>
              {guild?.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  @{r.name} ({r.members})
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Title (optional)</FieldLabel>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="filter-input" />
          </div>
          <div>
            <FieldLabel>Message</FieldLabel>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="filter-input h-auto resize-y"
            />
          </div>

          <Button
            onClick={() => (mode === "tickets" ? setConfirming(true) : send())}
            disabled={busy || !ready}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}{" "}
            {mode === "tickets" ? "Open tickets" : "Post announcement"}
          </Button>
        </div>
      </CardContent>

      {confirming && (
        <ConfirmDialog
          title="Open a ticket for every member?"
          description={
            <>
              This creates a private ticket channel for each of the{" "}
              <span className="font-medium text-foreground">{role?.members ?? "?"}</span> members of{" "}
              <span className="font-medium text-foreground">@{role?.name}</span> carrying your
              message. Discord rate limits mean a big role takes several minutes.
            </>
          }
          confirmLabel="Open tickets"
          busy={busy}
          onConfirm={send}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Card>
  );
}

// ── Channels ─────────────────────────────────────────────────────────────────

function ChannelsTab({ guilds, onRefresh }: { guilds: AdminGuild[] | null; onRefresh: () => Promise<void> }) {
  const [guildId, setGuildId] = useState("");
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guild = guilds?.find((g) => g.id === guildId) ?? guilds?.[0] ?? null;

  async function toggle(chId: string, locked: boolean) {
    if (!guild) return;
    setBusyId(chId);
    setError(null);
    try {
      await setChannelLock(chId, { guild_id: guild.id, locked, reason: reason.trim() });
      await onRefresh();
    } catch (e) {
      setError(errMsg(e, "Failed to change the lock."));
    } finally {
      setBusyId(null);
    }
  }

  if (guilds === null) return <Spinner />;
  if (guilds.length === 0)
    return <p className="py-12 text-center text-sm text-muted-foreground">The bot is not in any server.</p>;

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={guild?.id ?? ""}
          onChange={(e) => setGuildId(e.target.value)}
          className="filter-input max-w-xs"
        >
          {guilds.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Audit-log reason (optional)"
          className="filter-input max-w-sm"
        />
      </div>

      <div className="space-y-1.5">
        {guild?.channels.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">
              #{c.name}
              {c.category && <span className="ml-2 text-xs text-muted-foreground">{c.category}</span>}
            </span>
            {c.locked && (
              <Badge variant="outline" className="gap-1 text-destructive">
                <Lock className="h-3 w-3" /> locked
              </Badge>
            )}
            <Button
              size="sm"
              variant={c.locked ? "outline" : "destructive"}
              onClick={() => toggle(c.id, !c.locked)}
              disabled={busyId === c.id}
            >
              {busyId === c.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : c.locked ? (
                <>
                  <LockOpen className="h-3.5 w-3.5" /> Unlock
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" /> Lock
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mod version ──────────────────────────────────────────────────────────────

function VersionTab() {
  const [config, setConfig] = useState<ModVersionConfig | null>(null);
  const [version, setVersion] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [setLatest, setSetLatest] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchModVersion()
      .then(setConfig)
      .catch((e) => setError(errMsg(e, "Failed to load version info.")));
  }, []);

  async function publish() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.set("version", version.trim());
      form.set("download_url", downloadUrl.trim());
      form.set("set_latest", String(setLatest));
      if (file) form.set("dll", file, file.name);
      setConfig(await publishModVersion(form));
      setNotice(
        setLatest
          ? "Published. Every running KSP client has been poked to re-check its version."
          : "Published (not marked latest).",
      );
      setVersion("");
      setFile(null);
    } catch (e) {
      setError(errMsg(e, "Failed to publish."));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 font-semibold">Published versions</h2>
          <ErrorBanner message={error} />
          {config === null ? (
            <Spinner />
          ) : (
            <>
              <p className="mb-3 text-sm">
                Latest:{" "}
                <span className="font-medium">{config.latest_version ?? "none published"}</span>
                {config.latest_hash && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {config.latest_hash.slice(0, 16)}…
                  </span>
                )}
              </p>
              <div className="space-y-1.5">
                {Object.entries(config.versions ?? {}).map(([v, info]) => (
                  <div
                    key={v}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{v}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                      {info.hash.slice(0, 16)}…
                    </span>
                    {v === config.latest_version && <Badge variant="secondary">latest</Badge>}
                    {info.has_dll ? (
                      <Badge variant="outline">attestable</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">hash only</Badge>
                    )}
                  </div>
                ))}
                {Object.keys(config.versions ?? {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nothing published yet, so the update gate is inactive.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 font-semibold">Publish a version</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Upload GeneKerman.dll. The hash is computed server-side, and the pristine bytes
            enable anti-tamper attestation. Marking it latest pokes every running client to update.
          </p>
          <NoticeBanner message={notice} />
          <div className="space-y-3">
            <div>
              <FieldLabel>Version label</FieldLabel>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.4.2"
                className="filter-input"
              />
            </div>
            <div>
              <FieldLabel>GeneKerman.dll</FieldLabel>
              <input
                type="file"
                accept=".dll"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
              />
            </div>
            <div>
              <FieldLabel>Download URL shown to outdated clients (optional)</FieldLabel>
              <input
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://…"
                className="filter-input"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={setLatest}
                onChange={(e) => setSetLatest(e.target.checked)}
                className="h-4 w-4"
              />
              Mark as latest (activates the update gate for this build)
            </label>
            <Button onClick={() => setConfirming(true)} disabled={busy || !version.trim() || !file}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{" "}
              Publish
            </Button>
          </div>
        </CardContent>
      </Card>

      {confirming && (
        <ConfirmDialog
          title="Publish this build?"
          description={
            setLatest ? (
              <>
                Publishing <span className="font-medium text-foreground">{version.trim()}</span> as
                latest will make every out-of-date KSP client gate on &ldquo;update required&rdquo;
                the moment it next talks to the server.
              </>
            ) : (
              <>Register {version.trim()} without changing what clients are held to.</>
            )
          }
          confirmLabel="Publish"
          busy={busy}
          onConfirm={publish}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

// ── Costs ────────────────────────────────────────────────────────────────────

const LEVEL_UI: Record<string, { label: string; note: string; cls: string }> = {
  normal: {
    label: "Normal",
    note: "Everything running.",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    label: "Warning",
    note: "Past halfway. Nothing has changed for users.",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  degraded: {
    label: "Degraded",
    note: "New file uploads are refused. Reads, downloads and Firestore still work.",
    cls: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  frozen: {
    label: "Frozen",
    note: "Firestore and Storage are paused until the budget resets on the 1st (UTC).",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

function humanBytes(n: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return i === 0 ? `${v.toFixed(0)} B` : `${v.toFixed(1)} ${units[i]}`;
}

function usd(n: number): string {
  return `$${n.toFixed(4)}`;
}

function CostsTab() {
  const [data, setData] = useState<AdminCosts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchAdminCosts()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e, "Failed to load costs.")));
  }, []);

  useEffect(load, [load]);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      setData(await refreshAdminCosts());
    } catch (e) {
      setError(errMsg(e, "Failed to re-poll Cloud Monitoring."));
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <Spinner />;

  const level = data ? (LEVEL_UI[data.level] ?? LEVEL_UI.normal) : LEVEL_UI.normal;
  const pct = data && data.firebase.budget > 0 ? data.firebase.fraction * 100 : 0;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={`Firebase (${data.month})`} value={usd(data.firebase.usd)} />
            <StatCard
              label="Firebase budget"
              value={data.firebase.unlimited ? "unlimited" : `$${data.firebase.budget.toFixed(2)}`}
            />
            <StatCard label="Gemini" value={usd(data.gemini.usd)} />
            <StatCard label="Stored" value={humanBytes(data.storage.stored_bytes)} />
          </div>

          {/* The ladder, and where on it we are. */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Spending brake</h2>
                  <p className="text-xs text-muted-foreground">
                    warn at {(data.thresholds.warn * 100).toFixed(0)}% · uploads paused at{" "}
                    {(data.thresholds.degrade * 100).toFixed(0)}% · frozen at 100%
                  </p>
                </div>
                <span
                  className={cn("rounded-full border px-3 py-1 text-xs font-semibold", level.cls)}
                >
                  {level.label}
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    data.level === "frozen"
                      ? "bg-destructive"
                      : data.level === "degraded"
                        ? "bg-orange-500"
                        : data.level === "warning"
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                  )}
                  style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{level.note}</p>
              {!data.enabled && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ The cost guard is switched off, so nothing will be stopped at any level.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Where the numbers come from. An estimate that cannot see
              direct-download egress reads low, and saying so is the difference
              between a figure and a guess presented as one. */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Source of these figures</h2>
                  <p className="text-xs text-muted-foreground">
                    {data.metrics.ok
                      ? "Google's own measurements, corrected by the local meter since the last poll."
                      : "Local estimate only."}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", busy && "animate-spin")} />
                  Re-poll now
                </Button>
              </div>

              {data.metrics.ok ? (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Last read{" "}
                    {data.metrics.fetched_at
                      ? new Date(data.metrics.fetched_at * 1000).toLocaleString()
                      : "never"}
                    .
                  </p>
                  {data.metrics.drift.egress_bytes > 0 && (
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">
                        {humanBytes(data.metrics.drift.egress_bytes)}
                      </strong>{" "}
                      of egress the bot cannot meter itself (
                      {data.metrics.signed_urls.toLocaleString()} direct-download links issued this
                      month). This is the blind spot Cloud Monitoring exists to close, not an error.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="font-medium">Running on the in-process estimate alone.</p>
                  <p className="mt-1 text-muted-foreground">
                    {data.metrics.enabled
                      ? "Direct-download egress and bytes at rest are invisible without Cloud Monitoring, so everything below reads low."
                      : "Cloud Monitoring polling is switched off in settings."}
                  </p>
                  {data.metrics.error && (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-xs">
                      {data.metrics.error}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line items. `used` vs `billable` is the point: for a small month the
              free tier eats everything and the bill really is zero. */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 font-semibold">Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Component</th>
                      <th className="pb-2 text-right font-medium">Used</th>
                      <th className="pb-2 text-right font-medium">Billable</th>
                      <th className="pb-2 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.firebase.lines.map((line) => {
                      const fmt = (v: number) =>
                        line.bytes ? humanBytes(v) : Math.round(v).toLocaleString();
                      return (
                        <tr key={line.label} className="border-b border-border/50 last:border-0">
                          <td className="py-2">
                            {line.label}
                            {line.at_rest && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (prorated; no brake can stop this one)
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-right tabular-nums">{fmt(line.used)}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">
                            {line.billable === 0 && line.used > 0 ? "free tier" : fmt(line.billable)}
                          </td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {usd(line.usd)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {data.storage.stored_bytes > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {humanBytes(data.storage.stored_bytes)} stored across <em>all</em> buckets in the
                  project, including soft-deleted objects, which are billed until their retention
                  lapses. That is against a {data.storage.free_gb} GB free tier, and implies{" "}
                  <strong className="text-foreground">{usd(data.storage.projected_month_usd)}</strong>{" "}
                  for a full month at this size. Storage at rest only ever grows, so a bucket
                  lifecycle rule is the fix rather than a spending cap.
                </p>
              )}
            </CardContent>
          </Card>


          {/* Tier 2: the invoice. Shown beside our estimate, never folded into
              it — the estimate is what the brake acts on, and the gap between
              the two is the error in our own price constants. */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <div>
                <h2 className="font-semibold">Actually billed</h2>
                <p className="text-xs text-muted-foreground">
                  From the BigQuery billing export: real charges, net of free-tier credits.
                  Hours behind, so it never drives the brake.
                </p>
              </div>

              {data.billed.ok ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums">
                      {(data.billed.total_usd ?? 0).toFixed(4)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {data.billed.currency ?? "USD"} · invoice month {data.billed.invoice_month}
                    </span>
                  </div>
                  {(data.billed.credits_usd ?? 0) !== 0 && (
                    <p className="text-xs text-muted-foreground">
                      {(data.billed.gross_usd ?? 0).toFixed(4)} gross,{" "}
                      {Math.abs(data.billed.credits_usd ?? 0).toFixed(4)} covered by credits
                      (the free tier arrives as credits, which is why this is the real invoice
                      rather than a model of one).
                    </p>
                  )}
                  {(data.billed.services ?? []).filter((x) => Math.abs(x.net) >= 0.0001).length >
                  0 ? (
                    <div className="space-y-1 text-sm">
                      {(data.billed.services ?? [])
                        .filter((x) => Math.abs(x.net) >= 0.0001)
                        .map((x) => (
                          <div
                            key={x.service}
                            className="flex justify-between border-b border-border/50 py-1 last:border-0"
                          >
                            <span className="text-muted-foreground">{x.service}</span>
                            <span className="tabular-nums">{x.net.toFixed(4)}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Every service is fully covered by free-tier credits this month.
                    </p>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">No billing data yet.</p>
                  <p className="mt-1 text-muted-foreground">
                    {!data.billed.enabled
                      ? "The billing export tier is switched off in settings."
                      : !data.billed.dataset
                        ? "COST_BILLING_DATASET is not set."
                        : "This is normal for the first few hours after enabling the export, and until the service account has BigQuery access."}
                  </p>
                  {data.billed.error && (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-xs">
                      {data.billed.error}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {data.history.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-3 font-semibold">Previous months</h2>
                <div className="space-y-1 text-sm">
                  {data.history.map((h) => (
                    <div
                      key={h.month}
                      className="flex justify-between border-b border-border/50 py-1 last:border-0"
                    >
                      <span className="text-muted-foreground">{h.month}</span>
                      <span className="tabular-nums">
                        Firebase {usd(h.firebase_usd ?? 0)} · Gemini {usd(h.gemini_usd ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Master controls ──────────────────────────────────────────────────────────

function ControlsTab() {
  const [state, setState] = useState<AdminControlsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [policySummary, setPolicySummary] = useState("");
  const [confirmingPolicy, setConfirmingPolicy] = useState(false);

  useEffect(() => {
    fetchAdminControls()
      .then(setState)
      .catch((e) => setError(errMsg(e, "Failed to load controls.")));
  }, []);

  async function toggle(key: "version_check_enabled" | "device_binding_enabled") {
    if (!state) return;
    setBusy(key);
    setError(null);
    try {
      const res = await setAdminControls({ [key]: !state[key] });
      setState({ ...state, ...res });
    } catch (e) {
      setError(errMsg(e, "Failed to flip the switch."));
    } finally {
      setBusy(null);
    }
  }

  async function doPolicyBump() {
    setBusy("policy");
    setError(null);
    setNotice(null);
    try {
      await bumpPolicy({ summary: policySummary.trim() || undefined });
      setState(await fetchAdminControls());
      setNotice("Policy version raised. Every client must re-consent before transmitting again.");
      setPolicySummary("");
    } catch (e) {
      setError(errMsg(e, "Failed to bump the policy version."));
    } finally {
      setBusy(null);
      setConfirmingPolicy(false);
    }
  }

  if (state === null && !error) return <Spinner />;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <NoticeBanner message={notice} />

      {state && (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="font-semibold">Runtime gates</h2>
                <p className="text-xs text-muted-foreground">
                  These flip the running bot only; .env is the boot-time source of truth, so a
                  restart reverts them.
                </p>
              </div>
              <ToggleRow
                label="Mod version gate"
                hint="Outdated / modified DLLs are refused with 'update required'."
                on={state.version_check_enabled}
                busy={busy === "version_check_enabled"}
                onToggle={() => toggle("version_check_enabled")}
              />
              <ToggleRow
                label="Device binding"
                hint="A new PC must be approved from the owner's Discord DM before using a session."
                on={state.device_binding_enabled}
                busy={busy === "device_binding_enabled"}
                onToggle={() => toggle("device_binding_enabled")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="mb-3 flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <h2 className="font-semibold">Force fleet-wide re-consent</h2>
                  <p className="text-xs text-muted-foreground">
                    Currently policy v{state.policy_version}. Bumping it makes every KSP client stop
                    transmitting until its player re-accepts the Privacy Policy / Terms.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={policySummary}
                  onChange={(e) => setPolicySummary(e.target.value)}
                  placeholder="What changed (shown to players, optional)"
                  className="filter-input max-w-md"
                />
                <Button
                  variant="destructive"
                  onClick={() => setConfirmingPolicy(true)}
                  disabled={busy === "policy"}
                >
                  Bump to v{state.policy_version + 1}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {confirmingPolicy && state && (
        <ConfirmDialog
          title={`Raise the policy version to v${state.policy_version + 1}?`}
          description="Every linked KSP client re-raises its consent gate and stops transmitting until the player re-accepts. This cannot be lowered from here."
          confirmLabel="Bump version"
          destructive
          busy={busy === "policy"}
          onConfirm={doPolicyBump}
          onCancel={() => setConfirmingPolicy(false)}
        />
      )}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  busy,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Button variant={on ? "default" : "outline"} size="sm" onClick={onToggle} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}
