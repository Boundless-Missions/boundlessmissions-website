"use client";

/**
 * auth.ts — signing in with Google or an email address.
 *
 * Firebase Auth is only ever used to *prove who someone is*. It never becomes the
 * session: the ID token it hands back is posted once to our own `/api/auth/signin`,
 * which swaps it for the Boundless Missions session token and stores that in the
 * httpOnly cookie the rest of the site already uses. So there is exactly one kind
 * of session on this site, and the Firebase token never has to be refreshed,
 * stored, or attached to anything.
 *
 * That also means signing out is our concern, not Firebase's — see `signOutAll`.
 */
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  type Auth,
  type User,
} from "firebase/auth";

import { appCheckHeader, firebaseApp } from "./firebase";
import { safeFetch, jsonOrThrow } from "./api-error";
import { notifySessionChanged } from "./session";

export interface SignInResult {
  /** "ok" — signed in. "totp_required" — post the code with `completeTotp`. */
  status?: string;
  challenge_id?: string;
  account_id: string;
  display_name: string;
  needs_onboarding: boolean;
}

function auth(): Auth {
  return getAuth(firebaseApp());
}

/**
 * fetch + the App Check header, exactly as the other client modules do it.
 *
 * Not optional on these three routes, and the sign-in one is the reason: it sets
 * the session cookie and needs no cookie to be called, so App Check is the only
 * thing standing between it and login-CSRF — a page anywhere forcing a visitor's
 * browser into an attacker's session. A cross-origin `fetch` cannot supply a
 * custom header (the preflight fails; no route emits CORS headers), which is what
 * makes the requirement load-bearing rather than decorative. So the header has to
 * be attached HERE; the server must never be relaxed to accept a request without it.
 */
async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
  return safeFetch(input, { ...init, headers });
}

/**
 * Turn a signed-in Firebase user into a Boundless Missions session.
 *
 * Called at the end of every flow below. The Firebase user is signed out again
 * immediately afterwards: our cookie is the session now, and leaving a second
 * live identity in the tab only creates a way for the two to disagree about who
 * is signed in.
 */
async function exchange(user: User): Promise<SignInResult> {
  const idToken = await user.getIdToken();
  try {
    const res = await authedFetch("/api/auth/signin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    const data = await jsonOrThrow<SignInResult>(res);
    notifySessionChanged();
    return data;
  } finally {
    // The Firebase identity has done its job either way — including when the
    // server asks for a second factor, since that step is carried by our own
    // challenge id and needs nothing further from Firebase.
    await fbSignOut(auth()).catch(() => {});
  }
}

/** Finish a sign-in the server stopped for a second factor. */
export async function completeTotp(challengeId: string, code: string): Promise<SignInResult> {
  const res = await authedFetch("/api/auth/totp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challenge_id: challengeId, code }),
  });
  const data = await jsonOrThrow<SignInResult>(res);
  notifySessionChanged();
  return data;
}

/** Sign in (or sign up — Google accounts need no separate registration step). */
/**
 * Prove the primary credential again, and hand back a fresh Firebase ID token.
 *
 * Enabling two-factor authentication is gated on this server-side: a borrowed
 * signed-in browser that could enrol its own authenticator would lock the real
 * owner out for good, since both ways of removing a factor need a code they never
 * had. Holding our session cookie is therefore not enough — the person has to
 * show they still have the Google account or the password.
 *
 * `exchange()` signs the Firebase user out as soon as it has traded the token for
 * our cookie, so there is no live Firebase identity in the tab to read a token
 * from; this deliberately runs the sign-in again and signs out again afterwards,
 * leaving our own session untouched either way.
 */
export async function reauthenticate(email?: string, password?: string): Promise<string> {
  try {
    let cred;
    if (email && password) {
      cred = await signInWithEmailAndPassword(auth(), email, password);
    } else {
      const provider = new GoogleAuthProvider();
      // Ask which account, as signInWithGoogle does. Silently reusing whichever
      // Google account the browser last used is how someone re-proves the wrong
      // identity and gets an opaque 401 from the server's uid check.
      provider.setCustomParameters({ prompt: "select_account" });
      cred = await signInWithPopup(auth(), provider);
    }
    return await cred.user.getIdToken(true);
  } finally {
    await fbSignOut(auth()).catch(() => {});
  }
}


export async function signInWithGoogle(): Promise<SignInResult> {
  const provider = new GoogleAuthProvider();
  // Always ask which account. Silently reusing the one Google last used is how
  // someone ends up signed into a Boundless account they did not mean to open.
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth(), provider);
  return exchange(cred.user);
}

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const cred = await signInWithEmailAndPassword(auth(), email, password);
  if (!cred.user.emailVerified) {
    // Send another link rather than just refusing: the usual reason someone is
    // here is that the first one was missed, and a dead end would leave them with
    // an account they can never open.
    await sendEmailVerification(cred.user).catch(() => {});
    await fbSignOut(auth()).catch(() => {});
    throw new Error(
      "Confirm your email address first. We've sent you another verification link.");
  }
  return exchange(cred.user);
}

/**
 * Register with an email address. Deliberately does NOT sign the user in: the
 * server refuses an unverified address, so the honest thing is to say so here
 * rather than to hand back a session that the next request would reject.
 */
export async function registerWithEmail(email: string, password: string): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth(), email, password);
  await sendEmailVerification(cred.user).catch(() => {});
  await fbSignOut(auth()).catch(() => {});
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth(), email);
}

/** Clear our session cookie, and any Firebase identity still lingering in the tab. */
export async function signOutAll(): Promise<void> {
  await fbSignOut(auth()).catch(() => {});
  await authedFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  notifySessionChanged();
}

/**
 * Firebase's error codes are not sentences. Map the ones a person can actually
 * act on; anything else falls back to the message we were given.
 */
export function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like an email address.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/weak-password":
      return "Pick a password of at least 6 characters.";
    case "auth/email-already-in-use":
      return "There's already an account with that email. Sign in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      // One message for all three on purpose: saying which half was wrong tells
      // an attacker whether the address is registered.
      return "That email and password don't match.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups and try again.";
    case "auth/network-request-failed":
      return "Couldn't reach the sign-in service. Check your connection.";
    default:
      return (err as Error)?.message || "Sign-in failed. Try again.";
  }
}
