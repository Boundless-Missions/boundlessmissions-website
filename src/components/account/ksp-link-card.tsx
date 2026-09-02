"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Gamepad2, ShieldCheck, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  requestKspCode, fetchKspPending, approveKspLink, type KspLinkPending,
} from "@/lib/account";

/** How often to ask whether a KSP client is waiting on us. */
const POLL_MS = 3000;

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Link a KSP install to this account.
 *
 * The half that matters is the approval. The code is typed into KSP, so the
 * confirmation deliberately lands back *here* — a code read out to someone over
 * chat still gets them nowhere, because they cannot press this button. It is also
 * the only route that works for an account with no Discord, which has no DM for
 * the older approval to arrive in.
 */
export function KspLinkCard() {
  const [code, setCode] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<KspLinkPending | null>(null);
  const [done, setDone] = useState<"approved" | "denied" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  const stopTimers = useCallback(() => {
    timers.current.forEach(clearInterval);
    timers.current = [];
  }, []);

  useEffect(() => stopTimers, [stopTimers]);

  async function getCode() {
    setBusy(true);
    setError(null);
    setDone(null);
    setPending(null);
    stopTimers();
    try {
      const r = await requestKspCode();
      setCode(r.code);
      setRemaining(r.expires_in);

      timers.current.push(setInterval(() => {
        setRemaining((n) => {
          if (n <= 1) {
            stopTimers();
            setCode(null);
            return 0;
          }
          return n - 1;
        });
      }, 1000));

      timers.current.push(setInterval(async () => {
        try {
          const p = await fetchKspPending();
          if (p.pending) {
            setPending(p);
            // The code has been used; only the approval is left to give.
            setCode(null);
            stopTimers();
          }
        } catch {
          /* a dropped poll is not worth showing — the next one will do */
        }
      }, POLL_MS));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get a code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(approve: boolean) {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await approveKspLink(pending.challenge_id, approve);
      setPending(null);
      setDone(approve ? "approved" : "denied");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't answer that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" /> Link your KSP install
        </CardTitle>
        <CardDescription>
          Get a code here, type it into the mod, then approve it on this page.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {pending ? (
          <div className="flex flex-col gap-3 rounded-md border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm">
              A KSP client just entered your code and wants to sign in as you.
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
              <dt>From IP</dt><dd className="text-foreground">{pending.client_ip || "unknown"}</dd>
              <dt>Device</dt><dd className="text-foreground">{pending.device_id || "unknown"}…</dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              If this isn&apos;t you, refuse it: someone else may have your code.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => answer(true)} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ShieldCheck className="h-4 w-4" />}
                Yes, that&apos;s me
              </Button>
              <Button size="sm" variant="secondary" disabled={busy}
                onClick={() => answer(false)} className="gap-2">
                <ShieldX className="h-4 w-4" /> Refuse
              </Button>
            </div>
          </div>
        ) : code ? (
          <div className="flex flex-col items-start gap-2">
            <span className="text-sm text-muted-foreground">
              Enter this in the mod&apos;s link window:
            </span>
            <code className="rounded-lg border border-border bg-secondary px-5 py-3
                             font-mono text-3xl tracking-[0.35em] tabular-nums">
              {code}
            </code>
            <span className="text-xs text-muted-foreground">
              Expires in {mmss(remaining)}, waiting for KSP…
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {done && (
              <p className={done === "approved"
                ? "rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
                : "rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"}>
                {done === "approved"
                  ? "KSP is linked. The game should carry on by itself."
                  : "Request refused. Nothing was linked."}
              </p>
            )}
            <Button onClick={getCode} disabled={busy} className="w-fit gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Get a link code
            </Button>
            <p className="text-xs text-muted-foreground">
              Already in our Discord? <code className="font-mono">/b linkcode</code> there
              still works too.
            </p>
          </div>
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
