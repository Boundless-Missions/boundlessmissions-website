"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Gavel, Clock, AlertTriangle, RefreshCw } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LinkAccount } from "@/components/marketplace/link-account";
import {
  fetchAuctions,
  bidOnAuction,
  endAuction,
  endsIn,
  WORK_LABELS,
  type Auction,
} from "@/lib/auctions";
import { cn } from "@/lib/utils";

/**
 * Refetch cadence while the tab is open. Auctions move under you — someone
 * undercuts from Discord or from the game — and a stale lowest bid makes the
 * page refuse bids with a sentence about a number it never showed.
 */
const REFRESH_MS = 30_000;

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setError(null);
    try {
      const list = await fetchAuctions();
      setSignedIn(list !== null);
      setAuctions(list ?? []);
      if (quiet) setError(null);
    } catch (e) {
      // A background refresh that fails must not wipe a list the user is reading.
      if (!quiet) {
        setError(e instanceof Error ? e.message : String(e));
        setSignedIn(true);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Quiet background refresh — keeps lowest bids and countdowns honest.
  useEffect(() => {
    if (!signedIn) return;
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [signedIn, load]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 py-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Auctions</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Reverse auctions: an issuer escrows a starting price and contractors bid it
          down; the lowest bid when the timer ends wins the contract. Auctions are
          opened from inside KSP; here (and in Discord) you watch them and bid.
        </p>

        {signedIn === null ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !signedIn ? (
          <div className="py-8">
            <LinkAccount onLinked={() => load()} />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" disabled={refreshing}
                      onClick={async () => {
                        setRefreshing(true);
                        await load();
                        setRefreshing(false);
                      }}>
                <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {error && (
              <p className="mb-4 flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            )}

            {(auctions ?? []).length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">
                No open auctions right now. Open one from inside KSP, or watch the
                Discord auction channel.
              </p>
            ) : (
              <div className="space-y-4">
                {(auctions ?? []).map((a) => (
                  <AuctionCard key={a.auction_id} auction={a} onActed={() => load()} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * The modlist is free text from the issuer, usually comma-separated. Split into
 * the same pill badges the marketplace cards use; text that doesn't split (e.g.
 * "stock + MechJeb only") simply becomes a single pill.
 */
function splitMods(modlist: string): string[] {
  return modlist
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function AuctionCard({ auction: a, onActed }: { auction: Auction; onActed: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [bidValue, setBidValue] = useState("");

  /**
   * A refused action comes back as `success: false` with a sentence worth reading, so
   * it is shown in place rather than thrown away — only a transport failure is an error.
   */
  async function run(key: string, fn: () => Promise<{ success: boolean; message: string }>) {
    setBusy(key);
    setNote(null);
    try {
      const r = await fn();
      setNote(r.message);
      if (r.success) {
        setBidValue("");
        onActed();
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setConfirmingEnd(false);
    }
  }

  const ceiling = a.current_bid - a.min_decrement;
  const bid = Number.parseInt(bidValue, 10);
  const bidValid = Number.isFinite(bid) && bid > 0 && bid <= ceiling;
  const work = a.mission_type ? WORK_LABELS[a.mission_type] : null;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{a.mission}</p>
            <p className="text-xs text-muted-foreground">
              by {a.issuer_name}
              {" · "}contract due {a.due_date}
            </p>
          </div>
          <div className="flex gap-2">
            {a.is_yours && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                Yours
              </Badge>
            )}
            {a.is_leading && (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                You&apos;re lowest
              </Badge>
            )}
            <Badge variant="outline" className="border-sky-500/40 text-sky-500">
              <Clock className="mr-1 h-3 w-3" />
              {endsIn(a.ends_at)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>Starting {a.start_value.toLocaleString()}</span>
          <span className="text-foreground">
            Lowest {a.current_bid.toLocaleString()}
            {a.bid_count > 0 && a.current_bidder_name ? ` by ${a.current_bidder_name}` : ""}
          </span>
          <span>Bids {a.bid_count}</span>
          <span>Fine {a.fine.toLocaleString()}</span>
        </div>

        {work && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {work}
          </p>
        )}

        {a.modlist && (
          <div className="flex flex-wrap items-center gap-1">
            {splitMods(a.modlist).map((m) => (
              <Badge key={m} variant="outline" className="whitespace-nowrap text-[10px]">
                {m}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {a.is_yours ? (
            confirmingEnd ? (
              <Button size="sm" variant="secondary" disabled={busy !== null}
                      onClick={() => run("end", () => endAuction(a.auction_id))}>
                {busy === "end" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {a.bid_count > 0
                  ? `Confirm: ${a.current_bidder_name ?? "the lowest bidder"} wins at ${a.current_bid.toLocaleString()}`
                  : "Confirm: no bids, escrow refunded"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy !== null}
                      onClick={() => setConfirmingEnd(true)}>
                End now
              </Button>
            )
          ) : (
            <>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={ceiling}
                value={bidValue}
                onChange={(e) => setBidValue(e.target.value)}
                placeholder={`≤ ${ceiling.toLocaleString()}`}
                className="h-8 w-32 rounded-md border border-border bg-transparent px-2 text-xs"
                aria-label="Your bid in KCoins"
              />
              <Button size="sm" disabled={busy !== null || !bidValid}
                      onClick={() => run("bid", () => bidOnAuction(a.auction_id, bid))}>
                {busy === "bid" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Bid lower
              </Button>
              <span className="text-xs text-muted-foreground">
                Undercut by at least {a.min_decrement.toLocaleString()}. Winning binds you
                to the contract.
              </span>
            </>
          )}
        </div>

        {confirmingEnd && (
          <p className="text-xs text-muted-foreground">Click again to confirm.</p>
        )}
        {note && <p className="text-sm">{note}</p>}
      </CardContent>
    </Card>
  );
}
