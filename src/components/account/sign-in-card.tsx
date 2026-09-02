"use client";

import { useState } from "react";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  resetPassword,
  completeTotp,
  describeAuthError,
  type SignInResult,
} from "@/lib/auth";

type Mode = "choose" | "email" | "register" | "reset" | "totp";

/** Google's mark, inlined — the CSP admits no external images. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l-.1.3 6.5 5 .5.1c4.1-3.8 6.6-9.4 6.6-15.7z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3.1-6.8 5.2-.1.3C7.9 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-.3l-6.9-5.4-.2.1C2.9 17 2 20.4 2 24s.9 7 2.4 10l7.1-5.6z" />
      <path fill="#EA4335" d="M24 10.4c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.1 29.9 2 24 2 15.4 2 7.9 7 4.4 14l7.1 5.6c1.8-5.3 6.7-9.2 12.5-9.2z" />
    </svg>
  );
}

export function SignInCard({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Set when the server stops sign-in for a second factor. Carries no authority
  // of its own — the token is only issued once the code checks out.
  const [challenge, setChallenge] = useState("");
  const [totpCode, setTotpCode] = useState("");

  /** A sign-in either finished or needs a code. */
  function settle(r: SignInResult) {
    if (r.status === "totp_required" && r.challenge_id) {
      setChallenge(r.challenge_id);
      setTotpCode("");
      setMode("totp");
      return;
    }
    onSignedIn();
  }

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  const google = () => run(async () => {
    settle(await signInWithGoogle());
  });

  const emailIn = () => run(async () => {
    settle(await signInWithEmail(email.trim(), password));
  });

  const register = () => run(async () => {
    await registerWithEmail(email.trim(), password);
    setNotice(
      `We've sent a verification link to ${email.trim()}. Open it, then sign in.`);
    setMode("email");
    setPassword("");
  });

  const totp = () => run(async () => {
    await completeTotp(challenge, totpCode.trim());
    onSignedIn();
  });

  const reset = () => run(async () => {
    await resetPassword(email.trim());
    setNotice("If there's an account with that address, a reset link is on its way.");
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "register" ? "Create an account"
            : mode === "reset" ? "Reset your password"
            : mode === "totp" ? "Two-factor code"
            : "Sign in"}
        </CardTitle>
        <CardDescription>
          {mode === "register"
            ? "You'll pick a username once you're in."
            : mode === "reset"
            ? "We'll email you a link to set a new one."
            : mode === "totp"
            ? "One more step: your account has two-factor turned on."
            : "Use Google or an email address. You don't need Discord."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {mode === "choose" && (
          <>
            <Button onClick={google} disabled={busy} className="w-full gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="secondary" onClick={() => go("email")} disabled={busy}
                    className="w-full gap-2">
              <Mail className="h-4 w-4" />
              Continue with email
            </Button>
          </>
        )}

        {mode === "totp" && (
          <form className="flex flex-col gap-3"
                onSubmit={(e) => { e.preventDefault(); totp(); }}>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app, or one of your
              recovery codes.
            </p>
            <input
              autoFocus inputMode="numeric" autoComplete="one-time-code"
              maxLength={12} required value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              className="filter-input font-mono tracking-[0.3em]"
              placeholder="123456" aria-label="Authentication code"
            />
            <Button type="submit" disabled={busy || !totpCode.trim()} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
            <button type="button" onClick={() => { setChallenge(""); go("choose"); }}
                    className="inline-flex w-fit items-center gap-1 text-xs
                               text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Start over
            </button>
          </form>
        )}

        {mode !== "choose" && mode !== "totp" && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "email") emailIn();
              else if (mode === "register") register();
              else reset();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="filter-input"
                placeholder="you@example.com"
              />
            </label>

            {mode !== "reset" && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Password</span>
                <input
                  type="password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="filter-input"
                  placeholder={mode === "register" ? "At least 6 characters" : ""}
                />
              </label>
            )}

            <Button type="submit" disabled={busy} className="mt-1 w-full gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "email" ? "Sign in"
                : mode === "register" ? "Create account"
                : "Send reset link"}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button type="button" onClick={() => go("choose")}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              {mode === "email" && (
                <span className="flex gap-3">
                  <button type="button" onClick={() => go("register")}
                          className="text-primary hover:underline">Create an account</button>
                  <button type="button" onClick={() => go("reset")}
                          className="text-muted-foreground hover:text-foreground">
                    Forgot password?
                  </button>
                </span>
              )}
              {mode !== "email" && (
                <button type="button" onClick={() => go("email")}
                        className="text-primary hover:underline">
                  I already have an account
                </button>
              )}
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
