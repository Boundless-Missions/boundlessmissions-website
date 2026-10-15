"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { startLink, pollLink } from "@/lib/marketplace";
import { notifySessionChanged } from "@/lib/session";

type Phase = "idle" | "starting" | "awaiting_approval" | "linked" | "error";

/**
 * Where the waiting approval is answered. A code from `/b linkcode` is approved in
 * the Discord DM the bot sends; a code minted on the account page is approved
 * there, and nothing stops one being pasted into this box. The server distinguishes
 * them in `approve_via`; an older bot sends nothing, and then both are named rather
 * than one guessed at — guessing Discord is what sent players with no Discord
 * looking for a DM that was never coming.
 */
type ApproveVia = "discord" | "panel" | "";

function ApprovalInstruction({ via }: { via: ApproveVia }) {
  if (via === "panel")
    return (
      <span>
        Waiting for you to press <strong>Yes, that&apos;s me</strong> on your account
        page…
      </span>
    );
  if (via === "discord")
    return (
      <span>
        Waiting for you to press <strong>✅ Log in</strong> in your Discord DM…
      </span>
    );
  return (
    <span>
      Waiting for you to approve this sign-in where you got the code.{" "}
      <strong>Yes, that&apos;s me</strong> on your account page, or{" "}
      <strong>✅ Log in</strong> in your Discord DM.
    </span>
  );
}

export function LinkAccount({ onLinked }: { onLinked: () => void }) {
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [approveVia, setApproveVia] = useState<ApproveVia>("");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  /** The session cookie was just set server-side; tell the header to re-read it. */
  function finish() {
    notifySessionChanged();
    onLinked();
  }

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function submit() {
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from Discord.");
      return;
    }
    setPhase("starting");
    try {
      const r = await startLink(code);
      if (r.status === "ok") {
        setPhase("linked");
        finish();
        return;
      }
      if (r.status === "approval_required" && r.challenge_id) {
        setApproveVia(r.approve_via ?? "");
        setPhase("awaiting_approval");
        beginPolling(r.challenge_id);
        return;
      }
      setError("Unexpected response. Try requesting a new code.");
      setPhase("error");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to link.");
      setPhase("error");
    }
  }

  function beginPolling(challengeId: string) {
    stopPolling();
    pollTimer.current = setInterval(async () => {
      try {
        const r = await pollLink(challengeId);
        if (r.status === "ok") {
          stopPolling();
          setPhase("linked");
          finish();
        }
        // "pending" → keep waiting.
      } catch (e) {
        stopPolling();
        setError(e instanceof Error ? e.message : "Approval failed.");
        setPhase("error");
      }
    }, 2000);
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Link your Discord account
        </CardTitle>
        <CardDescription>
          In Discord, run <code className="rounded bg-muted px-1">/b linkcode</code> and enter the
          6-digit code here. You may be asked to approve the login, in your Discord
          DM, or on your account page if that is where the code came from.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "awaiting_approval" ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <ApprovalInstruction via={approveVia} />
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="123456"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-center text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={submit} disabled={phase === "starting"}>
              {phase === "starting" ? <Loader2 className="animate-spin" /> : "Link"}
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
