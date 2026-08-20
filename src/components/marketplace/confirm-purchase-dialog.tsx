"use client";

import { useEffect } from "react";
import { Coins, ShoppingCart, X, AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type Listing, formatCoins } from "@/lib/marketplace";

interface ConfirmPurchaseDialogProps {
  listing: Listing;
  /** Buyer's current balance (before the purchase). */
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

/**
 * Pre-purchase confirmation: shows the craft's price and the buyer's balance
 * before and after, so a buy is never a surprise. Confirm is blocked when the
 * buyer can't afford it.
 */
export function ConfirmPurchaseDialog({
  listing,
  balance,
  onConfirm,
  onCancel,
  busy,
}: ConfirmPurchaseDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  const price = listing.price;
  const after = balance - price;
  const affordable = after >= 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !busy && onCancel()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          disabled={busy}
          aria-label="Cancel"
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-1 text-lg font-bold">Confirm purchase</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Buy <span className="font-medium text-foreground">{listing.craft_name}</span> from{" "}
          {listing.seller_name}?
        </p>

        <dl className="space-y-2 text-sm">
          <Row label="Cost">
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              <Coins className="h-4 w-4" />
              {formatCoins(price)}
            </span>
          </Row>
          <Separator />
          <Row label="Balance now">{formatCoins(balance)}</Row>
          <Row label="Balance after">
            <span className={affordable ? "font-semibold" : "font-semibold text-destructive"}>
              {formatCoins(after)}
            </span>
          </Row>
        </dl>

        {!affordable && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              You need {formatCoins(price - balance)} more KCoins to buy this craft.
            </span>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={busy || !affordable}>
            {busy ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
            Buy for {formatCoins(price)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
