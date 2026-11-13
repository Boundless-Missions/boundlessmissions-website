"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Plus, ServerCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTALL_COMMAND, claimPairing, lookupPairing, type PairingHost } from "@/lib/mp-servers";

/**
 * Add a server: run one command on a VPS, then confirm the pairing code it shows.
 *
 * The code identifies the machine that is ASKING; confirming attaches that
 * machine to this account and the bot hands its credential straight to the
 * installer (data/mp_pairing.py). So the owner sees which machine it is — its
 * hostname, OS and public address — before confirming, and never handles the
 * credential themselves.
 */
export function AddServerCard({ onPaired }: { onPaired: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [host, setHost] = useState<PairingHost | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the command is visible to select by hand */
    }
  };

  const lookup = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await lookupPairing(code);
      setHost(r.host);
      setName(r.host.name_hint || r.host.hostname || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code is not valid.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await claimPairing(code, name.trim());
      setDone(`Paired "${r.name}". The installer on the server carries on by itself — it appears below once it is running.`);
      setHost(null);
      setCode("");
      onPaired();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't pair that server.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setOpen(true); setDone(null); }}>
          <Plus /> Add a server
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ServerCog className="h-5 w-5" /> Add a server
        </CardTitle>
        <CardDescription>
          On a fresh Debian or Ubuntu VPS (1 GB RAM is enough), run this as root. It checks the
          machine, shows a pairing code, and installs everything once you confirm the code here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-stretch gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-border bg-background px-3 py-2 text-xs">
            {INSTALL_COMMAND}
          </code>
          <Button size="sm" variant="outline" onClick={() => void copy()} aria-label="Copy the command">
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {!host ? (
          <form className="flex flex-wrap gap-2"
                onSubmit={(e) => { e.preventDefault(); if (code.trim()) void lookup(); }}>
            <input
              value={code} onChange={(e) => setCode(e.target.value)} maxLength={9}
              placeholder="Pairing code, e.g. 7KQ2-M9XD" aria-label="Pairing code"
              autoCapitalize="characters" spellCheck={false}
              className="h-9 w-56 rounded-md border border-border bg-transparent px-3 font-mono text-sm uppercase"
            />
            <Button type="submit" size="sm" disabled={busy || !code.trim()}>
              {busy && <Loader2 className="animate-spin" />} Find server
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); setError(null); }}>
              Cancel
            </Button>
          </form>
        ) : (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm">This machine is asking to join your account:</p>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Host name</dt><dd>{host.hostname || "—"}</dd>
              <dt className="text-muted-foreground">System</dt><dd>{host.os || "—"}</dd>
              <dt className="text-muted-foreground">Public address</dt><dd className="font-mono">{host.public_ip || "—"}</dd>
              {host.observed_ip && host.observed_ip !== host.public_ip && (
                <>
                  <dt className="text-muted-foreground">Seen from</dt>
                  <dd className="font-mono">{host.observed_ip}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Type</dt>
              <dd>{host.server_type === "full_combat" ? "Full Combat (1x, combat on)" : "Standard (timewarp)"}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              Only confirm if that is your server. Pairing gives it an identity under your account.
            </p>
            <form className="flex flex-wrap gap-2"
                  onSubmit={(e) => { e.preventDefault(); void confirm(); }}>
              <input
                value={name} onChange={(e) => setName(e.target.value)} maxLength={48}
                placeholder="Server name" aria-label="Server name"
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 text-sm"
              />
              <Button type="submit" size="sm" disabled={busy || !name.trim()}>
                {busy && <Loader2 className="animate-spin" />} Pair this server
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setHost(null)}>
                Back
              </Button>
            </form>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-muted-foreground">{done}</p>}
      </CardContent>
    </Card>
  );
}
