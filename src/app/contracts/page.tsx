"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2, Gavel, Clock, AlertTriangle, Gamepad2, Flag, Upload, Download,
} from "lucide-react";

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
  submitFlag,
  fetchFlag,
  formatInstant,
  tomorrow,
  STATUS_LABELS,
  MISSION_TYPE_LABELS,
  FLAG_DESIGN,
  FLAG_ACCEPT,
  FLAG_MAX_BYTES,
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
          Everything you have issued or accepted. Submitting work happens in KSP, because
          it needs telemetry and a screenshot from the running game. The exception is a flag
          design, which is only an image and is uploaded here.
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

/**
 * Pick a flag image and hand it over.
 *
 * The local preview is the point of the form: a flag is judged by eye and this is
 * the last moment before it becomes a submission — the contract leaves ACTIVE the
 * instant the upload lands, so there is no "replace it" afterwards, only a dispute.
 * The type and size are checked here as well as on the server, not instead of it:
 * the server's answer is the real one, but it arrives after 8 MB have been sent.
 */
function FlagUpload({
  busy,
  submitting,
  onSubmit,
}: {
  busy: boolean;
  submitting: boolean;
  onSubmit: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // An object URL is a document-lifetime handle, so it is revoked when this form
  // goes away or picks a different file — otherwise every re-pick leaks a copy of
  // the image for as long as the tab is open.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(picked: File | null) {
    setProblem(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (!FLAG_ACCEPT.split(",").includes(picked.type)) {
      setFile(null);
      setProblem("A flag must be a PNG, JPEG or WebP image.");
      return;
    }
    if (picked.size > FLAG_MAX_BYTES) {
      setFile(null);
      setProblem(`That image is ${(picked.size / (1024 * 1024)).toFixed(1)} MB; the limit is `
        + `${FLAG_MAX_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    setFile(picked);
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium">Submit the flag</p>
      <p className="mt-1 text-xs text-muted-foreground">
        PNG, JPEG or WebP, up to {FLAG_MAX_BYTES / (1024 * 1024)} MB. KSP renders flags
        at 4:1, and 1024×256 is the usual size. Submitting is final: the contract goes to
        the issuer for review and cannot be re-uploaded.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept={FLAG_ACCEPT}
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
        />
        <Button size="sm" variant="outline" disabled={busy}
                onClick={() => input.current?.click()}>
          <Upload className="mr-1 h-4 w-4" />
          {file ? "Choose another" : "Choose an image"}
        </Button>
        {file && (
          <Button size="sm" disabled={busy} onClick={() => onSubmit(file)}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Submit flag
          </Button>
        )}
      </div>

      {problem && <p className="mt-2 text-xs text-destructive">{problem}</p>}
      {preview && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="The flag you are about to submit"
               className="max-h-40 rounded border border-border bg-background object-contain" />
          <p className="mt-1 text-xs text-muted-foreground">{file?.name}</p>
        </div>
      )}
    </div>
  );
}

/**
 * The submitted flag, as this reader is allowed to see it.
 *
 * The watermarked preview is public and already on the contract, so it paints with
 * no extra call. The clean full-res file is a signed, short-lived URL and is minted
 * only when someone asks for it — a button rather than an automatic fetch, so the
 * page does not sign a link per contract that nobody opens.
 */
function FlagPanel({ contract: c, previewUrl }: { contract: Contract; previewUrl: string }) {
  const [full, setFull] = useState<{ url: string; filename: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = c.status === "completed";

  async function getFull() {
    setBusy(true);
    setError(null);
    try {
      const f = await fetchFlag(c.contract_id);
      // `watermarked` is the server's answer about which image this is, and it is
      // the only one worth trusting: a page holding a status from before a review
      // would otherwise offer the preview as the full-res file.
      if (f.url && !f.watermarked) setFull({ url: f.url, filename: f.filename });
      else setError("The full-res flag isn't available yet.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={full?.url ?? previewUrl}
           alt={full ? "The delivered flag" : "Watermarked preview of the submitted flag"}
           className="max-h-48 rounded border border-border bg-background object-contain" />
      <p className="mt-2 text-xs text-muted-foreground">
        {paid
          ? "Delivered. The flag is also queued to the issuer's in-game flag picker."
          : c.is_outgoing
            ? "Preview only, stamped and downscaled. Accepting the submission pays the"
              + " contractor and hands over the clean full-res file."
            : "This is the watermarked copy the issuer reviews. Your original is kept"
              + " private until they accept."}
      </p>

      {paid && c.is_outgoing && !full && (
        <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={getFull}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                : <Download className="mr-1 h-4 w-4" />}
          Get the full-res flag
        </Button>
      )}
      {full && (
        <a href={full.url} download={full.filename} target="_blank" rel="noreferrer"
           className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <Download className="h-3.5 w-3.5" />
          Download {full.filename}
        </a>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
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
  const isFlag = c.mission_type === FLAG_DESIGN;
  const typeLabel = c.mission_type === "active_vessel"
    ? null
    : MISSION_TYPE_LABELS[c.mission_type] ?? null;
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
    if (!isFlag) {
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
      );
    }
    actions.push(
      danger("give_up", "Give up", `Confirm: you pay the ${c.fine.toLocaleString()} fine`, () =>
        run("give_up", () => giveUpContract(id))),
    );
    // A flag has no in-game submit window to open — the mod's submit screen reads a
    // craft and a flight, and this contract has neither. So the upload is the action,
    // and it gets a form of its own rather than a button in the row.
    if (isFlag) {
      extra = (
        <FlagUpload
          busy={busy !== null}
          onSubmit={(file) => run("submit_flag", () => submitFlag(id, file))}
          submitting={busy === "submit_flag"}
        />
      );
    }
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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* Only the types that change what you have to do. `active_vessel` is
                also what an untyped contract reads as server-side, so a "Flight"
                badge on every old contract would be noise at best and wrong at
                worst — where the label earns its place is a flag design, which is
                delivered from the browser rather than from the game. Text only: the
                report link at the foot of the card already spends the flag glyph on
                "report this". */}
            {typeLabel && (
              <Badge variant="outline" className="border-border text-muted-foreground">
                {typeLabel}
              </Badge>
            )}
            <Badge variant="outline" className={cn(STATUS_STYLES[c.status])}>
              {STATUS_LABELS[c.status] ?? c.status}
            </Badge>
          </div>
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
            {isFlag
              ? `Upload the flag below. ${c.issuer_name} reviews a watermarked copy; the`
                + " clean full-res file is only handed over when they accept, and lands in"
                + " their in-game flag picker."
              : "Submitting happens in KSP. The button below asks your running game to open"
                + " the submit window for this contract."}
          </p>
        )}
        {c.status === "mod_review" && (
          <p className="text-sm text-muted-foreground">
            Escalated: moderators are reviewing this case on Discord.
          </p>
        )}

        {/* Above the buttons on purpose: an issuer pressing Approve is buying this
            image, and the review is the one place it must not be a link they might
            not follow. */}
        {isFlag && c.flag_preview_url && (
          <FlagPanel contract={c} previewUrl={c.flag_preview_url} />
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
                {c.is_outgoing ? ", the contractor on " : ", the issuer of "}
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
                  ? " A refused submission on its own is not a report; Settle, Ask for more time and Sue are the buttons for that."
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
