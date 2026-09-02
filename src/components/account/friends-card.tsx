"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  declineAllFriendRequests,
  fetchFriends,
  friendAction,
  requestFriend,
  type Friend,
  type FriendList,
} from "@/lib/friends";
import { type Account } from "@/lib/account";

/**
 * Friends, and the requests waiting in both directions.
 *
 * This is the counterpart of the KSP mod's Friends panel and exists for one reason
 * above all: a friendship gates quicksend — the mod refuses to hand a craft to
 * anyone else, and for a live vessel that hand-over removes the ship from the
 * sender's save — so a request sent from inside the game must be answerable by
 * someone who does not have KSP open.
 *
 * Adding is by username only. An account id is something a picker holds, and this
 * page has no player roster to pick from; a name someone told you is the whole
 * interface. Which is also why the card is drawn only once the account has claimed
 * its own username: until then there is nothing for anyone to add back.
 */
export function FriendsCard({ account }: { account: Account }) {
  const [data, setData] = useState<FriendList | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmingDeclineAll, setConfirmingDeclineAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchFriends());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // One path for every mutation: the reply shape is identical and a refusal is
  // usually "that is no longer there" — which means this list is what is stale, so
  // it reloads either way.
  async function run(action: () => Promise<{ success: boolean; message: string }>) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await action();
      setNotice({ ok: res.success, message: res.message });
      if (res.success) setName("");
    } catch (e) {
      setNotice({ ok: false, message: e instanceof Error ? e.message : "That didn't work." });
    } finally {
      setBusy(false);
      void load();
    }
  }

  if (!account.username) return null;

  const incoming = data?.incoming ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Friends
        </CardTitle>
        <CardDescription>
          Players you can send craft to in KSP. It works both ways once they accept, across
          Discord servers, and with players who only have a Boundless account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) void run(() => requestFriend(name.trim()));
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Their Boundless username"
            aria-label="Boundless username"
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 text-sm"
          />
          <Button type="submit" size="sm" disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add
          </Button>
        </form>

        {notice && (
          <p className={`text-sm ${notice.ok ? "text-primary" : "text-destructive"}`}>
            {notice.message}
          </p>
        )}

        {loading && !data ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : (
          <>
            {/* Requests first: a friend list is a reference, an unanswered request
                is a task. */}
            {/* Offered only from two upwards: with one request waiting, "Decline
                all" is the button already in the row, under a name that hides
                which one it turns down. Its reason for existing starts at a
                stuffed inbox — the server caps incoming requests and then refuses
                every new one, so a flood locks the account out of friendships it
                wants, and clearing it a pair at a time is a call each. */}
            <Group title={`Requests for you (${incoming.length})`} hideWhenEmpty
                   rows={incoming}
                   action={incoming.length > 1 ? (
                     <Button size="sm" variant="ghost" disabled={busy}
                             onClick={() => setConfirmingDeclineAll(true)}>
                       Decline all
                     </Button>
                   ) : undefined}>
              {(f) => (
                <>
                  <Button size="sm" disabled={busy}
                          onClick={() => void run(() => friendAction(f.user_id, "accept"))}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy}
                          onClick={() => void run(() => friendAction(f.user_id, "decline"))}>
                    Decline
                  </Button>
                </>
              )}
            </Group>

            <Group title={`Waiting on them (${data?.outgoing?.length ?? 0})`} hideWhenEmpty
                   rows={data?.outgoing ?? []}>
              {(f) => (
                /* "Cancel" rather than "Decline" for the same edit on the server:
                   withdrawing your own request and turning down someone else's are
                   one operation, and only the word differs. */
                <Button size="sm" variant="ghost" disabled={busy}
                        onClick={() => void run(() => friendAction(f.user_id, "decline"))}>
                  Cancel
                </Button>
              )}
            </Group>

            <Group title={`Friends (${data?.friends?.length ?? 0})`} rows={data?.friends ?? []}
                   empty="No friends yet. Add one above, and they can send you craft as soon as they accept.">
              {(f) => (
                <Button size="sm" variant="ghost" disabled={busy}
                        onClick={() => void run(() => friendAction(f.user_id, "remove"))}>
                  Remove
                </Button>
              )}
            </Group>
          </>
        )}
      </CardContent>

      {confirmingDeclineAll && (
        <ConfirmDialog
          title="Decline all requests?"
          description={
            <>
              Turn down all {incoming.length} pending requests at once. Nobody is told, and
              anyone can ask again — but there is no undo from here, so a request you meant
              to accept has to be sent a second time.
            </>
          }
          confirmLabel="Decline all"
          destructive
          busy={busy}
          onConfirm={() => {
            // Closed on completion rather than on the click, so the dialog carries
            // the spinner and a second press can't fire it twice. `run` reports the
            // server's own count and reloads the list either way.
            void run(declineAllFriendRequests).finally(() => setConfirmingDeclineAll(false));
          }}
          onCancel={() => setConfirmingDeclineAll(false)}
        />
      )}
    </Card>
  );
}

function Group({
  title,
  rows,
  empty,
  hideWhenEmpty,
  action,
  children,
}: {
  title: string;
  rows: Friend[];
  empty?: string;
  hideWhenEmpty?: boolean;
  /** Optional control for the whole group, drawn beside its heading. */
  action?: React.ReactNode;
  children: (f: Friend) => React.ReactNode;
}) {
  if (hideWhenEmpty && rows.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {action}
      </div>
      <div className="divide-y divide-border rounded-md border border-border">
        {rows.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows.map((f) => (
            <div key={f.user_id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.name}</span>
                {f.username && (
                  <span className="block truncate text-xs text-muted-foreground">@{f.username}</span>
                )}
              </span>
              {!!f.level && (
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5
                                 text-[11px] font-medium text-muted-foreground">
                  Lv {f.level}
                </span>
              )}
              {children(f)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
