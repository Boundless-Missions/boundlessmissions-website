"use client";

/**
 * use-listing-votes.ts — one place that owns "what have I voted, and what does the
 * rating say right now", shared by the marketplace grid and the account page.
 *
 * Two things make this a hook rather than state inside the button component. A
 * listing is drawn twice at once — the card and the detail dialog opened from it —
 * so a vote pressed in one must move the other; and the listings grid is served
 * from a 60-second CDN cache, so the rating that comes back with a page reload can
 * be older than a vote cast a moment ago. Keeping the post-vote score here, keyed
 * by listing, lets `withVotes` overlay the truth on whatever the cache returned.
 */
import { useCallback, useEffect, useState } from "react";

import { fetchMyVotes, listingScore, voteListing, VOTE_NONE, type Listing } from "./marketplace";

export function useListingVotes(
  signedIn: boolean,
  onError?: (msg: string) => void,
  /** Called when a vote pushed a craft to the rating floor and off the grid. */
  onRemoved?: (listing: Listing, kind: string) => void,
) {
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setMyVotes({}); // signing out must not leave someone else's buttons lit up
      return;
    }
    fetchMyVotes()
      .then(setMyVotes)
      .catch(() => setMyVotes({}));
  }, [signedIn]);

  /** A listing with any locally-known score applied over the server's copy. */
  const withVotes = useCallback(
    (l: Listing): Listing => {
      const s = scores[l.listing_id];
      return s === undefined ? l : { ...l, score: s };
    },
    [scores],
  );

  /**
   * Cast `next` (1 / -1 / 0) on a listing. Applied optimistically so the button
   * responds at once, then replaced by the server's authoritative score — and
   * rolled back if the call fails, since a like the server never recorded must
   * not keep showing as one.
   */
  const vote = useCallback(
    async (listing: Listing, next: number) => {
      const id = listing.listing_id;
      const prev = myVotes[id] ?? VOTE_NONE;
      if (prev === next) return;

      const base = scores[id] ?? listingScore(listing);
      // Votes are +1 / -1 / 0, so the change to the score is exactly the change to
      // the vote — no separate like and dislike arithmetic to get wrong.
      setScores((s) => ({ ...s, [id]: base + (next - prev) }));
      setMyVotes((v) => ({ ...v, [id]: next }));
      setBusyId(id);
      try {
        const r = await voteListing(id, next);
        setScores((s) => ({ ...s, [id]: r.score }));
        setMyVotes((v) => ({ ...v, [id]: r.my_vote }));
        if (r.listing_removed) onRemoved?.(listing, r.removal_kind ?? "delisted");
      } catch (e) {
        setScores((s) => ({ ...s, [id]: base }));
        setMyVotes((v) => ({ ...v, [id]: prev }));
        onError?.(e instanceof Error ? e.message : "Couldn't record that vote.");
      } finally {
        setBusyId(null);
      }
    },
    [myVotes, scores, onError, onRemoved],
  );

  return { myVotes, vote, votingId: busyId, withVotes };
}
