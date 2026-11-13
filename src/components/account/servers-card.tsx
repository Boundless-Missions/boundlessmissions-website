"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2, Server, RefreshCw, Power, RotateCcw, Play, Square, FileCog, Package,
  ChevronDown, ChevronRight, ShieldAlert,
} from "lucide-react";

import { MetricsPanel } from "@/components/account/metrics-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ACTION_LABELS, CommandError, fetchHistory, fetchServers, run,
  type HostCommand, type MpServer,
} from "@/lib/mp-servers";
import { cn } from "@/lib/utils";

/**
 * My servers — remote admin of the multiplayer servers this account registered.
 *
 * `ksp-mp-remote-host-admin.md`. Every action is a command the bot signs and the
 * server's agent pulls, so each one is "send, then wait for the host to answer".
 * A server whose agent is not installed, or where the operator has not opted in,
 * is listed read-only with the reason; controls the host would refuse are not
 * drawn at all.
 *
 * Lives on its own page (/servers), linked in the header only for the owner,
 * guild admins and testers; the bot answers 404 to everyone else.
 */
const LIST_POLL_MS = 30_000;
const DEFAULT_WARN = 60;

export function errText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function problemsOf(e: unknown): string[] {
  return e instanceof CommandError ? e.command.problems ?? [] : [];
}

export function when(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

export function ServersCard() {
  const [servers, setServers] = useState<MpServer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setServers(await fetchServers());
      setError(null);
    } catch (e) {
      setError(errText(e, "Couldn't load your servers."));
      setServers((s) => s ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  if (servers === null) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" /> My servers
        </CardTitle>
        <CardDescription>
          Multiplayer servers you registered. Servers running the admin agent with remote
          admin switched on can be managed from here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {servers.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            You have not registered a multiplayer server yet. Registering one gives it an
            identity the server browser trusts; the self-hosting guide walks through it.
          </p>
        )}
        {servers.map((s) => (
          <ServerRow
            key={s.server_id}
            server={s}
            open={open === s.server_id}
            onToggle={() => setOpen(open === s.server_id ? null : s.server_id)}
            onChanged={load}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function AgentBadge({ s }: { s: MpServer }) {
  if (s.revoked) return <Badge variant="muted">Revoked</Badge>;
  if (!s.agent.online) return <Badge variant="muted">Agent offline</Badge>;
  if (s.agent.remote_admin !== "enabled") return <Badge variant="outline">Read-only</Badge>;
  const running = s.agent.active_state === "active";
  return (
    <Badge variant={running ? "default" : "secondary"}>
      {running ? "Running" : s.agent.active_state || "Unknown"}
    </Badge>
  );
}

function ServerRow({ server: s, open, onToggle, onChanged }: {
  server: MpServer; open: boolean; onToggle: () => void; onChanged: () => void;
}) {
  const manageable = !s.revoked && s.agent.online && s.agent.remote_admin === "enabled";
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-3 p-3 text-left hover:bg-accent/40"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{s.name}</span>
          <span className="block font-mono text-xs text-muted-foreground">{s.server_id}</span>
        </span>
        {s.agent.online && typeof s.agent.players === "number" && (
          <span className="text-xs text-muted-foreground">
            {s.agent.players}/{s.agent.max_players ?? "?"} players
          </span>
        )}
        <AgentBadge s={s} />
      </button>
      {open && (
        <div className="border-t border-border p-3">
          {manageable ? (
            <ServerAdmin server={s} onChanged={onChanged} />
          ) : (
            <ReadOnlyNote s={s} />
          )}
        </div>
      )}
    </div>
  );
}

export function ReadOnlyNote({ s }: { s: MpServer }) {
  let text: string;
  if (s.revoked) {
    text = "This server's credential was revoked. Register it again to manage it.";
  } else if (!s.agent.online) {
    text = "The admin agent (bm-hostd) has not checked in. It is not installed on self-hosted " +
      "servers by default — see the self-hosting guide to add it, then switch remote admin on.";
  } else {
    text = "Remote admin is off on this server. To manage it from here, set " +
      "enabled = true under [remote_admin] in /etc/boundless-mp/hostd.toml on the host.";
  }
  return (
    <div className="flex gap-2 text-sm text-muted-foreground">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {text}
        {s.agent.reason ? <span className="mt-1 block text-amber-500">{s.agent.reason}</span> : null}
      </p>
    </div>
  );
}

type Panel = "status" | "usage" | "settings" | "mods" | "history";

function ServerAdmin({ server: s, onChanged }: { server: MpServer; onChanged: () => void }) {
  const allow = new Set(s.agent.allow);
  const [panel, setPanel] = useState<Panel>("status");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; problems: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const act = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      setError({ text: errText(e, "That didn't work."), problems: problemsOf(e) });
    } finally {
      setBusy(null);
      onChanged();
    }
  }, [onChanged]);

  const tabs: { id: Panel; label: string; need?: string }[] = [
    { id: "status", label: "Status", need: "status" },
    { id: "usage", label: "Usage", need: "metrics.get" },
    { id: "settings", label: "Settings", need: "settings.get" },
    { id: "mods", label: "Mods", need: "modset.set" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="space-y-3">
      <PowerBar server={s} allow={allow} busy={busy} act={act} setNote={setNote} />
      <div className="flex gap-1 border-b border-border">
        {tabs.filter((t) => !t.need || allow.has(t.need)).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPanel(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-1.5 text-sm",
              panel === t.id ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 p-2 text-sm text-destructive">
          {error.text}
          {error.problems.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {error.problems.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </div>
      )}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {panel === "status" && <StatusPanel server={s} busy={busy} act={act} />}
      {panel === "usage" && <MetricsPanel server={s} canToggle={allow.has("metrics.set")} />}
      {panel === "settings" && (
        <SettingsPanel server={s} canSave={allow.has("settings.set")} busy={busy} act={act}
                       setNote={setNote} />
      )}
      {panel === "mods" && <ModsPanel server={s} busy={busy} act={act} setNote={setNote} />}
      {panel === "history" && <HistoryPanel server={s} />}
    </div>
  );
}

export type Act = (label: string, fn: () => Promise<void>) => Promise<void>;

export function PowerBar({ server: s, allow, busy, act, setNote, showReload = true }: {
  server: MpServer; allow: Set<string>; busy: string | null; act: Act;
  setNote: (n: string | null) => void;
  /** Off in the server manager's header (reload moves elsewhere later). */
  showReload?: boolean;
}) {
  // One row of buttons; restart and stop open an inline confirmation that holds
  // the warning time, the message players see with the countdown
  // (game/notices.py) and, for stop, the two-factor code. Nothing sits inline
  // permanently, so it fits a narrow header column as well as a wide panel.
  const [confirm, setConfirm] = useState<"restart" | "stop" | null>(null);
  const [warn, setWarn] = useState(DEFAULT_WARN);
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState("");
  const running = s.agent.active_state === "active";

  const doPower = (cmd: string, label: string, args: Record<string, unknown> = {},
                   totpCode = "") =>
    act(label, async () => {
      // A restart with a long warning legitimately takes that long to answer.
      const budget = (Number(args.warn_seconds ?? 0) + 90) * 1000;
      const c = await run(s.server_id, cmd, args, { totpCode, budgetMs: budget });
      const st = (c.result as { active_state?: string } | null)?.active_state;
      setNote(`${ACTION_LABELS[cmd]}: done${st ? ` (server is ${st})` : ""}.`);
    });

  const go = () => {
    const kind = confirm;
    if (!kind) return;
    const args = { warn_seconds: warn, message: notice.trim() };
    const c = code;
    setConfirm(null);
    setCode("");
    void doPower(`service.${kind}`, kind, args, kind === "stop" ? c : "");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {allow.has("service.restart") && running && (
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setConfirm("restart")}>
            {busy === "restart" ? <Loader2 className="animate-spin" /> : <RotateCcw />} Restart
          </Button>
        )}
        {allow.has("service.start") && !running && (
          <Button size="sm" disabled={!!busy} onClick={() => doPower("service.start", "start")}>
            {busy === "start" ? <Loader2 className="animate-spin" /> : <Play />} Start
          </Button>
        )}
        {allow.has("service.stop") && running && (
          <Button size="sm" variant="destructive" disabled={!!busy} onClick={() => setConfirm("stop")}>
            {busy === "stop" ? <Loader2 className="animate-spin" /> : <Square />} Stop
          </Button>
        )}
        {showReload && allow.has("service.reload") && running && (
          <Button size="sm" variant="ghost" disabled={!!busy} title="Re-read host.toml without restarting"
                  onClick={() => doPower("service.reload", "reload")}>
            {busy === "reload" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Reload
          </Button>
        )}
      </div>
      {confirm && (
        <form
          className={cn("space-y-2 rounded-md border p-3 text-sm",
            confirm === "stop" ? "border-destructive/40" : "border-border")}
          onSubmit={(e) => { e.preventDefault(); go(); }}
        >
          <p>
            {confirm === "stop"
              ? `Stop ${s.name}? It stays offline until someone starts it again.`
              : `Restart ${s.name}? Players can rejoin once it is back up.`}
          </p>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Warn players for
            <input
              type="number" min={0} max={600} value={warn}
              onChange={(e) => setWarn(Math.max(0, Math.min(600, Number(e.target.value) || 0)))}
              className="h-8 w-20 rounded-md border border-border bg-transparent px-2 text-sm text-foreground"
              aria-label="Seconds of warning before it happens"
            /> s {warn === 0 && <span className="text-amber-500">— no warning</span>}
          </label>
          {warn > 0 && (
            <input
              value={notice} onChange={(e) => setNotice(e.target.value)} maxLength={200}
              placeholder="Message to players (optional)"
              aria-label="Message shown to players with the countdown"
              className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-sm"
            />
          )}
          {confirm === "stop" && (
            <input
              value={code} onChange={(e) => setCode(e.target.value)}
              inputMode="numeric" autoComplete="one-time-code" placeholder="Two-factor code"
              aria-label="Two-factor code"
              className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-sm"
            />
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant={confirm === "stop" ? "destructive" : "default"}
                    disabled={confirm === "stop" && !code.trim()}>
              {confirm === "stop" ? <Power /> : <RotateCcw />}
              {confirm === "stop" ? "Stop server" : "Restart"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function StatusPanel({ server: s, busy, act }: { server: MpServer; busy: string | null; act: Act }) {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const refresh = () => act("status", async () => {
    setStatus((await run(s.server_id, "status")).result ?? null);
  });
  const rows: [string, unknown][] = status ? [
    ["Service", `${status.active_state ?? "?"}${status.sub_state ? ` (${status.sub_state})` : ""}`],
    ["Since", status.since],
    ["Players", status.players != null ? `${status.players}/${status.max_players ?? "?"}` : "—"],
    ["Universe", status.universe_id],
    ["Server type", status.server_type],
    ["Last reload", status.last_reload_ok === false ? "refused (old config kept)" :
      status.last_reload_ok ? "ok" : "—"],
    ["Config", status.config_pending_reload ? "edited on disk, not reloaded yet" : "in force"],
    ["Mod gate", status.modset_digest ? `on (${String(status.modset_digest).slice(0, 12)}…)` : "off"],
    ["Agent", status.agent_version],
  ] : [];
  const problems = (status?.problems as string[] | undefined) ?? [];
  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" disabled={!!busy} onClick={refresh}>
        {busy === "status" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {status ? "Refresh" : "Ask the server"}
      </Button>
      {status && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words">{v == null || v === "" ? "—" : String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-amber-500">
          {problems.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      )}
    </div>
  );
}

export function SettingsPanel({ server: s, canSave, busy, act, setNote }: {
  server: MpServer; canSave: boolean; busy: string | null; act: Act;
  setNote: (n: string | null) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [base, setBase] = useState("");
  const loaded = useRef("");

  const load = () => act("settings.get", async () => {
    const r = (await run(s.server_id, "settings.get")).result as { toml: string; hash: string };
    setText(r.toml);
    setBase(r.hash);
    loaded.current = r.toml;
  });

  const save = () => act("settings.set", async () => {
    try {
      const c = await run(s.server_id, "settings.set", { toml: text ?? "", base_hash: base });
      const r = c.result as { applied?: string; config_hash?: string } | null;
      setNote(r?.applied === "on_next_start"
        ? "Saved. The server is not running, so it applies when it next starts."
        : "Saved and reloaded. Players stayed connected.");
      if (r?.config_hash) setBase(r.config_hash);
      loaded.current = text ?? "";
    } catch (e) {
      // Someone edited host.toml on the host since we loaded it: show theirs,
      // keep ours in the error so nothing typed is lost silently.
      const cur = e instanceof CommandError ? e.command.result as
        { toml?: string; hash?: string } | null : null;
      if (cur?.toml && cur.hash) {
        setText(cur.toml);
        setBase(cur.hash);
        loaded.current = cur.toml;
        throw new Error("host.toml was changed on the server since you loaded it. Its current " +
          "contents are shown now — make your edit again and save.");
      }
      throw e;
    }
  });

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        The server&apos;s host.toml: its listing (name, summary, description, tags, links) and
        the [mods] pointer. A save is checked by the server before it is written, and rolled back
        if the server refuses to reload it.
      </p>
      {text === null ? (
        <Button size="sm" variant="outline" disabled={!!busy} onClick={load}>
          {busy === "settings.get" ? <Loader2 className="animate-spin" /> : <FileCog />} Load settings
        </Button>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={Math.min(24, Math.max(8, text.split("\n").length + 1))}
            aria-label="host.toml"
            className="w-full rounded-md border border-border bg-transparent p-2 font-mono text-xs"
          />
          <div className="flex gap-2">
            {canSave && (
              <Button size="sm" disabled={!!busy || text === loaded.current} onClick={save}>
                {busy === "settings.set" && <Loader2 className="animate-spin" />} Save
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={load}>Reload from server</Button>
          </div>
        </>
      )}
    </div>
  );
}

export function ModsPanel({ server: s, busy, act, setNote }: {
  server: MpServer; busy: string | null; act: Act; setNote: (n: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = (file: File) => act("modset.set", async () => {
    if (file.size > 256 * 1024) throw new Error("That file is larger than a modset can be (256 KB).");
    let modset: unknown;
    try {
      modset = JSON.parse(await file.text());
    } catch {
      throw new Error("That is not a JSON file. Upload the modset.json exported from your install.");
    }
    await run(s.server_id, "modset.set", { modset: modset as object });
    setNote("Modset installed. Joining players are checked against it from now on.");
  });
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Upload the modset.json exported from your reference install. The server checks it, writes
        it beside host.toml and reloads; the unknown-mod policy is the one inside the file.
      </p>
      <input
        ref={fileRef} type="file" accept="application/json,.json" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void upload(f);
        }}
      />
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => fileRef.current?.click()}>
        {busy === "modset.set" ? <Loader2 className="animate-spin" /> : <Package />} Upload modset.json
      </Button>
    </div>
  );
}

export function HistoryPanel({ server: s }: { server: MpServer }) {
  const [rows, setRows] = useState<HostCommand[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchHistory(s.server_id).then(setRows).catch((e) => {
      setError(errText(e, "Couldn't load the history."));
      setRows([]);
    });
  }, [s.server_id]);
  if (rows === null) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Nothing yet.</p>;
  return (
    <ul className="divide-y divide-border text-sm">
      {rows.map((r) => (
        <li key={r.cid} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
          <span className="font-medium">{ACTION_LABELS[r.cmd] ?? r.cmd}</span>
          <span className="text-xs text-muted-foreground">{when(r.issued_at)}</span>
          <Badge
            variant={r.state === "done" ? "default" : r.state === "failed" ? "outline" : "muted"}
            className={cn(r.state === "failed" && "border-destructive/40 text-destructive")}
          >
            {r.state}
          </Badge>
          {r.error && <span className="w-full text-xs text-muted-foreground">{r.error}</span>}
        </li>
      ))}
    </ul>
  );
}
