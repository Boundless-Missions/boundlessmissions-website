/**
 * api-error.ts — one vocabulary for "the request didn't work", shared by the BFF
 * route handlers and the browser code that calls them.
 *
 * The problem this solves: a failure with no body reaches the user as a bare
 * number. When the bot is down, Caddy answers the BFF with a zero-length 502; the
 * proxy relays status and body verbatim, `res.json()` finds nothing to parse, and
 * the page renders "Request failed (502)" — which reads like the user did
 * something wrong, and tells them nothing about whether waiting will help.
 *
 * So every message here answers two questions a number cannot: *whose problem is
 * this*, and *is it worth trying again*. Server-side faults say so in the first
 * clause, because that is the whole point — a player who thinks a 502 is their
 * fault goes looking for a fix that does not exist.
 *
 * Isomorphic on purpose: no next/* or firebase-admin imports, so the server can
 * fill a missing `detail` in with the same sentence the client would have shown.
 * The client keeps its own fallback anyway — a failure that never reached our
 * route handler (a dead SSR function, a CDN error page) has no `detail` for
 * anyone to have written.
 */

/** What we answer with when the bot API cannot be reached at all. */
export const UPSTREAM_DOWN_STATUS = 503;

const OFFLINE =
  "Mission Control is offline right now. This is a problem on our side, not " +
  "anything you did. Please try again in a few minutes.";

/**
 * A plain-language sentence for a status code, used when the response carried no
 * `detail` of its own. Anything unrecognised falls back to naming the status,
 * which is at least honest, plus who to ask.
 */
export function describeStatus(status: number): string {
  switch (status) {
    case 400:
    case 422:
      return "That request wasn't valid. Reload the page and try again.";
    case 401:
      return "You're signed out. Sign in again to continue.";
    case 403:
      return "This browser wasn't allowed to make that request. Reload the page, " +
             "and if it keeps happening try a different browser or turn off blocking extensions.";
    case 404:
      return "That isn't here any more; it may have been removed.";
    case 409:
      return "Someone got there first: that changed while you were looking at it. Refresh to see the current state.";
    case 413:
      return "That file is too large to upload.";
    case 429:
      return "Too many requests in a row. Wait a minute, then try again.";
    case 500:
      return "Mission Control hit an unexpected error handling that. The fault is on our side, not yours. " +
             "Trying again may work; if it doesn't, it needs fixing here.";
    case 502:
    case 503:
    case 504:
      return OFFLINE;
    default:
      if (status >= 500) return OFFLINE;
      return `That request failed (HTTP ${status}).`;
  }
}

/** True for the statuses that mean "our backend, not this user". */
export function isServerFault(status: number): boolean {
  return status >= 500;
}

/** The message for a fetch that never got a response at all (offline, DNS, dead server). */
export function describeNetworkFailure(): string {
  return "Couldn't reach the site. Check your internet connection and try again. " +
         "If you're online, Mission Control may be down.";
}

/**
 * fetch that turns a rejected promise into an Error the UI can show.
 *
 * Every page renders `Error.message` straight into its error slot, so a raw
 * `TypeError: Failed to fetch` would be what the user reads.
 */
export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(describeNetworkFailure());
  }
}

/**
 * Parse a response, or throw an Error carrying the best available explanation:
 * the backend's own `detail` when there is one, our sentence for the status when
 * there is not.
 */
export async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { detail?: unknown };
  if (!res.ok) {
    throw new Error(detailMessage(data.detail) ?? describeStatus(res.status));
  }
  return data as T;
}

/**
 * The sentence out of a FastAPI `detail`, whichever shape it arrived in.
 *
 * Most are a plain string. A few are structured — the gates the KSP client has to
 * act on programmatically send `{code, message, …}` — and those carry the only
 * explanation the user will get: a suspension answers 403 that way, and without
 * this it would reach the page as the generic "this browser wasn't allowed to
 * make that request", which is both wrong and unactionable.
 */
function detailMessage(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim().length > 0) return detail;
  if (detail && typeof detail === "object") {
    const msg = (detail as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return null;
}
