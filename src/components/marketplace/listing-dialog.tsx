"use client";

import { useEffect, useState } from "react";
import { Rocket, Boxes, Weight, ShoppingCart, Coins, Download, Trash2, X, Maximize2, RotateCcw, Trash, Soup, Palette } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ImageZoom } from "@/components/marketplace/image-zoom";
import { ListingActions } from "@/components/marketplace/listing-actions";
import { type VoteControls } from "@/components/marketplace/listing-card";
import {
  type Listing,
  formatCoins,
  craftDownloadHref,
  lifeSupportLabel,
  CUSTOM_TEXTURES_LABEL,
  CUSTOM_TEXTURES_HINT,
} from "@/lib/marketplace";

interface ListingDialogProps {
  listing: Listing;
  /** Same object the card gets — both copies of a listing move together. */
  votes?: VoteControls;
  onClose: () => void;
  onBuy?: (l: Listing) => void;
  onDelist?: (l: Listing) => void;
  onRelist?: (l: Listing) => void;
  onDelete?: (l: Listing) => void;
  downloadUrl?: string | null;
  busy?: boolean;
}

export function ListingDialog({
  listing,
  votes,
  onClose,
  onBuy,
  onDelist,
  onRelist,
  onDelete,
  downloadUrl,
  busy,
}: ListingDialogProps) {
  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const delisted = listing.status !== "active";
  const [zoomOpen, setZoomOpen] = useState(false);
  // Null for a stock craft — the row is dropped rather than shown empty.
  const lifeSupport = lifeSupportLabel(listing);

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-md bg-background/70 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Full blueprint — click to open the zoom/pan viewer */}
        <div className="flex min-h-[240px] flex-1 items-center justify-center bg-black/40 p-2 md:max-w-[60%]">
          {listing.blueprint_url ? (
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label="Zoom blueprint"
              className="group relative flex h-full w-full cursor-zoom-in items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.blueprint_url}
                alt={listing.craft_name}
                className="max-h-[86vh] w-full object-contain"
              />
              <span className="absolute bottom-2 right-2 rounded-md bg-background/70 p-1.5 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
          ) : (
            <Rocket className="h-16 w-16 text-muted-foreground opacity-40" />
          )}
        </div>

        {/* Details */}
        <div className="flex w-full flex-col gap-4 overflow-y-auto p-6 md:w-80">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{listing.craft_type}</Badge>
            {delisted && <Badge variant="muted">Delisted</Badge>}
            {listing.custom_textures && (
              <Badge variant="default" className="gap-1" title={CUSTOM_TEXTURES_HINT}>
                <Palette className="h-3.5 w-3.5" /> {CUSTOM_TEXTURES_LABEL}
              </Badge>
            )}
          </div>

          <h2 className="text-xl font-bold leading-tight">{listing.craft_name}</h2>

          <div className="flex items-baseline gap-1.5">
            <Coins className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold text-primary">{formatCoins(listing.price)}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">KCoins</span>
          </div>

          <Separator />

          <dl className="space-y-2 text-sm">
            <Stat icon={<Boxes className="h-4 w-4" />} label="Parts" value={`${listing.part_count}`} />
            <Stat icon={<Weight className="h-4 w-4" />} label="Mass" value={`${listing.mass.toFixed(2)} t`} />
            <Stat icon={<Coins className="h-4 w-4" />} label="In-game cost" value={formatCoins(listing.cost)} />
            <Stat icon={<ShoppingCart className="h-4 w-4" />} label="Sold" value={`${listing.sales_count}`} />
            {lifeSupport && (
              <Stat icon={<Soup className="h-4 w-4" />} label="Life support" value={lifeSupport} />
            )}
          </dl>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mods
            </p>
            {listing.mods.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {listing.mods.map((m) => (
                  <Badge key={m} variant="outline" className="text-[11px]">
                    {m}
                  </Badge>
                ))}
              </div>
            ) : (
              <Badge variant="muted" className="text-[11px]">
                Stock parts only
              </Badge>
            )}
            {/* The tag's tooltip spelled out: a hover hint is no use on a phone, and
                this is where a buyer is deciding what they have to install. */}
            {listing.custom_textures && (
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                {CUSTOM_TEXTURES_HINT}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">by {listing.seller_name}</p>

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

          {(onBuy || onDelist || onRelist || onDelete || downloadUrl) && (
            <div className="mt-auto flex flex-col gap-2 pt-2">
              {onBuy && !delisted && (
                <Button disabled={busy} onClick={() => onBuy(listing)}>
                  <ShoppingCart /> Buy for {formatCoins(listing.price)} KCoins
                </Button>
              )}
              {downloadUrl && (
                <Button asChild variant="outline">
                  <a href={craftDownloadHref(downloadUrl, listing.craft_filename || `${listing.craft_name}.craft`)}>
                    <Download /> Download .craft
                  </a>
                </Button>
              )}
              {onDelist && !delisted && (
                <Button variant="outline" disabled={busy} onClick={() => onDelist(listing)}>
                  <Trash2 /> Delist
                </Button>
              )}
              {onRelist && delisted && (
                <Button variant="outline" disabled={busy} onClick={() => onRelist(listing)}>
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
                  <Trash /> Permanently delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {zoomOpen && listing.blueprint_url && (
      <ImageZoom
        src={listing.blueprint_url}
        alt={listing.craft_name}
        onClose={() => setZoomOpen(false)}
      />
    )}
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
