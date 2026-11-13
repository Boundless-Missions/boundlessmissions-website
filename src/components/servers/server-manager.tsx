"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Clock, Copy, Check, Globe, Loader2, MapPin, Signal, Cpu, Server as ServerIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchServers, usePing, type MpServer } from "@/lib/mp-servers";
import { MetricsPanel } from "@/components/account/metrics-panel";
import {
  HistoryPanel, ModsPanel, PowerBar, ReadOnlyNote, SettingsPanel, errText, problemsOf,
  type Act,
} from "@/components/account/servers-card";
import {
  AccessGlyph, ConsoleGlyph, FilesGlyph, LogsGlyph, ModsGlyph, OptionsGlyph, PlayersGlyph,
  PowerGlyph, VesselsGlyph,
} from "@/components/servers/glyphs";
import { OptionsForm } from "@/components/servers/options-form";
import { ConsoleShell } from "@/components/servers/console-shell";

/**
 * The server manager (Multiplayer Implementation Plans/Server Manager Concept 1).
 *
 * A sidebar of sections for ONE server, each a route: /servers/<id>/<section>.
 * The header card (Server section) reads only what the agent already reports on
 * its poll (no command spent) plus the master's public listing, so it can stay
 * live; anything that needs the host to do work is a command, as before.
 */

export const SECTIONS = [
  { id: "server", label: "Server", Glyph: PowerGlyph },
  { id: "options", label: "Options", Glyph: OptionsGlyph },
  { id: "console", label: "Console", Glyph: ConsoleGlyph },
  { id: "files", label: "Files", Glyph: FilesGlyph },
  { id: "players", label: "Players", Glyph: PlayersGlyph },
  { id: "vessels", label: "Vessels", Glyph: VesselsGlyph },
  { id: "mods", label: "Mods", Glyph: ModsGlyph },
  { id: "logs", label: "Logs", Glyph: LogsGlyph },
  { id: "access", label: "Access", Glyph: AccessGlyph },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];

const POLL_MS = 15_000;

function fmtBytes(v?: number | null): string {
  if (v == null) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = v;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n >= 100 || i === 0 ? n.toFixed(0) : n.toFixed(1)} ${u[i]}`;
}

function fmtUptime(startedWc?: number | null): string {
  if (!startedWc) return "—";
  let s = Math.max(0, Math.floor(Date.now() / 1000 - startedWc));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}

export function ServerManager({ serverId, section }: { serverId: string; section: SectionId }) {
  const [servers, setServers] = useState<MpServer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setServers(await fetchServers());
      setError(null);
    } catch (e) {
      setError(errText(e, "Couldn't load your servers."));
      setServers((s) => s ?? []);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { void load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const server = useMemo(() => servers?.find((s) => s.server_id === serverId) ?? null, [servers, serverId]);

  if (servers === null) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!server) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="mb-4">{error ?? "That server is not one of yours."}</p>
        <Link href="/servers?all=1" className="text-primary hover:underline">All servers</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
      <Sidebar server={server} section={section} many={servers.length > 1} />
      <div className="min-w-0 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Section server={server} section={section} onChanged={load} />
      </div>
    </div>
  );
}

function Sidebar({ server, section, many }: { server: MpServer; section: SectionId; many: boolean }) {
  return (
    <nav aria-label="Server sections" className="lg:pt-2">
      <Link href="/servers?all=1"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {many ? "All servers" : "Servers"}
      </Link>
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {SECTIONS.map(({ id, label, Glyph }) => {
          const active = id === section;
          return (
            <li key={id} className="shrink-0">
              <Link
                href={`/servers/${server.server_id}/${id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-l-md px-4 py-2.5 text-[1.05rem] tracking-wide transition-colors",
                  active
                    ? "bg-gradient-to-r from-primary/80 via-primary/25 to-transparent text-foreground"
                    : "text-foreground/85 hover:bg-gradient-to-r hover:from-primary/15 hover:to-transparent",
                )}
              >
                <Glyph className={cn("h-6 w-6 shrink-0 [filter:drop-shadow(2px_1px_2px_rgb(0_0_0/0.7))]",
                  active ? "text-foreground" : "text-primary")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function useActions(onChanged: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; problems: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const act: Act = useCallback(async (label, fn) => {
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
  const banner = (
    <>
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
    </>
  );
  return { busy, act, setNote, banner };
}

function Section({ server: s, section, onChanged }: {
  server: MpServer; section: SectionId; onChanged: () => void;
}) {
  const { busy, act, setNote, banner } = useActions(onChanged);
  const manageable = !s.revoked && s.agent.online && s.agent.remote_admin === "enabled";
  const allow = new Set(s.agent.allow);

  if (section === "server") {
    return (
      <>
        <HeaderCard server={s} allow={allow} manageable={manageable} busy={busy} act={act} setNote={setNote} />
        {banner}
        {!manageable && <Card><CardContent className="p-5"><ReadOnlyNote s={s} /></CardContent></Card>}
        <DetailsGrid server={s} />
        {manageable && allow.has("metrics.get") && (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-lg font-semibold">Usage over time</h2>
              <MetricsPanel server={s} canToggle={allow.has("metrics.set")} />
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  if (!manageable && section !== "access") {
    return <Card><CardContent className="p-5"><ReadOnlyNote s={s} /></CardContent></Card>;
  }

  switch (section) {
    case "options":
      return (
        <>
          {banner}
          <OptionsForm server={s} canSave={allow.has("listing.set")} busy={busy} act={act} setNote={setNote} />
          {allow.has("settings.get") && (
            <details className="rounded-xl border border-border bg-card p-5">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Edit host.toml directly (advanced)
              </summary>
              <div className="mt-4">
                <SettingsPanel server={s} canSave={allow.has("settings.set")} busy={busy} act={act}
                               setNote={setNote} />
              </div>
            </details>
          )}
        </>
      );
    case "console":
      return <ConsoleShell server={s} />;
    case "mods":
      return (
        <Card><CardContent className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Mods</h2>
          {banner}
          {allow.has("modset.set") ? <ModsPanel server={s} busy={busy} act={act} setNote={setNote} />
            : <p className="text-sm text-muted-foreground">This server does not allow mod changes remotely.</p>}
        </CardContent></Card>
      );
    case "logs":
      return (
        <Card><CardContent className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Activity</h2>
          <p className="text-sm text-muted-foreground">
            Everything done to this server from the website. The game server&apos;s own log comes
            later: it names players and their addresses, so it needs a redaction pass first.
          </p>
          <HistoryPanel server={s} />
        </CardContent></Card>
      );
    case "access":
      return <AccessPanel server={s} />;
    default:
      return <Pending section={section} server={s} />;
  }
}

function Copyable({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }); }}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
      aria-label="Copy the server id"
    >
      {text} {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function HeaderCard({ server: s, allow, manageable, busy, act, setNote }: {
  server: MpServer; allow: Set<string>; manageable: boolean; busy: string | null; act: Act;
  setNote: (n: string | null) => void;
}) {
  const a = s.agent;
  const l = s.listing;
  const ping = usePing();
  const initials = s.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const cpu = a.cpu_pct != null ? a.cpu_pct / (a.cpu_count || 1) : null;
  const ram = a.host_mem_used != null && a.host_mem_total ? (a.host_mem_used / a.host_mem_total) * 100 : null;
  const running = a.online && a.active_state === "active";
  const statusText = s.revoked ? "Revoked" : !a.online ? "Agent offline"
    : running ? "Running" : a.active_state === "inactive" ? "Stopped" : (a.active_state || "Unknown");

  return (
    <Card>
      <CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:divide-x md:divide-border">
        <div className="flex min-w-0 items-center gap-4">
          {l?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded-md border border-border object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-xl font-bold text-primary">
              {initials || <ServerIcon className="h-7 w-7" />}
            </div>
          )}
          <div className="min-w-0">
            <div className="line-clamp-2 text-lg font-semibold leading-snug">{s.name}</div>
            <Copyable text={s.server_id} />
          </div>
        </div>

        <div className="min-w-0 space-y-1.5 md:pl-5">
          <div className="flex items-center gap-2 font-mono text-sm">
            <Globe className="h-4 w-4 shrink-0 text-primary" />
            {l?.address ? `${l.address}${l.port ? `:${l.port}` : ""}` : "not listed"}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"
               title="Approximate location of the server's address">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            {s.location?.label ?? (l ? "Location unknown" : "Location appears once listed")}
          </div>
          {l && l.reachable !== "reachable" && (
            <div className="text-xs text-amber-500">Not reachable from the internet ({l.reachable ?? "unknown"})</div>
          )}
        </div>

        <div className="min-w-0 space-y-1.5 md:pl-5">
          <div className="flex items-center gap-2 whitespace-nowrap text-sm tabular-nums"
               title="Your round trip to Boundless Missions' server. Browsers cannot time the game server itself (its certificate is self-signed).">
            <Signal className="h-4 w-4 shrink-0 text-primary" /> Ping {ping != null ? `${ping} ms` : "—"}
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap text-sm tabular-nums"
               title="CPU: the game server's share of the whole host. RAM: the host's memory in use.">
            <Cpu className="h-4 w-4 shrink-0 text-primary" />
            CPU {cpu != null ? `${cpu.toFixed(cpu < 10 ? 1 : 0)}%` : "—"}
            <span className="text-muted-foreground">|</span>
            RAM {ram != null ? `${ram.toFixed(0)}%` : "—"}
          </div>
        </div>

        <div className="min-w-0 space-y-2 md:pl-5">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full",
              running ? "bg-primary" : a.online ? "bg-amber-500" : "bg-muted-foreground")} aria-hidden />
            <span className="text-base font-semibold">{statusText}</span>
          </div>
          {manageable ? (
            <PowerBar server={s} allow={allow} busy={busy} act={act} setNote={setNote} />
          ) : (
            <p className="text-xs text-muted-foreground">Controls appear when the admin agent is connected and remote admin is on.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsGrid({ server: s }: { server: MpServer }) {
  const a = s.agent;
  const tiles: [string, string, string?][] = [
    ["Players online", a.players != null ? `${a.players} / ${a.max_players ?? "?"}` : "—"],
    ["Active vessels", a.vessels_active != null ? String(a.vessels_active) : "—",
      a.vessels_total != null ? `${a.vessels_total} in the universe` : undefined],
    ["Live bubbles", a.bubbles_live != null ? String(a.bubbles_live) : "—", "craft sharing physics now"],
    ["Uptime", a.active_state === "active" ? fmtUptime(a.started_wc) : "—"],
    ["Universe size", fmtBytes(a.store_bytes)],
    ["Game memory", fmtBytes(a.mem_bytes),
      a.host_mem_total ? `host ${fmtBytes(a.host_mem_used)} of ${fmtBytes(a.host_mem_total)}` : undefined],
    ["Server type", a.server_type === "full_combat" ? "Full Combat" : a.server_type === "standard" ? "Standard" : "—",
      a.universe_id ?? undefined],
    ["Admin agent", a.version ? `v${a.version}` : "—",
      a.online ? `seen ${a.seen_seconds_ago ?? 0} s ago` : "offline"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map(([k, v, sub]) => (
        <div key={k} className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">{k}</div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums">{v}</div>
          {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
      ))}
    </div>
  );
}

function AccessPanel({ server: s }: { server: MpServer }) {
  const a = s.agent;
  return (
    <Card><CardContent className="space-y-4 p-5">
      <h2 className="text-lg font-semibold">Access</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Owner</dt><dd>You (the account that registered it)</dd>
        <dt className="text-muted-foreground">Remote admin</dt>
        <dd>{a.remote_admin === "enabled" ? "On" : a.remote_admin === "unknown" ? "Unknown (agent offline)" : "Off"}
          {a.reason ? <span className="block text-xs text-amber-500">{a.reason}</span> : null}</dd>
        <dt className="text-muted-foreground">Allowed actions</dt>
        <dd className="flex flex-wrap gap-1.5">
          {(a.allow ?? []).length ? a.allow.map((x) => (
            <span key={x} className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">{x}</span>
          )) : <span className="text-muted-foreground">none</span>}
        </dd>
        <dt className="text-muted-foreground">The switch</dt>
        <dd className="text-muted-foreground">
          <code className="text-xs">/etc/boundless-mp/hostd.toml</code> on the server. Nothing done from
          here can change it — turning remote admin off there takes effect at the next command.
        </dd>
      </dl>
      <p className="text-sm text-muted-foreground">Co-admins (letting other accounts manage this server) come in a later update.</p>
    </CardContent></Card>
  );
}

const PENDING: Record<string, string> = {
  files: "Browse and manage the server's files.",
  players: "Who is online, who has played here, and moderation.",
  vessels: "Every craft in this universe and where it is.",
};

function Pending({ section, server: s }: { section: SectionId; server: MpServer }) {
  const a = s.agent;
  const known = section === "players" ? `${a.players ?? 0} online now.`
    : section === "vessels" ? `${a.vessels_active ?? 0} active, ${a.vessels_total ?? 0} in the universe.`
    : null;
  return (
    <Card><CardContent className="flex min-h-[18rem] flex-col items-center justify-center gap-2 p-8 text-center">
      <Clock className="h-6 w-6 text-primary" />
      <h2 className="text-lg font-semibold">{SECTIONS.find((x) => x.id === section)?.label}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{PENDING[section] ?? ""} Coming with the next design pass.</p>
      {known && <p className="text-sm">{known}</p>}
    </CardContent></Card>
  );
}
