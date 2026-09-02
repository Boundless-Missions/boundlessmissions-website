"use client";

import { useEffect, useRef, useState } from "react";
import { Rocket, Boxes, Weight, ShoppingCart, Download, Trash2, Maximize2, RotateCcw, Trash, Soup, Palette } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ListingDialog } from "@/components/marketplace/listing-dialog";
import { ListingActions } from "@/components/marketplace/listing-actions";
import { cn } from "@/lib/utils";
import {
  type Listing,
  formatCoins,
  craftDownloadHref,
  lifeSupportLabel,
  CUSTOM_TEXTURES_LABEL,
  AUTO_DELISTED_HINT,
  CUSTOM_TEXTURES_HINT,
} from "@/lib/marketplace";

/**
 * Everything the like/dislike/report row needs, in one prop.
 *
 * Optional as a unit: a page that has no vote state (or a view where voting makes
 * no sense, like your own uploads) simply omits it and the row isn't drawn — no
 * half-wired buttons that look pressable and aren't.
 */
export interface VoteControls {
  /** The signed-in user's vote on this listing: 1, -1 or 0. */
  myVote: number;
  /** False when signed out — the counts still show, the buttons explain themselves. */
  canVote: boolean;
  /** Tooltip for why voting is unavailable. */
  hint?: string;
  busy?: boolean;
  onVote: (l: Listing, vote: number) => void;
  onReport?: (l: Listing) => void;
}

interface ListingCardProps {
  listing: Listing;
  /** Like / dislike / report row. Omit to leave it off entirely. */
  votes?: VoteControls;
  /** When set, shows a Buy button that calls this. */
  onBuy?: (l: Listing) => void;
  /** When set, shows a Delist button on active listings (My Uploads). */
  onDelist?: (l: Listing) => void;
  /** When set, shows a Relist button on delisted listings (My Uploads). */
  onRelist?: (l: Listing) => void;
  /** When set, shows a permanent-Delete button (My Uploads). */
  onDelete?: (l: Listing) => void;
  /** Whether to offer the .craft download (My Purchases / after buying). The
   *  link carries the listing id, not a URL — the proxy mints the signature. */
  canDownload?: boolean;
  busy?: boolean;
}

export function ListingCard({
  listing,
  votes,
  onBuy,
  onDelist,
  onRelist,
  onDelete,
  canDownload,
  busy,
}: ListingCardProps) {
  const delisted = listing.status !== "active";
  const [open, setOpen] = useState(false);
  // Cards show the square NW-view thumbnail; the full multi-view blueprint is in the
  // detail view. Listings made before the thumbnail existed fall back to the blueprint.
  const cardImage = listing.thumbnail_url || listing.blueprint_url;
  // Only crafts actually provisioned for a life-support mod carry this; stock crafts
  // get no row rather than an empty one.
  const lifeSupport = lifeSupportLabel(listing);
  return (
    <Card className="flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View details for ${listing.craft_name}`}
        className="group relative block aspect-square w-full cursor-zoom-in bg-muted/40"
      >
        {cardImage ? (
          // object-contain shows the whole render (NW thumbnail is 1:1, blueprint is
          // 16:9) instead of cropping it to fill the card.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cardImage}
            alt={listing.craft_name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Rocket className="h-10 w-10 opacity-40" />
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 backdrop-blur-sm"
        >
          {listing.craft_type}
        </Badge>
        {delisted && (
          <Badge
            variant="muted"
            className="absolute right-2 top-2"
            title={listing.auto_delisted ? AUTO_DELISTED_HINT : undefined}
          >
            {listing.auto_delisted ? "Removed (rating)" : "Delisted"}
          </Badge>
        )}
        {/* Expand affordance on hover */}
        <span className="absolute bottom-2 right-2 rounded-md bg-background/70 p-1.5 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-left font-semibold leading-tight line-clamp-2 hover:text-primary"
          >
            {listing.craft_name}
          </button>
          <div className="shrink-0 text-right">
            <div className="font-semibold text-primary">{formatCoins(listing.price)}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">KCoins</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Boxes className="h-3.5 w-3.5" /> {listing.part_count} parts
          </span>
          <span className="inline-flex items-center gap-1">
            <Weight className="h-3.5 w-3.5" /> {listing.mass.toFixed(1)} t
          </span>
          <span className="inline-flex items-center gap-1">
            <ShoppingCart className="h-3.5 w-3.5" /> {listing.sales_count} sold
          </span>
          {lifeSupport && (
            <span className="inline-flex items-center gap-1" title={lifeSupport}>
              <Soup className="h-3.5 w-3.5" /> {lifeSupport}
            </span>
          )}
        </div>

        {/* Above the mod row, not inside it: the paint job is a property of the craft,
            while that row is a list of folders — and a recolour pack sitting somewhere in
            a long, faded-out row of mods is exactly what a buyer misses. */}
        {listing.custom_textures && (
          <Badge variant="default" className="w-fit gap-1 text-[10px]" title={CUSTOM_TEXTURES_HINT}>
            <Palette className="h-3 w-3" /> {CUSTOM_TEXTURES_LABEL}
          </Badge>
        )}

        {listing.mods.length > 0 ? (
          <ModRow mods={listing.mods} onClick={() => setOpen(true)} />
        ) : (
          <Badge variant="muted" className="w-fit text-[10px]">
            Stock parts only
          </Badge>
        )}

        <p className="mt-auto text-xs text-muted-foreground">by {listing.seller_name}</p>

        {votes && (
          <ListingActions
            listing={listing}
            myVote={votes.myVote}
            canVote={votes.canVote}
            disabledHint={votes.hint}
            busy={votes.busy}
            onVote={votes.onVote}
            onReport={votes.onReport}
          />
        )}
      </CardContent>

      <CardFooter
        className={cn(
          "flex-wrap gap-2 p-4 pt-0",
          !onBuy && !onDelist && !onRelist && !onDelete && !canDownload && "hidden",
        )}
      >
        {onBuy && !delisted && (
          <Button className="flex-1" disabled={busy} onClick={() => onBuy(listing)}>
            <ShoppingCart /> Buy
          </Button>
        )}
        {canDownload && (
          <Button asChild variant="outline" className="flex-1">
            <a href={craftDownloadHref(listing.listing_id)}>
              <Download /> Download
            </a>
          </Button>
        )}
        {onDelist && !delisted && (
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onDelist(listing)}>
            <Trash2 /> Delist
          </Button>
        )}
        {onRelist && delisted && (
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onRelist(listing)}>
            <RotateCcw /> Relist
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onDelete(listing)}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash /> Delete
          </Button>
        )}
      </CardFooter>

      {open && (
        <ListingDialog
          listing={listing}
          votes={votes}
          onClose={() => setOpen(false)}
          onBuy={onBuy}
          onDelist={onDelist}
          onRelist={onRelist}
          onDelete={onDelete}
          canDownload={canDownload}
          busy={busy}
        />
      )}
    </Card>
  );
}

/**
 * Single-line mod badges. Mod lists get long, so they stay on one row and the
 * overflowing end is faded out (only when it actually overflows) to signal there
 * are more — clicking opens the detail view, which lists them all.
 */
function ModRow({ mods, onClick }: { mods: string[]; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mods]);

  return (
    <button
      type="button"
      onClick={onClick}
      title="View all mods"
      className="relative block w-full text-left"
    >
      <div
        ref={ref}
        className={cn(
          "flex flex-nowrap gap-1 overflow-hidden",
          overflowing && "[mask-image:linear-gradient(to_right,black_72%,transparent)]",
        )}
      >
        {mods.map((m) => (
          <Badge key={m} variant="outline" className="shrink-0 whitespace-nowrap text-[10px]">
            {m}
          </Badge>
        ))}
      </div>
      {overflowing && (
        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          ⋯
        </span>
      )}
    </button>
  );
}
