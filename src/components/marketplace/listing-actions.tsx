"use client";

/**
 * listing-actions.tsx — the like / dislike / report row shown on a listing.
 *
 * Fully controlled: every piece of state (the tallies, my vote, which listing is
 * mid-request) lives in `useListingVotes` on the page, because the same listing is
 * on screen twice whenever its detail dialog is open.
 *
 * Pressing the button you already chose clears the vote. That toggle is a UI
 * convention and lives only here — the API takes the state you want, never a
 * "flip it", so a double-submit can't undo a vote you meant to keep.
 */
import { Flag, ThumbsDown, ThumbsUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { VOTE_DOWN, VOTE_NONE, VOTE_UP, type Listing } from "@/lib/marketplace";

interface ListingActionsProps {
  listing: Listing;
  /** 1, -1 or 0 — the signed-in user's current vote on this listing. */
  myVote: number;
  /** Called with the vote the user wants (already resolved through the toggle). */
  onVote: (listing: Listing, vote: number) => void;
  /** Opens the report dialog. Omitted where reporting makes no sense (your own craft). */
  onReport?: (listing: Listing) => void;
  /** False when voting is impossible for this user *and* nothing they can do about
   *  it — their own craft. Signed-out visitors keep pressable buttons: the page
   *  answers those with a "sign in" prompt, which is more use than a dead control. */
  canVote: boolean;
  /** Why voting is unavailable, used as the tooltip when `canVote` is false. */
  disabledHint?: string;
  busy?: boolean;
  className?: string;
}

export function ListingActions({
  listing,
  myVote,
  onVote,
  onReport,
  canVote,
  disabledHint,
  busy,
  className,
}: ListingActionsProps) {
  const likes = listing.likes ?? 0;
  const dislikes = listing.dislikes ?? 0;

  function press(button: number) {
    onVote(listing, myVote === button ? VOTE_NONE : button);
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <VoteButton
        icon={<ThumbsUp className="h-3.5 w-3.5" />}
        count={likes}
        active={myVote === VOTE_UP}
        activeClass="border-primary/60 bg-primary/15 text-primary"
        label={canVote ? (myVote === VOTE_UP ? "Remove your like" : "Like this craft") : disabledHint}
        disabled={!canVote || busy}
        onClick={() => press(VOTE_UP)}
      />
      <VoteButton
        icon={<ThumbsDown className="h-3.5 w-3.5" />}
        count={dislikes}
        active={myVote === VOTE_DOWN}
        activeClass="border-destructive/50 bg-destructive/10 text-destructive"
        label={
          canVote ? (myVote === VOTE_DOWN ? "Remove your dislike" : "Dislike this craft") : disabledHint
        }
        disabled={!canVote || busy}
        onClick={() => press(VOTE_DOWN)}
      />
      {onReport && (
        <button
          type="button"
          title="Report this listing to the moderators"
          aria-label="Report this listing"
          onClick={() => onReport(listing)}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function VoteButton({
  icon,
  count,
  active,
  activeClass,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  count: number;
  active: boolean;
  activeClass: string;
  label?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs tabular-nums transition-colors",
        active ? activeClass : "border-border text-muted-foreground",
        // A signed-out visitor still sees the counts, so the disabled state must
        // read as "not for you" rather than as an error.
        disabled ? "cursor-not-allowed opacity-70" : "hover:text-foreground",
      )}
    >
      {icon}
      {count}
    </button>
  );
}
