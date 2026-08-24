"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Gavel, Clock, AlertTriangle, Gamepad2, Flag } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LinkAccount } from "@/components/marketplace/link-account";
import { ReportDialog } from "@/components/report-dialog";
import {
  fetchContracts,
  acceptContract,
  cancelContract,
  giveUpContract,
  reviewContract,
  disputeContract,
  answerSettle,
  answerMoreTime,
  reportContract,
  openSubmitInKsp,
  formatInstant,
  tomorrow,
  STATUS_LABELS,
  type Contract,
} from "@/lib/contracts";
import { cn } from "@/lib/utils";

/** Contracts that still need something from somebody, newest first. */
const OPEN = new Set(["pending", "active", "submitted", "disputed", "mod_review"]);

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 text-amber-500",
  active: "border-emerald-500/40 text-emerald-500",
  submitted: "border-blue-500/40 text-blue-500",
  disputed: "border-red-500/40 text-red-500",
  mod_review: "border-purple-500/40 text-purple-500",
  completed: "border-sky-500/40 text-sky-500",
};

type Tab = "open" | "done";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("open");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await fetchContracts();
      setSignedIn(list !== null);
      setContracts(list ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSignedIn(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = (contracts ?? []).filter((c) =>
    tab === "open" ? OPEN.has(c.status) : !OPEN.has(c.status),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 py-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">My Contracts</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Everything you have issued or accepted. Submitting work still happens in KSP,
          because it needs telemetry and a screenshot from the running game.
        </p>

        {signedIn === null ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !signedIn ? (
          <div className="py-8">
            <LinkAccount onLinked={load} />
          </div>
        ) : (
          <>
            <div className="mb-6 flex gap-2">
              {(["open", "done"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    tab === t
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "open" ? "Open" : "Finished"}
                </button>
              ))}
            </div>

            {error && (
              <p className="mb-4 flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            )}

            {shown.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">
                {tab === "open"
                  ? "No open contracts. Write one here or from inside KSP."
                  : "Nothing finished yet."}
              </p>
            ) : (
              <div className="space-y-4">
                {shown.map((c) => (
                  <ContractCard key={c.contract_id} contract={c} onActed={load} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ContractCard({ contract: c, onActed }: { contract: Contract; onActed: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [pickingDate, setPickingDate] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  /**
   * A refused action comes back as `success: false` with a sentence worth reading, so
   * it is shown in place rather than thrown away — only a transport failure is an error.
   */
  async function run(key: string, fn: () => Promise<{ success: boolean; message: string }>) {
    setBusy(key);
    setNote(null);
    try {
      const r = await fn();
      setNote(r.message);
      if (r.success) onActed();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setConfirming(null);
      setPickingDate(false);
    }
  }

  /** Two-click confirm for anything that costs money or cannot be undone. */
  function danger(key: string, label: string, confirmLabel: string, fn: () => void) {
    return confirming === key ? (
      <Button key={key} size="sm" variant="secondary" disabled={busy !== null} onClick={fn}>
        {busy === key && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
        {confirmLabel}
      </Button>
    ) : (
      <Button key={key} size="sm" variant="outline" disabled={busy !== null}
              onClick={() => setConfirming(key)}>
        {label}
      </Button>
    );
  }

  const id = c.contract_id;
  const req = c.pending_request;
  const actions: React.ReactNode[] = [];
  let extra: React.ReactNode = null;

  if (c.status === "pending") {
    if (c.is_outgoing) {
      actions.push(danger("cancel", "Withdraw offer", "Confirm withdraw", () =>
        run("cancel", () => cancelContract(id))));
    } else {
      actions.push(
        <Button key="accept" size="sm" disabled={busy !== null}
                onClick={() => run("accept", () => acceptContract(id))}>
          {busy === "accept" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Accept
        </Button>,
        danger("decline", "Decline", "Confirm decline", () =>
          run("decline", () => cancelContract(id))),
      );
    }
  } else if (c.status === "active" && !c.is_outgoing) {
    actions.push(
      // Not a submission — the page has no telemetry and no screenshot. This asks the
      // running game to offer its submit window, which the player accepts in KSP.
      <Button key="submit" size="sm" disabled={busy !== null}
              onClick={() => run("submit", () => openSubmitInKsp(id))}>
        {busy === "submit"
          ? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          : <Gamepad2 className="mr-1 h-4 w-4" />}
        Submit in KSP
      </Button>,
      danger("give_up", "Give up", `Confirm: you pay the ${c.fine.toLocaleString()} fine`, () =>
        run("give_up", () => giveUpContract(id))),
    );
  } else if (c.status === "submitted" && c.is_outgoing) {
    actions.push(
      <Button key="approve" size="sm" disabled={busy !== null}
              onClick={() => run("approve", () => reviewContract(id, true))}>
        {busy === "approve" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
        Approve
      </Button>,
      danger("refuse", "Refuse", "Confirm refuse", () =>
        run("refuse", () => reviewContract(id, false))),
    );
  } else if (c.status === "disputed") {
    if (c.is_outgoing) {
      if (req) {
        actions.push(
          <Button key="req_yes" size="sm" disabled={busy !== null}
                  onClick={() => run("req_yes", () =>
                    req.kind === "settle" ? answerSettle(id, true) : answerMoreTime(id, true))}>
            {busy === "req_yes" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Approve request
          </Button>,
          <Button key="req_no" size="sm" variant="outline" disabled={busy !== null}
                  onClick={() => run("req_no", () =>
                    req.kind === "settle" ? answerSettle(id, false) : answerMoreTime(id, false))}>
            Refuse request
          </Button>,
        );
      }
      // Dropping the refusal is the one exit from a dispute that favours the
      // contractor, so it is offered whether or not a request is outstanding.
      actions.push(
        <Button key="accept_anyway" size="sm" variant="outline" disabled={busy !== null}
                onClick={() => run("accept_anyway", () => reviewContract(id, true))}>
          {busy === "accept_anyway" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Accept the submission after all
        </Button>,
      );
    } else if (!req) {
      actions.push(
        <Button key="settle" size="sm" variant="outline" disabled={busy !== null}
                onClick={() => run("settle", () => disputeContract(id, "settle"))}>
          Settle
        </Button>,
      );
      if (!c.more_time_used) {
        actions.push(
          <Button key="more_time" size="sm" variant="outline" disabled={busy !== null}
                  onClick={() => {
                    // A bot issuer has nobody to ask, so it extends on its own
                    // schedule and the picker would be a decision with no effect.
                    if (c.is_bot_issued) run("more_time", () => disputeContract(id, "more_time"));
                    else setPickingDate((v) => !v);
                  }}>
            {busy === "more_time" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Ask for more time
          </Button>,
        );
      }
      actions.push(
        danger("pay_fine", "Pay the fine", `Confirm: ${c.fine.toLocaleString()} KCoins`, () =>
          run("pay_fine", () => disputeContract(id, "pay_fine"))),
        danger("sue", "Sue", "Confirm: send to moderators", () =>
          run("sue", () => disputeContract(id, "sue"))),
      );

      // Its own small form under the buttons rather than an input wedged between
      // them, because picking a date is part of an action, not an action itself.
      extra = pickingDate ? (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <label className="block text-xs font-medium" htmlFor={`d-${id}`}>New due date</label>
          <p className="mt-1 text-xs text-muted-foreground">
            You get one extension request per dispute, so pick carefully. {c.issuer_name} still
            has to agree to it.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input id={`d-${id}`} type="date" value={newDate} min={tomorrow()}
                   onChange={(e) => setNewDate(e.target.value)}
                   className="h-8 rounded-md border border-border bg-transparent px-2 text-xs" />
            <Button size="sm" disabled={busy !== null || !newDate}
                    onClick={() => run("more_time", () =>
                      disputeContract(id, "more_time", newDate))}>
              {busy === "more_time" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Send request
            </Button>
            <Button size="sm" variant="ghost" disabled={busy !== null}
                    onClick={() => setPickingDate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null;
    }
  }

  // Reporting is not a contract action and so is not in `actions`: it sits apart from
  // the row, is offered in every state (an abusive mission text is still abusive after
  // the contract is finished), and never for a weekly mission — the bot has no
  // counterparty a moderator could talk to, and the server refuses it anyway.
  const canReport = !c.is_bot_issued;
  const otherParty = c.is_outgoing ? c.contractor_name : c.issuer_name;

  async function sendReport(reason: string) {
    setReportBusy(true);
    setReportError(null);
    try {
      const r = await reportContract(id, reason);
      setReporting(false);
      setNote(r.message);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : String(e));
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{c.mission}</p>
            <p className="text-xs text-muted-foreground">
              {c.is_outgoing ? `to ${c.contractor_name}` : `from ${c.issuer_name}`}
              {" · "}due {c.due_date}
            </p>
          </div>
          <Badge variant="outline" className={cn(STATUS_STYLES[c.status])}>
            {STATUS_LABELS[c.status] ?? c.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>Payment {c.payment.toLocaleString()}</span>
          <span>Fine {c.fine.toLocaleString()}</span>
          {c.is_bot_issued && <span>Weekly mission</span>}
        </div>

        {/* Who is actually being waited on. A disputed contract with an open request is
            waiting on the issuer, not on the contractor, and saying otherwise sends
            people looking for a button that is not theirs. */}
        {req && (
          <p className="flex items-start gap-2 text-sm">
            <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {c.is_outgoing
              ? req.kind === "settle"
                ? `${c.contractor_name} asks to settle: no payment, no fine.`
                : `${c.contractor_name} asks to move the deadline to ${req.new_date}.`
              : req.kind === "settle"
                ? `Waiting for ${c.issuer_name} to answer your settlement request.`
                : `Waiting for ${c.issuer_name} to answer your extension request (${req.new_date}).`}
          </p>
        )}

        {c.status === "submitted" && !c.is_outgoing && (
          <p className="text-sm text-muted-foreground">
            Waiting for {c.issuer_name} to review your submission.
          </p>
        )}
        {c.status === "active" && !c.is_outgoing && (
          <p className="text-sm text-muted-foreground">
            Submitting happens in KSP. The button below asks your running game to open
            the submit window for this contract.
          </p>
        )}
        {c.status === "mod_review" && (
          <p className="text-sm text-muted-foreground">
            Escalated: moderators are reviewing this case on Discord.
          </p>
        )}

        {actions.length > 0 && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        {extra}

        {c.status === "disputed" && c.auto_fine_at && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Unresolved disputes settle themselves: the {c.fine.toLocaleString()} KCoin fine is
            collected automatically on {formatInstant(c.auto_fine_at)}.
          </p>
        )}
        {confirming && (
          <p className="text-xs text-muted-foreground">Click again to confirm.</p>
        )}
        {note && <p className="text-sm">{note}</p>}

        {canReport && (
          <div className="flex justify-end border-t border-border pt-2">
            <button
              onClick={() => { setReportError(null); setReporting(true); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              <Flag className="h-3.5 w-3.5" />
              Report {otherParty}
            </button>
          </div>
        )}

        {reporting && (
          <ReportDialog
            title="Report this contract"
            subject={
              <>
                <span className="font-medium text-foreground">{otherParty}</span>
                {c.is_outgoing ? " — the contractor on " : " — the issuer of "}
                &ldquo;{c.mission.length > 80 ? c.mission.slice(0, 80) + "…" : c.mission}&rdquo;
              </>
            }
            prompt="What went wrong?"
            placeholder="Abusive mission text, a deal they refuse to honour, an impossible contract written to collect the fine…"
            notice={
              <>
                This opens a private ticket in Discord with a moderator pinged. The
                contract, both parties and your Discord account are attached to it.
                {c.status === "disputed"
                  ? " A refused submission on its own is not a report — Settle, Ask for more time and Sue are the buttons for that."
                  : " A late delivery or a disagreement about the work is not a report; use the dispute buttons for those."}
              </>
            }
            busy={reportBusy}
            error={reportError}
            onSubmit={sendReport}
            onClose={() => { if (!reportBusy) setReporting(false); }}
          />
        )}
      </CardContent>
    </Card>
  );
}
