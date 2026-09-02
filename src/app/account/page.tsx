"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, LogOut, Package, ShoppingBag, Coins } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ListingCard } from "@/components/marketplace/listing-card";
import { LinkAccount } from "@/components/marketplace/link-account";
import { SignInCard } from "@/components/account/sign-in-card";
import { Onboarding } from "@/components/account/onboarding";
import { ProfileSettings } from "@/components/account/profile-settings";
import { KspLinkCard } from "@/components/account/ksp-link-card";
import { DiscordLinkCard } from "@/components/account/discord-link-card";
import { FriendsCard } from "@/components/account/friends-card";
import { TicketsCard } from "@/components/account/tickets-card";
import { TwoFactorCard } from "@/components/account/two-factor-card";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  fetchProfile,
  fetchMine,
  fetchPurchases,
  delistListing,
  relistListing,
  deleteListing,
  reportListing,
  logout,
  formatCoins,
  VOTE_NONE,
  type Profile,
  type Listing,
} from "@/lib/marketplace";
import { fetchAccount, type Account } from "@/lib/account";
import { signOutAll } from "@/lib/auth";
import { useListingVotes } from "@/lib/use-listing-votes";
import { cn } from "@/lib/utils";

type Tab = "uploads" | "purchases";

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  // The account record is a separate read from the wallet: `profile` answers "what
  // has this player got", `account` answers "who are they". They are loaded together
  // but only the account knows whether onboarding is still owed.
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("uploads");
  const [mine, setMine] = useState<Listing[] | null>(null);
  const [purchases, setPurchases] = useState<Listing[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Neutral counterpart to `error`: something happened that the user should know
  // about but did not go wrong. The only one so far is a vote of theirs pushing a
  // craft to the rating floor.
  const [notice, setNotice] = useState<string | null>(null);
  // Listing awaiting delete confirmation (drives the in-app confirm modal).
  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null);
  // Listing being reported (Purchases tab), and that dialog's own busy/error state.
  const [reporting, setReporting] = useState<Listing | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setChecking(true);
    try {
      const [p, a] = await Promise.all([
        fetchProfile(),
        // A session that predates accounts, or a Firestore blip, must not take the
        // whole page down with it — the wallet half still renders.
        fetchAccount().catch(() => null),
      ]);
      setProfile(p);
      setAccount(a);
    } catch {
      setProfile(null);
      setAccount(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load the active tab's data once signed in.
  useEffect(() => {
    if (!profile) return;
    if (tab === "uploads" && mine === null) {
      fetchMine().then(setMine).catch((e) => setError(String(e.message ?? e)));
    }
    if (tab === "purchases" && purchases === null) {
      fetchPurchases().then(setPurchases).catch((e) => setError(String(e.message ?? e)));
    }
  }, [profile, tab, mine, purchases]);

  function setStatusLocal(id: string, status: string) {
    setMine((cur) => (cur ?? []).map((x) => (x.listing_id === id ? { ...x, status } : x)));
  }

  async function handleDelist(l: Listing) {
    setBusyId(l.listing_id);
    setError(null);
    try {
      await delistListing(l.listing_id);
      setStatusLocal(l.listing_id, "delisted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delist.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRelist(l: Listing) {
    setBusyId(l.listing_id);
    setError(null);
    try {
      await relistListing(l.listing_id);
      setStatusLocal(l.listing_id, "active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to relist.");
    } finally {
      setBusyId(null);
    }
  }

  // Open the confirm modal; the actual delete runs in confirmDelete.
  function handleDelete(l: Listing) {
    setPendingDelete(l);
  }

  async function confirmDelete() {
    const l = pendingDelete;
    if (!l) return;
    setBusyId(l.listing_id);
    setError(null);
    try {
      await deleteListing(l.listing_id);
      setMine((cur) => (cur ?? []).filter((x) => x.listing_id !== l.listing_id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setBusyId(null);
      // Close the modal either way; a failure surfaces in the error banner behind it.
      setPendingDelete(null);
    }
  }

  // Votes on the Purchases tab: someone who bought and flew a craft is exactly who
  // should be able to rate it. Uploads get no vote row — you can't vote on your own.
  // A craft bought here stays bought and stays downloadable whatever its rating
  // does, so this is a notice and not a change to the list.
  const onListingRemoved = useCallback((l: Listing, kind: string) => {
    setNotice(
      `"${l.craft_name}" reached the community rating limit and was ` +
        `${kind === "deleted" ? "removed from" : "taken off"} the marketplace. ` +
        `Your copy and its download are unaffected.`,
    );
  }, []);

  const { myVotes, vote, votingId, withVotes } = useListingVotes(
    !!profile, setError, onListingRemoved);

  function voteControls(l: Listing) {
    return {
      myVote: myVotes[l.listing_id] ?? VOTE_NONE,
      canVote: true, // this tab only ever shows crafts bought from someone else
      busy: votingId === l.listing_id,
      onVote: vote,
      onReport: (x: Listing) => {
        setReportError(null);
        setReporting(x);
      },
    };
  }

  async function submitReport(reason: string) {
    const l = reporting;
    if (!l) return;
    setReportBusy(true);
    setReportError(null);
    try {
      await reportListing(l.listing_id, reason);
      setReporting(null);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Couldn't send that report.");
    } finally {
      setReportBusy(false);
    }
  }

  async function handleLogout() {
    // `logout` drops our cookie; `signOutAll` also clears any Firebase identity
    // still live in this tab, so the next sign-in asks who you are rather than
    // silently reusing the last one.
    await logout();
    await signOutAll().catch(() => {});
    setProfile(null);
    setAccount(null);
    setMine(null);
    setPurchases(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">My Account</h1>

        {checking ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !profile ? (
          <div className="grid gap-6 py-8 md:grid-cols-2">
            <SignInCard onSignedIn={loadProfile} />
            <LinkAccount onLinked={loadProfile} />
          </div>
        ) : account?.needs_onboarding ? (
          <div className="py-8">
            <Onboarding account={account} onDone={loadProfile} />
          </div>
        ) : (
          <>
            {/* Profile header */}
            <Card className="mb-6">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Signed in as</p>
                  {/* The account document, not `profile.username` — that one comes
                      from the 30-day session token and would show a stale name for
                      a month after a rename. */}
                  <p className="text-xl font-semibold">
                    {account?.display_name || profile.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account?.username ? `@${account.username} · ` : ""}Level {profile.level}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="h-10 gap-1.5 px-4 text-base">
                    <Coins className="h-4 w-4" /> {formatCoins(profile.balance)} KCoins
                  </Badge>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut /> Log out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {profile.debt > 0 && (
              // Shown wherever the balance is: a share of every payout is going to
              // these, and rewards arriving smaller with nothing explaining why reads
              // as the site being broken.
              <Card className="mb-6 border-amber-500/40">
                <CardContent className="flex flex-col gap-1 py-4">
                  <p className="text-sm font-medium">
                    Unpaid fines: {formatCoins(profile.debt)} KCoins
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.debt_garnish_percent > 0
                      ? `${profile.debt_garnish_percent}% of what you earn goes towards them until they are paid off. Nothing else is restricted.`
                      : "Repaid out of a share of what you earn."}
                  </p>
                </CardContent>
              </Card>
            )}

            {account && (
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                <ProfileSettings account={account} onChanged={loadProfile} />
                <div className="flex flex-col gap-6">
                  <KspLinkCard />
                  <DiscordLinkCard account={account} onChanged={loadProfile} />
                  <TwoFactorCard />
                </div>
                {/* Full width, above the tickets: it is a list of people with
                    actions on each row, and a half-width column turns every row
                    into two lines. */}
                <div className="lg:col-span-2">
                  <FriendsCard account={account} />
                </div>
                <div className="lg:col-span-2">
                  <TicketsCard />
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-5 flex gap-1 border-b border-border">
              <TabButton active={tab === "uploads"} onClick={() => setTab("uploads")}>
                <Package className="h-4 w-4" /> My Uploads
              </TabButton>
              <TabButton active={tab === "purchases"} onClick={() => setTab("purchases")}>
                <ShoppingBag className="h-4 w-4" /> My Purchases
              </TabButton>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {notice && (
              <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {notice}
              </div>
            )}

            {tab === "uploads" && (
              <TabBody
                items={mine}
                emptyIcon={<Package className="h-10 w-10 opacity-40" />}
                emptyText="You haven't listed any craft yet. List craft from inside KSP using the Boundless Missions mod."
                renderCard={(l) => (
                  <ListingCard
                    key={l.listing_id}
                    listing={l}
                    onDelist={handleDelist}
                    onRelist={handleRelist}
                    onDelete={handleDelete}
                    busy={busyId === l.listing_id}
                  />
                )}
              />
            )}

            {tab === "purchases" && (
              <TabBody
                items={purchases}
                emptyIcon={<ShoppingBag className="h-10 w-10 opacity-40" />}
                emptyText="No purchases yet."
                emptyAction={
                  <Button asChild className="mt-2">
                    <Link href="/marketplace">Browse the marketplace</Link>
                  </Button>
                }
                renderCard={(raw) => {
                  const l = withVotes(raw);
                  return (
                    <ListingCard
                      key={l.listing_id}
                      listing={l}
                      votes={voteControls(l)}
                      canDownload={!!l.craft_url}
                    />
                  );
                }}
              />
            )}
          </>
        )}
      </main>
      <SiteFooter />

      {pendingDelete && (
        <ConfirmDialog
          title="Delete listing?"
          description={
            <>
              Permanently delete{" "}
              <span className="font-medium text-foreground">
                &ldquo;{pendingDelete.craft_name}&rdquo;
              </span>
              ? This removes the listing and its files for good and can&rsquo;t be undone.
            </>
          }
          confirmLabel="Delete"
          destructive
          busy={busyId === pendingDelete.listing_id}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {reporting && (
        <ReportDialog
          listing={reporting}
          busy={reportBusy}
          error={reportError}
          onSubmit={submitReport}
          onClose={() => !reportBusy && setReporting(null)}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TabBody({
  items,
  emptyIcon,
  emptyText,
  emptyAction,
  renderCard,
}: {
  items: Listing[] | null;
  emptyIcon: React.ReactNode;
  emptyText: string;
  emptyAction?: React.ReactNode;
  renderCard: (l: Listing) => React.ReactNode;
}) {
  if (items === null) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
        {emptyIcon}
        <p className="max-w-sm">{emptyText}</p>
        {emptyAction}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(renderCard)}
    </div>
  );
}
