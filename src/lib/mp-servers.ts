"use client";

/**
 * mp-servers.ts — the owner's game servers, and remote admin of them.
 *
 * `ksp-mp-remote-host-admin.md`. A command is queued by the bot and pulled by the
 * server's agent (bm-hostd), so it does not finish inside one request: `issue`
 * returns a command id and `waitFor` polls it until the agent reports back.
 *
 * Same-origin BFF only, like every other lib module here.
 */
import { useEffect, useState } from "react";

import { appCheckHeader } from "./firebase";
import { notifySessionChanged, useSignedIn } from "./session";
import { jsonOrThrow, safeFetch } from "./api-error";

export type RemoteAdminState = "enabled" | "disabled" | "absent" | "unknown";

export interface AgentState {
  online: boolean;
  remote_admin: RemoteAdminState;
  allow: string[];
  reason?: string;
  version?: string | null;
  active_state?: string | null;
  players?: number | null;
  max_players?: number | null;
  seen_seconds_ago?: number;
}

export interface MpServer {
  server_id: string;
  name: string;
  revoked: boolean;
  created_at?: string;
  keys_universe_id?: string;
  agent: AgentState;
}

export type CommandState = "pending" | "delivered" | "done" | "failed" | "expired";

export interface HostCommand {
  cid: string;
  cmd: string;
  actor?: string;
  issued_at?: string;
  finished_at?: string | null;
  state: CommandState;
  error?: string;
  problems?: string[];
  args_summary?: Record<string, unknown>;
  /** Only while the bot still holds it in memory (about ten minutes). */
  result?: Record<string, unknown> | null;
}

async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
  const res = await safeFetch(input, { ...init, headers });
  notifySessionChanged();
  return res;
}

// ── Who may see the Servers page ─────────────────────────────────────────────
//
// The owner, mapped guild admins and accounts on the owner's tester list. The bot
// answers 404 to everyone else on every server-management route, so this only
// decides whether the header draws the link — it is not the gate.

export type ServerAccess = "owner" | "admin" | "tester";

let accessProbe: Promise<ServerAccess | null> | null = null;

function probeServerAccess(): Promise<ServerAccess | null> {
  accessProbe ??= (async () => {
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(await appCheckHeader())) headers.set(k, v);
      const res = await safeFetch("/api/mp/access", { headers, cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { access?: ServerAccess };
      return data.access ?? null;
    } catch {
      return null;
    }
  })();
  return accessProbe;
}

/** Null until known, and null for anyone without access. */
export function useServerAccess(): ServerAccess | null {
  const signedIn = useSignedIn();
  const [access, setAccess] = useState<ServerAccess | null>(null);
  useEffect(() => {
    if (signedIn !== true) {
      if (signedIn === false) accessProbe = null;
      setAccess(null);
      return;
    }
    let cancelled = false;
    probeServerAccess().then((a) => {
      if (!cancelled) setAccess(a);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
  return access;
}

/** The signed-in account's registered servers; null when signed out. */
export async function fetchServers(): Promise<MpServer[] | null> {
  const res = await authedFetch("/api/mp/servers", { cache: "no-store" });
  if (res.status === 401) return null;
  // 404: no access to server management, or multiplayer is off on the bot.
  if (res.status === 404) throw new Error("Server management isn't available to this account.");
  return (await jsonOrThrow<{ servers: MpServer[] }>(res)).servers;
}

export async function fetchHistory(serverId: string): Promise<HostCommand[]> {
  const res = await authedFetch(`/api/mp/servers/${serverId}/commands`, { cache: "no-store" });
  return (await jsonOrThrow<{ commands: HostCommand[] }>(res)).commands;
}

export async function issueCommand(
  serverId: string,
  cmd: string,
  args: Record<string, unknown> = {},
  totpCode = "",
): Promise<HostCommand> {
  const res = await authedFetch(`/api/mp/servers/${serverId}/commands`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cmd, args, totp_code: totpCode }),
  });
  return (await jsonOrThrow<{ command: HostCommand }>(res)).command;
}

export async function fetchCommand(serverId: string, cid: string): Promise<HostCommand> {
  const res = await authedFetch(`/api/mp/servers/${serverId}/commands/${cid}`, {
    cache: "no-store",
  });
  return (await jsonOrThrow<{ command: HostCommand }>(res)).command;
}

const FINISHED: CommandState[] = ["done", "failed", "expired"];

/**
 * Poll one command until the agent reports. `budgetMs` is how long to keep asking:
 * a restart with a ten-minute warning legitimately takes ten minutes.
 */
export async function waitFor(
  serverId: string,
  cid: string,
  budgetMs = 90_000,
): Promise<HostCommand> {
  const deadline = Date.now() + budgetMs;
  let delay = 800;
  for (;;) {
    const c = await fetchCommand(serverId, cid);
    if (FINISHED.includes(c.state) || Date.now() > deadline) return c;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 4000);
  }
}

/** Issue and wait. Throws the agent's error (with problems) when it failed. */
export async function run(
  serverId: string,
  cmd: string,
  args: Record<string, unknown> = {},
  opts: { totpCode?: string; budgetMs?: number } = {},
): Promise<HostCommand> {
  const issued = await issueCommand(serverId, cmd, args, opts.totpCode ?? "");
  const done = await waitFor(serverId, issued.cid, opts.budgetMs);
  if (done.state === "done") return done;
  const err = new CommandError(
    done.state === "expired"
      ? "The server did not pick that up in time. Is its admin agent running?"
      : done.state === "failed"
        ? done.error || "The server refused that."
        : "Still waiting on the server — check the history in a moment.",
    done,
  );
  throw err;
}

export class CommandError extends Error {
  constructor(message: string, public command: HostCommand) {
    super(message);
    this.name = "CommandError";
  }
}

export const ACTION_LABELS: Record<string, string> = {
  status: "Status",
  "settings.get": "Load settings",
  "settings.set": "Save settings",
  "modset.set": "Upload modset",
  "service.reload": "Reload config",
  "service.restart": "Restart",
  "service.stop": "Stop",
  "service.start": "Start",
};
