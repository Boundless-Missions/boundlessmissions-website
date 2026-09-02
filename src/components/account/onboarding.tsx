"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { claimUsername, setDisplayName, type Account } from "@/lib/account";

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?$/;

/**
 * The one-time step between signing in and having an account: pick a permanent
 * username, and a display name that can change later.
 *
 * The username warning is stated before the field rather than after a failure,
 * because there is no undo for this one — the whole point of a permanent handle is
 * that it cannot be swapped later to impersonate someone.
 */
export function Onboarding({ account, onDone }: { account: Account; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [display, setDisplay] = useState(account.display_name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = username.trim();
  const localProblem =
    trimmed.length === 0 ? null
    : trimmed.length < 3 ? "At least 3 characters."
    : trimmed.length > 20 ? "At most 20 characters."
    : !USERNAME_RE.test(trimmed)
      ? "Letters, numbers, hyphens and underscores; start and end with a letter or number."
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (localProblem) return;
    setBusy(true);
    setError(null);
    try {
      // Username first: it is the one that can fail on the server (taken,
      // reserved), and a display name saved before a rejected username would
      // leave the account half-set-up with no obvious way back.
      await claimUsername(trimmed);
      const wanted = display.trim();
      if (wanted && wanted !== account.display_name) await setDisplayName(wanted);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose your username</CardTitle>
        <CardDescription>One more step and your account is ready.</CardDescription>
      </CardHeader>

      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Username</span>
              <input
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="filter-input font-mono"
                placeholder="jebediah"
                aria-describedby="username-warning"
              />
            </label>

            <p id="username-warning"
               className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                This is permanent. It identifies you across the marketplace, contracts
                and auctions, and it can&apos;t be changed later.
              </span>
            </p>

            {localProblem && (
              <p className="text-xs text-destructive">{localProblem}</p>
            )}
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">
              Display name <span className="text-xs">shown to others, change it any time</span>
            </span>
            <input
              value={display}
              maxLength={32}
              onChange={(e) => setDisplay(e.target.value)}
              className="filter-input"
              placeholder="Jeb Kerman"
            />
          </label>

          <Button type="submit" disabled={busy || !!localProblem || !trimmed}
                  className="w-full gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Claim username
          </Button>

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
