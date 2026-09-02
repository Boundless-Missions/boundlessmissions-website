"use client";

/**
 * account.ts — client calls for the account panel.
 *
 * Everything here goes through the same-origin BFF, never to the bot directly, so
 * the session token stays in the httpOnly cookie. `authedFetch` attaches the App
 * Check header and nudges the session hint, exactly as the marketplace calls do.
 */
import { appCheckHeader } from "./firebase";
import { notifySessionChanged } from "./session";
import { jsonOrThrow, safeFetch } from "./api-error";

export interface Account {
  account_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  email: string;
  has_discord: boolean;
  has_password_login: boolean;
  discord_id: string;
  needs_onboarding: boolean;
}

export interface KspLinkCode {
  code: string;
  expires_in: number;
}

export interface KspLinkPending {
  pending: boolean;
  challenge_id: string;
  client_ip: string;
  device_id: string;
  requested_at: string;
}

async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
  const res = await safeFetch(input, { ...init, headers });
  notifySessionChanged();
  return res;
}

/** The signed-in account, or null when there is no session (401). */
export async function fetchAccount(): Promise<Account | null> {
  const res = await authedFetch("/api/account", { cache: "no-store" });
  if (res.status === 401) return null;
  return jsonOrThrow<Account>(res);
}

export async function claimUsername(username: string): Promise<string> {
  const res = await authedFetch("/api/account/username", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await jsonOrThrow<{ value: string }>(res);
  return data.value;
}

export async function setDisplayName(displayName: string): Promise<string> {
  const res = await authedFetch("/api/account/display-name", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ display_name: displayName }),
  });
  const data = await jsonOrThrow<{ value: string }>(res);
  return data.value;
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("avatar", file);
  // No content-type header: the browser sets it, with the multipart boundary.
  const res = await authedFetch("/api/account/avatar", { method: "POST", body: form });
  const data = await jsonOrThrow<{ value: string }>(res);
  return data.value;
}

/** A code to type into Discord as `/b account`, joining the two identities. */
export async function requestDiscordCode(): Promise<KspLinkCode> {
  const res = await authedFetch("/api/account/discord/code", { method: "POST" });
  return jsonOrThrow<KspLinkCode>(res);
}

export async function requestKspCode(): Promise<KspLinkCode> {
  const res = await authedFetch("/api/account/ksp/code", { method: "POST" });
  return jsonOrThrow<KspLinkCode>(res);
}

export async function fetchKspPending(): Promise<KspLinkPending> {
  const res = await authedFetch("/api/account/ksp/pending", { cache: "no-store" });
  return jsonOrThrow<KspLinkPending>(res);
}

export async function approveKspLink(challengeId: string, approve: boolean): Promise<void> {
  const res = await authedFetch("/api/account/ksp/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challenge_id: challengeId, approve }),
  });
  await jsonOrThrow(res);
}

// ── Support tickets ──────────────────────────────────────────────────────────

export interface TicketSummary {
  ticket_id: string;
  number: number;
  kind: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  unread: boolean;
}

export interface TicketMessage {
  message_id: string;
  author_name: string;
  /** "opener" | "staff" | "system" */
  author_kind: string;
  body: string;
  attachments: { name: string; url: string }[];
  created_at: string;
}

export interface TicketThread {
  ticket: TicketSummary;
  description: string;
  messages: TicketMessage[];
}

export async function fetchTickets(): Promise<TicketSummary[]> {
  const res = await authedFetch("/api/tickets", { cache: "no-store" });
  const data = await jsonOrThrow<{ tickets: TicketSummary[] }>(res);
  return data.tickets ?? [];
}

export async function fetchTicket(id: string): Promise<TicketThread> {
  const res = await authedFetch(`/api/tickets/${encodeURIComponent(id)}`, { cache: "no-store" });
  return jsonOrThrow<TicketThread>(res);
}

export async function openTicket(
  kind: string, title: string, body: string): Promise<TicketSummary> {
  const res = await authedFetch("/api/tickets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, title, body }),
  });
  return jsonOrThrow<TicketSummary>(res);
}

export async function replyToTicket(id: string, body: string): Promise<TicketMessage> {
  const res = await authedFetch(`/api/tickets/${encodeURIComponent(id)}/reply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return jsonOrThrow<TicketMessage>(res);
}

// ── Two-factor authentication ────────────────────────────────────────────────

export interface TwoFactorStatus {
  enabled: boolean;
  pending: boolean;
  recovery_remaining: number;
  /** Which credential must be re-proved before enrolling: "" (none — a Discord
   *  account has no Firebase identity), "google", or "password". */
  reauth?: "" | "google" | "password";
}

export async function fetch2fa(): Promise<TwoFactorStatus> {
  const res = await authedFetch("/api/account/2fa", { cache: "no-store" });
  return jsonOrThrow<TwoFactorStatus>(res);
}

export async function begin2fa(idToken: string): Promise<{ secret: string; uri: string; qr_svg: string }> {
  // The server requires a fresh Firebase ID token to *enable* a factor — see
  // reauthenticate() in lib/auth.ts for why adding one is as sensitive as removing one.
  const res = await authedFetch("/api/account/2fa/begin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  return jsonOrThrow<{ secret: string; uri: string; qr_svg: string }>(res);
}

async function post2fa(step: string, code: string) {
  const res = await authedFetch(`/api/account/2fa/${step}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return jsonOrThrow<{ message: string; recovery_codes?: string[] }>(res);
}

export const confirm2fa = (code: string) => post2fa("confirm", code);
export const disable2fa = (code: string) => post2fa("disable", code);
export const regenerateRecoveryCodes = (code: string) => post2fa("recovery", code);
