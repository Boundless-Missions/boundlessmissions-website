"use client";

/**
 * report-dialog.tsx — "what's wrong with this craft?" before a report is filed.
 *
 * A report opens a real private ticket in Discord with a moderator pinged, so the
 * dialog says so plainly: this is not a downvote with extra steps, and the craft's
 * seller is named in the ticket. Someone who just dislikes a craft should close
 * this and press the thumbs-down instead.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Flag, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type Listing } from "@/lib/marketplace";

const REASON_MAX = 1500; // matches _REPORT_REASON_MAX in the bot's api_server.py

interface ReportDialogProps {
  listing: Listing;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
  busy?: boolean;
  /** Set when the last attempt failed — e.g. "you've already reported this craft". */
  error?: string | null;
}

export function ReportDialog({ listing, onSubmit, onClose, busy, error }: ReportDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const canSend = reason.trim().length > 0 && !busy;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Cancel"
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Flag className="h-4 w-4 text-destructive" /> Report this listing
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{listing.craft_name}</span> by{" "}
          {listing.seller_name}
        </p>

        <label htmlFor="report-reason" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          What&apos;s wrong with it?
        </label>
        <textarea
          id="report-reason"
          autoFocus
          rows={5}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Stolen craft, misleading listing, offensive name, broken download…"
          className="filter-input mt-1.5 w-full resize-y"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {reason.length}/{REASON_MAX}
        </p>

        <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This opens a private ticket in Discord with a moderator pinged. The listing,
            the seller and your Discord account are attached to it. Only report a real
            problem. To say you didn&apos;t like the craft, use the dislike button.
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!canSend}
            onClick={() => onSubmit(reason.trim())}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Flag />}
            Send report
          </Button>
        </div>
      </div>
    </div>
  );
}
