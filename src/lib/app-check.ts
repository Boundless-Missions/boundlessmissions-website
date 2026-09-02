/**
 * app-check.ts — server-side Firebase App Check verification (BFF / SSR only).
 *
 * The browser attaches an App Check token (see `appCheckHeader` in firebase.ts);
 * here we verify it with firebase-admin so requests that don't originate from our
 * genuine web app are rejected. Verification is centralized in server-api.ts
 * (`proxy` for auth'd routes, `forwardLink` for the link flow) — the public,
 * CDN-cached listings route is intentionally NOT checked (verifying per request
 * would defeat the cache, and the catalog is public anyway).
 *
 * Enforcement is ALWAYS on in production. `ENFORCE_APP_CHECK=false` is a
 * development-only escape hatch and is ignored when `NODE_ENV === "production"`
 * — see the const below for why that guard exists rather than trusting the
 * environment file not to be there.
 */
import { headers } from "next/headers";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";

/**
 * Enforced everywhere by default, and in production the off-switch does not
 * exist at all.
 *
 * The `NODE_ENV` guard is the fix for a live hole, not belt-and-braces: this
 * used to read `ENFORCE_APP_CHECK !== "false"` on its own, on the stated
 * assumption that `.env.local` "is gitignored and never deployed". `firebase
 * deploy` does not consult git — the webframeworks integration copies every
 * `.env*` into the Cloud Function source, and Next loads `.env.local` in
 * production too, so the dev file's `false` silently disabled App Check on the
 * live site. Making the flag unreadable in production means no environment file,
 * staged by any mechanism, can turn the gate off where it matters.
 *
 * In development it still has to be the exact string "false"; anything else,
 * including a typo or an empty value, keeps enforcement on.
 */
const ENFORCE_APP_CHECK =
  process.env.NODE_ENV === "production" || process.env.ENFORCE_APP_CHECK !== "false";
const APP_CHECK_HEADER = "x-firebase-appcheck";

function adminApp() {
  // In the Cloud Function the runtime service account provides Application
  // Default Credentials automatically — no key file needed. projectId is passed
  // explicitly so token audience verification can't fail on project resolution.
  return getApps().length
    ? getApps()[0]
    : initializeApp({ projectId: "upoksp-gk-backend" });
}

/**
 * True when the request may proceed: enforcement off, or a valid App Check token
 * is present. Reads the token from the incoming request headers via next/headers,
 * so handlers don't need to thread the Request through.
 */
export async function appCheckOk(): Promise<boolean> {
  if (!ENFORCE_APP_CHECK) return true;
  const token = (await headers()).get(APP_CHECK_HEADER);

  // The two ways this fails look identical to the caller — both produce the same
  // 403 — but they have nothing to do with each other. A MISSING token means the
  // browser never got one (in dev: an unregistered debug token, since
  // `appCheckHeader` swallows the failure and sends no header at all). An INVALID
  // one means it got a token the backend won't accept. Logging which is the
  // difference between a five-minute fix and an afternoon.
  if (!token) {
    console.warn(
      "[app-check] no token on the request; the browser sent none. In local " +
      "dev, register the debug token printed in the browser console under " +
      "Firebase Console > App Check > (web app) > Manage debug tokens, or set " +
      "ENFORCE_APP_CHECK=false in .env.local.");
    return false;
  }

  try {
    await getAppCheck(adminApp()).verifyToken(token);
    return true;
  } catch (e) {
    console.warn("[app-check] token rejected:",
                 (e as { code?: string })?.code ?? "",
                 (e as Error)?.message ?? e);
    return false;
  }
}
