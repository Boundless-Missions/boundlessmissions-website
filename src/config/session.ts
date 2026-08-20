/**
 * Shared between server and client, so it lives in config rather than in either
 * `lib/server-api.ts` (server-only — imports next/headers) or `lib/session.ts`
 * (client-only). Both read this one definition.
 */

/**
 * A deliberately JS-readable companion to the httpOnly `__session` cookie. It
 * carries no secret — just "somebody is signed in" — and exists because the header
 * has to decide which navigation to draw before any request is made.
 *
 * Forging it grants nothing: every route re-checks the real token server-side, so
 * the worst a tampered hint can do is show a nav link that lands on a sign-in card.
 */
export const SESSION_HINT_COOKIE = "bm_signed_in";
