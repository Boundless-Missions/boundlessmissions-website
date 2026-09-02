/**
 * contracts.ts — client-side types + fetch wrappers for the contracts page.
 *
 * Same shape as marketplace.ts: every call hits a same-origin Route Handler, which
 * attaches the httpOnly session cookie as a Bearer token. The bot session token never
 * reaches client JS.
 *
 * Note what is missing on purpose: **submit** — with one exception. A submission
 * carries live telemetry and a screenshot from a running game, so it has no browser
 * equivalent; the page can show you a contract is waiting on your submission, but the
 * act itself stays in KSP. A `flag_design` contract is the exception, because its
 * whole deliverable is an image: it has no in-game upload and never had one, so
 * `submitFlag` below is a real submission rather than a prompt to go and make one.
 */
import { appCheckHeader } from "./firebase";
import { notifySessionChanged } from "./session";
import { jsonOrThrow, safeFetch } from "./api-error";

export interface PendingRequest {
  kind: "settle" | "more_time";
  new_date?: string | null;
  requested_at?: string | null;
  requested_by?: string | null;
}

export interface Contract {
  contract_id: string;
  mission: string;
  issuer_name: string;
  contractor_name: string;
  payment: number;
  fine: number;
  due_date: string;
  status: string;
  created_at?: string | null;
  is_bot_issued: boolean;
  /** True when *you* issued this contract, false when you are the contractor. */
  is_outgoing: boolean;
  modlist?: string | null;
  mission_type: string;
  required_situation?: string | null;
  required_body?: string | null;
  flag_preview_url?: string | null;
  rescue_kerbals: string[];
  /** An ask from the contractor that only the issuer can answer. */
  pending_request?: PendingRequest | null;
  /** When an unresolved dispute collects the fine by itself (ISO, UTC). */
  auto_fine_at?: string | null;
  /** The contractor has spent their one extension request for this dispute. */
  more_time_used?: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

export type DisputeAction = "settle" | "more_time" | "pay_fine" | "sue";

async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
  const res = await safeFetch(input, { ...init, headers });
  // The BFF refreshes or clears the session hint on every authed call, so nudge the
  // header to re-read it rather than making it wait for the next navigation. A
  // re-read that finds no change costs nothing — the state is identical.
  notifySessionChanged();
  return res;
}

/** Null when not signed in, so the page can render the link prompt instead of an error. */
export async function fetchContracts(): Promise<Contract[] | null> {
  const res = await authedFetch("/api/contracts", { cache: "no-store" });
  if (res.status === 401) return null;
  const data = await jsonOrThrow<{ contracts: Contract[] }>(res);
  return data.contracts;
}

/**
 * A refused action is not an exception: the bot answers a business refusal ("you
 * already asked for more time on this dispute") with 200 and `success: false`, and that
 * sentence is meant to be shown. Only 4xx/5xx throw.
 */
async function post(id: string, action: string, body?: unknown): Promise<ActionResult> {
  const res = await authedFetch(
    `/api/contracts/${encodeURIComponent(id)}/${action}`,
    body === undefined
      ? { method: "POST" }
      : {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  return jsonOrThrow<ActionResult>(res);
}

export const acceptContract = (id: string) => post(id, "accept");
export const cancelContract = (id: string) => post(id, "cancel");
export const giveUpContract = (id: string) => post(id, "give_up");
export const reviewContract = (id: string, approve: boolean) =>
  post(id, "review", { approve });
export const disputeContract = (id: string, action: DisputeAction, newDate?: string) =>
  post(id, "dispute", { action, new_date: newDate ?? null });
export const answerSettle = (id: string, approve: boolean) =>
  post(id, "settle_response", { approve });
export const answerMoreTime = (id: string, approve: boolean) =>
  post(id, "more_time_response", { approve });

/**
 * Report the other party of a contract to the moderators.
 *
 * Not a `post()` call, and not an ActionResult: this changes nothing about the
 * contract. A refusal here — you already reported it, the other party is the bot —
 * is an HTTP failure with a sentence to show, not a 200 with `success: false`, so it
 * throws like every other non-transition call.
 */
export async function reportContract(id: string, reason: string): Promise<{ message: string }> {
  const res = await authedFetch(`/api/contracts/${encodeURIComponent(id)}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return jsonOrThrow<{ message: string }>(res);
}

// ── Flag design ──────────────────────────────────────────────────────────────

/** The mission type whose deliverable is an image rather than a craft. */
export const FLAG_DESIGN = "flag_design";

export const MISSION_TYPE_LABELS: Record<string, string> = {
  flag_design: "Flag design",
  craft_build: "Craft build",
  active_vessel: "Flight",
  rescue: "Rescue",
};

/** What the bot accepts, mirrored here only so the picker can filter and the
 *  refusal arrives before an 8 MB upload rather than after it. */
export const FLAG_ACCEPT = "image/png,image/jpeg,image/webp";
export const FLAG_MAX_BYTES = 8 * 1024 * 1024;

export interface FlagImage {
  url: string | null;
  filename: string;
  /**
   * Which of the two images this is. `true` is the stamped, downscaled preview the
   * issuer reviews; `false` is the clean full-res file, and only ever comes back
   * once the contract is completed — i.e. paid for. Never infer this from a status
   * held on the page, which can be a review out of date.
   */
  watermarked: boolean;
}

/** Submit the image a flag-design contract asked for. */
export async function submitFlag(id: string, file: File): Promise<ActionResult> {
  const form = new FormData();
  form.append("flag", file);
  const res = await authedFetch(`/api/contracts/${encodeURIComponent(id)}/submit_flag`, {
    method: "POST",
    // No content-type header: the browser sets it, with the multipart boundary.
    body: form,
  });
  return jsonOrThrow<ActionResult>(res);
}

/**
 * The submitted flag, gated by the server exactly as the in-game view gates it.
 *
 * Its own call rather than a field on the contract list: the full-res link is
 * signed and short-lived, so minting one per contract on every page load would
 * sign a batch of URLs nobody opens.
 */
export async function fetchFlag(id: string): Promise<FlagImage> {
  const res = await authedFetch(`/api/contracts/${encodeURIComponent(id)}/flag`, {
    cache: "no-store",
  });
  return jsonOrThrow<FlagImage>(res);
}

// ── Commands to a running game ───────────────────────────────────────────────

export interface CommandResult extends ActionResult {
  /** Live KSP clients the command reached. 0 means the game isn't running. */
  clients: number;
}

/**
 * Ask this player's running KSP to offer the submit window for a contract.
 *
 * Not a submission — the page cannot make one. It raises a prompt in game that the
 * player still has to accept, and the contract's terms are re-read by the mod from
 * the API rather than sent from here.
 */
export async function openSubmitInKsp(contractId: string): Promise<CommandResult> {
  const res = await authedFetch("/api/game/command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ command: "open_submit", contract_id: contractId }),
  });
  return jsonOrThrow<CommandResult>(res);
}

// ── Display helpers ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  pending: "Offered",
  active: "In progress",
  submitted: "Awaiting review",
  disputed: "In dispute",
  mod_review: "With moderators",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * The auto-fine instant in the reader's own timezone. The server sends UTC because the
 * policy is measured in days from when the dispute opened; someone reading "the 14th"
 * while their clock says the 13th would reasonably think they had another day.
 */
export function formatInstant(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Earliest date the bot accepts for an extension — it must be in the future. */
export function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
