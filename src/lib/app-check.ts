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
 * ROLLOUT: `ENFORCE_APP_CHECK` starts false so the first deploy just lets tokens
 * start flowing harmlessly. Flip to true (and redeploy) only once the client is
 * confirmed attaching valid tokens on the live domain — otherwise every call 403s.
 */
import { headers } from "next/headers";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";

const ENFORCE_APP_CHECK = true;
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
  if (!token) return false;
  try {
    await getAppCheck(adminApp()).verifyToken(token);
    return true;
  } catch {
    return false;
  }
}
