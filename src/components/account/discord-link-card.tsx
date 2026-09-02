"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requestDiscordCode, type Account } from "@/lib/account";

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Join this website account to a Discord account.
 *
 * The code goes the other way from the KSP one: minted here, typed into Discord.
 * Being signed in here proves the Google/email side; running the slash command
 * there proves the Discord side. Discord names this account back to you before it
 * links anything, so entering someone else's code cannot quietly hand them your
 * Discord identity.
 */
export function DiscordLinkCard({ account, onChanged }:
  { account: Account; onChanged: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  // While a code is live, the link may complete at any moment in Discord — and
  // the only way this page finds out is by asking.
  useEffect(() => {
    if (!code) return;
    const poll = setInterval(onChanged, 4000);
    return () => clearInterval(poll);
  }, [code, onChanged]);

  if (account.has_discord) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Discord
          </CardTitle>
          <CardDescription>Your Discord account is linked to this one.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10
                        px-3 py-2 text-sm text-primary">
            <Check className="h-4 w-4" />
            Linked{account.discord_id ? ` · ${account.discord_id}` : ""}
          </p>
        </CardContent>
      </Card>
    );
  }

  async function getCode() {
    setBusy(true);
    setError(null);
    stop();
    try {
      const r = await requestDiscordCode();
      setCode(r.code);
      setRemaining(r.expires_in);
      timer.current = setInterval(() => {
        setRemaining((n) => {
          if (n <= 1) { stop(); setCode(null); return 0; }
          return n - 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get a code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Link Discord
        </CardTitle>
        <CardDescription>
          Use one account for both. Optional: everything works without it.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {code ? (
          <div className="flex flex-col items-start gap-2">
            <span className="text-sm text-muted-foreground">
              In Discord, run <code className="font-mono">/b account</code> → <b>Link a
              website account</b>, and enter:
            </span>
            <code className="rounded-lg border border-border bg-secondary px-5 py-3
                             font-mono text-3xl tracking-[0.35em] tabular-nums">
              {code}
            </code>
            <span className="text-xs text-muted-foreground">
              Expires in {mmss(remaining)}. Discord will show you this account
              before linking, so check the name matches.
            </span>
          </div>
        ) : (
          <Button onClick={getCode} disabled={busy} className="w-fit gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Get a Discord link code
          </Button>
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
