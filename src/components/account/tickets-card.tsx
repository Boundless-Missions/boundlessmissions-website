"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, LifeBuoy, ArrowLeft, Send, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  fetchTickets, fetchTicket, openTicket, replyToTicket,
  type TicketSummary, type TicketThread,
} from "@/lib/account";
import { cn } from "@/lib/utils";

/**
 * Tickets refresh by polling, not by a live connection.
 *
 * A reply is a person typing a sentence — a few seconds late is invisible, and a
 * WebSocket per open account page is a real cost for that. The open thread polls
 * faster than the list because that is where someone is actually waiting for an
 * answer; the list only has to notice a dot appearing.
 */
const THREAD_POLL_MS = 6000;
const LIST_POLL_MS = 30000;

const KINDS: { value: string; label: string; hint: string }[] = [
  { value: "other", label: "Something else", hint: "Anything that isn't the two below." },
  { value: "user", label: "Report a user", hint: "Someone's behaviour, in game or in chat." },
  { value: "bug", label: "Report a bug", hint: "Something in the mod or the site is broken." },
];

function when(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

function errText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/**
 * Support tickets, from the website.
 *
 * A ticket is a private conversation between one player and the team. The team's
 * side of it happens in a Discord channel; this is the other side, and for a
 * player who never joined the Discord it is the only side they have.
 */
export function TicketsCard() {
  const [list, setList] = useState<TicketSummary[] | null>(null);
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await fetchTickets());
    } catch (e) {
      setError(errText(e, "Couldn't load your tickets."));
      setList([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep the list fresh while it is the thing on screen. Paused while a thread is
  // open — that view polls itself, and two timers asking the same question is
  // just noise.
  useEffect(() => {
    if (thread || composing) return;
    const t = setInterval(load, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [thread, composing, load]);

  // Refresh the open thread on a timer. A reply that arrives while the page is
  // open should appear, not wait for a reload.
  const openId = thread?.ticket.ticket_id;
  useEffect(() => {
    if (!openId) return;
    const t = setInterval(async () => {
      try {
        setThread(await fetchTicket(openId));
      } catch {
        /* a dropped poll is not worth a banner — the next one will do */
      }
    }, THREAD_POLL_MS);
    return () => clearInterval(t);
  }, [openId]);

  async function open(id: string) {
    setBusy(true);
    setError(null);
    try {
      setThread(await fetchTicket(id));
      // Reading clears the unread flag server-side; keep the list in step so the
      // badge doesn't linger behind the thread the user just read.
      setList((cur) => (cur ?? []).map((t) =>
        t.ticket_id === id ? { ...t, unread: false } : t));
    } catch (e) {
      setError(errText(e, "Couldn't open that ticket."));
    } finally {
      setBusy(false);
    }
  }

  if (composing) {
    return <Composer
      onCancel={() => setComposing(false)}
      onDone={async (t) => { setComposing(false); await load(); open(t.ticket_id); }} />;
  }

  if (thread) {
    return <Thread
      thread={thread}
      onBack={() => { setThread(null); load(); }}
      onReplied={async () => setThread(await fetchTicket(thread.ticket.ticket_id))} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5" /> Support
        </CardTitle>
        <CardDescription>
          Open a ticket and read replies here. No Discord needed.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {list === null ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t opened any tickets.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {list.map((t) => (
              <li key={t.ticket_id}>
                <button
                  onClick={() => open(t.ticket_id)}
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-md border border-border
                             bg-secondary/40 px-3 py-2.5 text-left transition-colors
                             hover:bg-secondary focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{t.title}</span>
                      {t.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary"
                              aria-label="new reply" />
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      #{String(t.number).padStart(4, "0")} · {when(t.updated_at || t.created_at)}
                    </span>
                  </span>
                  <Badge variant={t.status === "open" ? "default" : "secondary"}>
                    {t.status === "open" ? "Open" : "Closed"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Button className="w-fit gap-2" onClick={() => setComposing(true)}>
          <Plus className="h-4 w-4" /> New ticket
        </Button>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Composer({ onCancel, onDone }:
  { onCancel: () => void; onDone: (t: TicketSummary) => void }) {
  const [kind, setKind] = useState("other");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone(await openTicket(kind, title.trim(), body.trim()));
    } catch (err) {
      setError(errText(err, "Couldn't open that ticket."));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New ticket</CardTitle>
        <CardDescription>Only you and the team can see this.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm text-muted-foreground">What&apos;s it about?</legend>
            {KINDS.map((k) => (
              <label key={k.value}
                     className={cn("flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2",
                                   kind === k.value
                                     ? "border-primary/50 bg-primary/5"
                                     : "border-border hover:bg-secondary/50")}>
                <input type="radio" name="kind" value={k.value} checked={kind === k.value}
                       onChange={() => setKind(k.value)} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">{k.label}</span>
                  <span className="block text-xs text-muted-foreground">{k.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Subject</span>
            <input required maxLength={150} value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   className="filter-input" placeholder="Short summary" />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Details</span>
            <textarea required maxLength={4000} rows={6} value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="filter-input h-auto py-2 resize-y"
                      placeholder="What happened, and what you'd like us to do." />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || !title.trim() || !body.trim()}
                    className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Open ticket
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function Thread({ thread, onBack, onReplied }:
  { thread: TicketThread; onBack: () => void; onReplied: () => Promise<void> }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const closed = thread.ticket.status !== "open";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [thread.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await replyToTicket(thread.ticket.ticket_id, body.trim());
      setBody("");
      await onReplied();
    } catch (err) {
      setError(errText(err, "Couldn't send that."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <button onClick={onBack}
                className="flex w-fit items-center gap-1 text-xs text-muted-foreground
                           hover:text-foreground focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-ring rounded">
          <ArrowLeft className="h-3 w-3" /> All tickets
        </button>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {thread.ticket.title}
          <Badge variant={closed ? "secondary" : "default"}>
            {closed ? "Closed" : "Open"}
          </Badge>
        </CardTitle>
        <CardDescription>
          #{String(thread.ticket.number).padStart(4, "0")} · opened {when(thread.ticket.created_at)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1">
          {thread.description && (
            <Bubble kind="opener" name="You" body={thread.description}
                    at={thread.ticket.created_at} />
          )}
          {thread.messages.map((m) => (
            <Bubble key={m.message_id} kind={m.author_kind} name={m.author_name}
                    body={m.body} at={m.created_at} attachments={m.attachments} />
          ))}
          <div ref={endRef} />
        </div>

        {closed ? (
          <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
            This ticket is closed. Open a new one if you still need help.
          </p>
        ) : (
          <form className="flex flex-col gap-2" onSubmit={send}>
            <textarea
              rows={3} maxLength={4000} value={body}
              onChange={(e) => setBody(e.target.value)}
              className="filter-input h-auto py-2 resize-y"
              placeholder="Write a reply…"
            />
            <Button type="submit" disabled={busy || !body.trim()} className="w-fit gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </form>
        )}

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Bubble({ kind, name, body, at, attachments }: {
  kind: string; name: string; body: string; at: string;
  attachments?: { name: string; url: string }[];
}) {
  if (kind === "system") {
    return (
      <p className="self-center text-xs italic text-muted-foreground">{body}</p>
    );
  }
  const mine = kind === "opener";
  return (
    <div className={cn("flex max-w-[85%] flex-col gap-1 rounded-lg border px-3 py-2",
                       mine ? "self-end border-primary/30 bg-primary/5"
                            : "self-start border-border bg-secondary/40")}>
      <span className="text-xs text-muted-foreground">
        {mine ? "You" : name || "Boundless Missions team"} · {when(at)}
      </span>
      <span className="whitespace-pre-wrap break-words text-sm">{body}</span>
      {(attachments ?? []).length > 0 && (
        <ul className="flex flex-col gap-0.5 pt-1">
          {(attachments ?? []).map((a) => (
            <li key={a.url} className="truncate text-xs">
              {/* These are Discord CDN links the bot copied out of the ticket, so
                  today nothing attacker-settable reaches here — but the URL is
                  server-supplied and rendered straight into an href, which is one
                  upstream change away from a `javascript:` link. Require https
                  and render the name as plain text otherwise. */}
              {a.url.startsWith("https://") ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                   className="text-primary hover:underline">{a.name}</a>
              ) : (
                <span className="text-muted-foreground">{a.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
