"use client";

/**
 * use-listing-votes.ts — one place that owns "what have I voted, and what do the
 * tallies say right now", shared by the marketplace grid and the account page.
 *
 * Two things make this a hook rather than state inside the button component. A
 * listing is drawn twice at once — the card and the detail dialog opened from it —
 * so a vote pressed in one must move the other; and the listings grid is served
 * from a 60-second CDN cache, so the tallies that come back with a page reload can
 * be older than a vote cast a moment ago. Keeping the post-vote counts here, keyed
 * by listing, lets `withVotes` overlay the truth on whatever the cache returned.
 */
import { useCallback, useEffect, useState } from "react";

import { fetchMyVotes, voteListing, VOTE_NONE, type Listing } from "./marketplace";

interface Tally {
  likes: number;
  dislikes: number;
}

export function useListingVotes(signedIn: boolean, onError?: (msg: string) => void) {
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [tallies, setTallies] = useState<Record<string, Tally>>({});
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

  /** A listing with any locally-known tally applied over the server's copy. */
  const withVotes = useCallback(
    (l: Listing): Listing => {
      const t = tallies[l.listing_id];
      return t ? { ...l, likes: t.likes, dislikes: t.dislikes } : l;
    },
    [tallies],
  );

  /**
   * Cast `next` (1 / -1 / 0) on a listing. Applied optimistically so the button
   * responds at once, then replaced by the server's authoritative counts — and
   * rolled back if the call fails, since a like the server never recorded must
   * not keep showing as one.
   */
  const vote = useCallback(
    async (listing: Listing, next: number) => {
      const id = listing.listing_id;
      const prev = myVotes[id] ?? VOTE_NONE;
      if (prev === next) return;

      const base = tallies[id] ?? {
        likes: listing.likes ?? 0,
        dislikes: listing.dislikes ?? 0,
      };
      const optimistic: Tally = {
        likes: Math.max(0, base.likes + (next === 1 ? 1 : 0) - (prev === 1 ? 1 : 0)),
        dislikes: Math.max(0, base.dislikes + (next === -1 ? 1 : 0) - (prev === -1 ? 1 : 0)),
      };
      setTallies((t) => ({ ...t, [id]: optimistic }));
      setMyVotes((v) => ({ ...v, [id]: next }));
      setBusyId(id);
      try {
        const r = await voteListing(id, next);
        setTallies((t) => ({ ...t, [id]: { likes: r.likes, dislikes: r.dislikes } }));
        setMyVotes((v) => ({ ...v, [id]: r.my_vote }));
      } catch (e) {
        setTallies((t) => ({ ...t, [id]: base }));
        setMyVotes((v) => ({ ...v, [id]: prev }));
        onError?.(e instanceof Error ? e.message : "Couldn't record that vote.");
      } finally {
        setBusyId(null);
      }
    },
    [myVotes, tallies, onError],
  );

  return { myVotes, vote, votingId: busyId, withVotes };
}
