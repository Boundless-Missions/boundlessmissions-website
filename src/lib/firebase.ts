/**
 * firebase.ts — client-side Firebase app + App Check.
 *
 * App Check attests that a request came from our genuine web app (reCAPTCHA
 * Enterprise) so scripts hitting the function URL directly are rejected. The
 * browser attaches the App Check token to BFF calls (see `appCheckHeader`); the
 * Next.js route handlers verify it server-side with firebase-admin.
 *
 * DORMANT until `APP_CHECK_SITE_KEY` is set: with an empty key, `initAppCheck`
 * and `appCheckHeader` are no-ops, so nothing changes on the live site until we
 * deliberately turn it on (and only after the backend is ready to verify).
 *
 * These values are NOT secrets — the Firebase web config and the reCAPTCHA site
 * key are public by design (the site key is domain-restricted at Google's edge).
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken,
  type AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyDvyf2T4lAfLTRaHpDO2do68j96r5MO8wI",
  authDomain: "upoksp-gk-backend.firebaseapp.com",
  projectId: "upoksp-gk-backend",
  storageBucket: "upoksp-gk-backend.firebasestorage.app",
  messagingSenderId: "583669239653",
  appId: "1:583669239653:web:24b2abcf8cc80ce3f71b8c",
};

// reCAPTCHA Enterprise site key (public, domain-restricted). Empty = App Check off.
const APP_CHECK_SITE_KEY = "6LfdwTEtAAAAAHUVtvW0duyS2UR7QjSEbumdX9fP";

let appCheck: AppCheck | null = null;

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/** Initialize App Check once, in the browser only. No-op until the key is set. */
export function initAppCheck(): void {
  if (appCheck || !APP_CHECK_SITE_KEY || typeof window === "undefined") return;
  // Local dev only: reCAPTCHA Enterprise is domain-restricted and won't attest on
  // localhost, so use an App Check debug token instead. With this flag set, the
  // SDK prints a debug token to the browser console on first load — register it in
  // Firebase Console → App Check → (app) → Manage debug tokens so the backend's
  // verifyToken accepts it. `next build` strips this branch from the prod bundle.
  if (process.env.NODE_ENV !== "production") {
    // @ts-expect-error — global read by the App Check SDK; not in the lib typings.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  appCheck = initializeAppCheck(firebaseApp(), {
    provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

/**
 * Returns the `X-Firebase-AppCheck` header for a BFF request, or `{}` when App
 * Check is off / unavailable (so callers can always spread it safely).
 */
export async function appCheckHeader(): Promise<Record<string, string>> {
  if (!APP_CHECK_SITE_KEY || typeof window === "undefined") return {};
  try {
    initAppCheck();
    if (!appCheck) return {};
    const { token } = await getToken(appCheck, /* forceRefresh */ false);
    return { "X-Firebase-AppCheck": token };
  } catch (e) {
    // Still never block the request on this — the server decides whether a
    // missing token matters. But do not fail *silently*: with enforcement on, a
    // swallowed failure here surfaces one hop later as "App Check verification
    // failed", which points at the server and at a token that was never sent.
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[app-check] could not get a token, sending the request without one.\n" +
        "If the server answers 403, this is why. In local dev the usual cause is " +
        "a debug token that isn't registered: copy the 'App Check debug token' " +
        "line above into Firebase Console > App Check > (web app) > Manage debug " +
        "tokens. Underlying error:", e);
    }
    return {};
  }
}
