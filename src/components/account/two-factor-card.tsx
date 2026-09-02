"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff, KeyRound, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  fetch2fa, begin2fa, confirm2fa, disable2fa, regenerateRecoveryCodes,
  type TwoFactorStatus,
} from "@/lib/account";
import { reauthenticate } from "@/lib/auth";

function errText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/** Group a base32 secret into fours — nobody transcribes 32 unbroken characters. */
function grouped(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? []).join(" ");
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button" size="sm" variant="secondary" className="gap-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard can be blocked; the text is on screen either way */
        }
      }}
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {done ? "Copied" : label}
    </Button>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
      <p className="text-sm font-medium text-amber-500">
        Save these recovery codes now. This is the only time they&apos;re shown.
      </p>
      <p className="text-xs text-muted-foreground">
        Each works once, and they&apos;re the way back in if you lose your phone.
      </p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <CopyButton text={codes.join("\n")} label="Copy all" />
    </div>
  );
}

/**
 * Two-factor authentication.
 *
 * Offered to everyone, not just accounts without a Discord: the DM-approval
 * factor is a real check but fails outright for anyone with DMs closed, and has
 * never existed for a website account at all.
 *
 * Three ways in, because a phone camera is not always an option: scan the QR,
 * tap the link (which opens the app directly on a phone), or type the key.
 */
export function TwoFactorCard() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr_svg: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"idle" | "disabling" | "regenerating">("idle");
  const [busy, setBusy] = useState(false);
  // Shown only when the account signs in with a password: a popup cannot re-prove
  // that credential, so we ask for it here rather than failing with an auth error.
  const [pwOpen, setPwOpen] = useState(false);
  const [pwEmail, setPwEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetch2fa());
    } catch {
      setStatus({ enabled: false, pending: false, recovery_remaining: 0 });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function reset() {
    setSetup(null); setCode(""); setMode("idle");
    setError(null); setNotice(null);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); }
    catch (e) { setError(errText(e, "That didn't work. Try again.")); }
    finally { setBusy(false); }
  }

  // Turning a factor on re-proves the primary credential first: a borrowed
  // signed-in browser must not be able to enrol its own authenticator and lock the
  // real owner out. *Which* credential differs by account, and guessing it wrong is
  // a dead end rather than an inconvenience — a Discord account has no Firebase
  // identity to prove and must not be asked for one, and a password account cannot
  // answer a Google popup. The server says which (`status.reauth`).
  const beginEnrolment = async (email?: string, password?: string) => {
    const idToken = status?.reauth ? await reauthenticate(email, password) : "";
    setSetup(await begin2fa(idToken));
    setPwOpen(false); setPw(""); setPwEmail("");
  };

  const start = () => {
    setCodes(null);
    if (status?.reauth === "password") { setPwOpen(true); setError(null); return; }
    run(() => beginEnrolment());
  };

  const confirm = () => run(async () => {
    const r = await confirm2fa(code.trim());
    setSetup(null); setCode("");
    setCodes(r.recovery_codes ?? []);
    setNotice(r.message);
    await load();
  });

  const submitCode = () => run(async () => {
    if (mode === "disabling") {
      const r = await disable2fa(code.trim());
      setNotice(r.message); setCodes(null);
    } else {
      const r = await regenerateRecoveryCodes(code.trim());
      setNotice(r.message); setCodes(r.recovery_codes ?? []);
    }
    setCode(""); setMode("idle");
    await load();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {status?.enabled
            ? <ShieldCheck className="h-5 w-5 text-primary" />
            : <ShieldOff className="h-5 w-5" />}
          Two-factor authentication
          {status?.enabled && <Badge>On</Badge>}
        </CardTitle>
        <CardDescription>
          {status?.enabled
            ? "A code from your authenticator app is required to sign in."
            : "Add a code from an authenticator app on top of your password."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {status === null && (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {/* ── setting it up ── */}
        {setup && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Scan this with your authenticator app, then enter the 6-digit code it
              shows. Can&apos;t scan? Use the key below.
            </p>

            {setup.qr_svg && (
              // The SVG is generated by our own server from our own URI (segno,
              // server-side) — no script, no external references — so inlining it
              // needs no QR library in the bundle and no CSP change. White plate
              // behind it because a QR on a dark ground scans badly: the quiet
              // zone and the light modules are part of the code, not decoration.
              <div
                className="w-fit rounded-lg bg-white p-3"
                aria-label="Two-factor setup QR code"
                dangerouslySetInnerHTML={{ __html: setup.qr_svg }}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Or enter this key by hand:
            </p>
            <code className="select-all break-all rounded-md border border-border
                             bg-secondary px-3 py-2 font-mono text-sm tracking-wide">
              {grouped(setup.secret)}
            </code>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={setup.secret} label="Copy key" />
              <Button asChild size="sm" variant="secondary">
                <a href={setup.uri}>Open in authenticator app</a>
              </Button>
            </div>
            <form className="flex flex-wrap gap-2"
                  onSubmit={(e) => { e.preventDefault(); confirm(); }}>
              <input
                inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value)}
                className="filter-input max-w-[9rem] font-mono tracking-[0.3em]"
                placeholder="123456" aria-label="6-digit code"
              />
              <Button type="submit" disabled={busy || code.trim().length < 6}
                      className="gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Turn on
              </Button>
              <Button type="button" variant="secondary" onClick={reset} disabled={busy}>
                Cancel
              </Button>
            </form>
          </div>
        )}

        {/* ── confirming a destructive change ── */}
        {mode !== "idle" && (
          <form className="flex flex-col gap-2"
                onSubmit={(e) => { e.preventDefault(); submitCode(); }}>
            <p className="text-sm text-muted-foreground">
              {mode === "disabling"
                ? "Enter a current code to turn two-factor off."
                : "Enter a current code to replace your recovery codes."}
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                inputMode="numeric" autoComplete="one-time-code" maxLength={12}
                value={code} onChange={(e) => setCode(e.target.value)}
                className="filter-input max-w-[11rem] font-mono tracking-widest"
                placeholder="123456" aria-label="code"
              />
              <Button type="submit" disabled={busy || !code.trim()}
                      variant={mode === "disabling" ? "destructive" : "default"}
                      className="gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "disabling" ? "Turn off" : "Regenerate"}
              </Button>
              <Button type="button" variant="secondary" onClick={reset} disabled={busy}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {codes && <RecoveryCodes codes={codes} />}

        {/* ── the resting state ── */}
        {status !== null && !setup && mode === "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            {status.enabled ? (
              <>
                <Button size="sm" variant="secondary" className="gap-2"
                        onClick={() => { reset(); setMode("regenerating"); }}>
                  <KeyRound className="h-4 w-4" />
                  New recovery codes
                </Button>
                <Button size="sm" variant="secondary"
                        onClick={() => { reset(); setMode("disabling"); }}>
                  Turn off
                </Button>
                <span className="text-xs text-muted-foreground">
                  {status.recovery_remaining} recovery code
                  {status.recovery_remaining === 1 ? "" : "s"} left
                </span>
              </>
            ) : (
              <Button size="sm" onClick={start} disabled={busy} className="gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Set up two-factor
              </Button>
            )}
          </div>
        )}

        {pwOpen && (
          <form
            className="space-y-2 rounded-md border border-border bg-muted/30 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => beginEnrolment(pwEmail.trim(), pw));
            }}
          >
            <p className="text-sm text-muted-foreground">
              Confirm your password to turn on two-factor authentication.
            </p>
            <input
              type="email"
              autoComplete="username"
              placeholder="Email"
              value={pwEmail}
              onChange={(e) => setPwEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" type="submit" disabled={busy || !pwEmail.trim() || !pw}>
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => { setPwOpen(false); setPw(""); setError(null); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {notice && (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {notice}
          </p>
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
