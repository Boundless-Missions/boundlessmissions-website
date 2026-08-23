"use client";

/**
 * listing-actions.tsx — the rating / report row shown on a listing.
 *
 * A craft carries ONE number, the way SCP wiki rates a page: +1 per like, -1 per
 * dislike, shown signed between the two buttons. The separate tallies still exist
 * server-side, but showing them is showing the working rather than the answer —
 * "+31 / -4" and "+27" say the same thing and only one of them can be read at a
 * glance on a card.
 *
 * Fully controlled: every piece of state (the score, my vote, which listing is
 * mid-request) lives in `useListingVotes` on the page, because the same listing is
 * on screen twice whenever its detail dialog is open.
 *
 * Pressing the button you already chose clears the vote. That toggle is a UI
 * convention and lives only here — the API takes the state you want, never a
 * "flip it", so a double-submit can't undo a vote you meant to keep.
 */
import { Flag, ThumbsDown, ThumbsUp } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatScore,
  listingScore,
  VOTE_DOWN,
  VOTE_NONE,
  VOTE_UP,
  type Listing,
} from "@/lib/marketplace";

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
  const score = listingScore(listing);

  function press(button: number) {
    onVote(listing, myVote === button ? VOTE_NONE : button);
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <VoteButton
        icon={<ThumbsUp className="h-3.5 w-3.5" />}
        active={myVote === VOTE_UP}
        activeClass="border-primary/60 bg-primary/15 text-primary"
        label={canVote ? (myVote === VOTE_UP ? "Remove your like" : "Like this craft") : disabledHint}
        disabled={!canVote || busy}
        onClick={() => press(VOTE_UP)}
      />
      <span
        title={`Community rating: ${formatScore(score)} (likes minus dislikes)`}
        className={cn(
          "min-w-[2.5rem] px-1 text-center text-xs font-semibold tabular-nums transition-colors",
          // Only a negative score is coloured. A green +4 next to a grey +0 makes
          // every unrated craft look faintly disapproved of, which is not what a
          // craft nobody has voted on yet means.
          score < 0 ? "text-destructive" : "text-foreground",
        )}
      >
        {formatScore(score)}
      </span>
      <VoteButton
        icon={<ThumbsDown className="h-3.5 w-3.5" />}
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
  active,
  activeClass,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
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
        "inline-flex items-center justify-center rounded-md border p-1.5 transition-colors",
        active ? activeClass : "border-border text-muted-foreground",
        // A signed-out visitor still sees the rating, so the disabled state must
        // read as "not for you" rather than as an error.
        disabled ? "cursor-not-allowed opacity-70" : "hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}
