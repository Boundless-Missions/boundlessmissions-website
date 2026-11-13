"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, RefreshCw, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { run, type MpServer } from "@/lib/mp-servers";

/**
 * Resource usage over time for one server (hostd/metrics.py on the host).
 *
 * The host samples every 15 s while players are online and every 5 min
 * otherwise, and keeps the history itself; this asks for a range and gets it
 * bucketed to at most ~600 points, each bucket carrying its mean and (for
 * spiky measures) its peak — so a short CPU spike stays visible in a 30-day view.
 *
 * Charts are small multiples on one shared time axis with a synchronized
 * crosshair: one measure per chart, never two y-scales. Colors are the
 * validated dark-surface categorical steps (blue, orange, aqua); text never
 * wears a series color. Gaps longer than the sampling interval, and periods the
 * server was down, are drawn as gaps, not interpolated across.
 */

// Validated against #0f0f0f (dataviz validate_palette.js --mode dark): all pass.
const S1 = "#3987e5";
const S2 = "#d95926";
const S3 = "#199e70";

type Range = { id: string; label: string; seconds: number };
const RANGES: Range[] = [
  { id: "1h", label: "1 hour", seconds: 3600 },
  { id: "6h", label: "6 hours", seconds: 6 * 3600 },
  { id: "24h", label: "24 hours", seconds: 86400 },
  { id: "7d", label: "7 days", seconds: 7 * 86400 },
  { id: "30d", label: "30 days", seconds: 30 * 86400 },
];
const AUTO_REFRESH_MS = 30_000;
const MAX_POINTS = 600;

interface MetricsData {
  t: number[];
  interval: (number | null)[];
  avg: Record<string, (number | null)[]>;
  max: Record<string, (number | null)[]>;
  bucket_seconds: number | null;
  samples_in_range: number;
  from: number;
  to: number;
  config: { enabled: boolean; retention_days: number };
  stats: { samples: number; first_t: number | null; last_t: number | null; db_bytes: number };
  sampling: { active_seconds: number; idle_seconds: number };
  cpu_count: number;
}

// ── formatting ───────────────────────────────────────────────────────────────

function fmtBytes(v: number | null | undefined): string {
  if (v == null) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = Math.abs(v);
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n >= 100 || i === 0 ? n.toFixed(0) : n.toFixed(1)} ${u[i]}`;
}
const fmtRate = (v: number | null | undefined) => (v == null ? "—" : `${fmtBytes(v)}/s`);
const fmtPct = (v: number | null | undefined) =>
  v == null ? "—" : v === 0 ? "0%" : `${v.toFixed(v < 10 ? 1 : 0)}%`;
const fmtNum = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(v < 10 ? 2 : 0));
const fmtInt = (v: number | null | undefined) => (v == null ? "—" : String(Math.round(v)));

function fmtTime(t: number, span: number): string {
  const d = new Date(t * 1000);
  if (span <= 86400) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    (span <= 3 * 86400 ? " " + d.toLocaleTimeString([], { hour: "2-digit" }) : "");
}
const fmtFull = (t: number) =>
  new Date(t * 1000).toLocaleString([], { month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit" });

// ── scales ───────────────────────────────────────────────────────────────────

function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/** 0-based y ticks; byte measures step in powers of 1024 so labels stay round. */
function yTicks(max: number, bytes: boolean): number[] {
  if (!(max > 0)) return [0, 1];
  let step: number;
  if (bytes) {
    const unit = Math.pow(1024, Math.max(0, Math.floor(Math.log(max) / Math.log(1024))));
    step = niceStep(max / unit / 4) * unit;
  } else {
    step = niceStep(max / 4);
  }
  const out = [];
  for (let v = 0; v <= max + step * 0.999; v += step) out.push(v);
  return out.length < 2 ? [0, step] : out;
}

const TIME_STEPS = [60, 300, 900, 1800, 3600, 3 * 3600, 6 * 3600, 12 * 3600, 86400,
  2 * 86400, 7 * 86400];

function xTicks(from: number, to: number, width: number): number[] {
  const want = Math.max(2, Math.floor(width / 110));
  const step = TIME_STEPS.find((s) => (to - from) / s <= want) ?? TIME_STEPS[TIME_STEPS.length - 1];
  const tz = new Date().getTimezoneOffset() * 60;   // align to local midnight/hours
  const out = [];
  for (let v = Math.ceil((from - tz) / step) * step + tz; v <= to; v += step) out.push(v);
  return out;
}

// ── one chart ────────────────────────────────────────────────────────────────

interface Series {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  peaks?: (number | null)[];
}

interface ChartProps {
  title: string;
  subtitle?: string;
  series: Series[];
  format: (v: number | null | undefined) => string;
  bytes?: boolean;
  step?: boolean;
  /** A labelled hairline, e.g. the host's total memory. */
  reference?: { value: number; label: string };
  data: MetricsData;
  breaks: boolean[];
  down: boolean[];
  hover: number | null;
  setHover: (i: number | null) => void;
  width: number;
}

const H = 150;
const PAD = { l: 64, r: 12, t: 10, b: 22 };

function TimeChart(p: ChartProps) {
  const { data, width } = p;
  const innerW = Math.max(10, width - PAD.l - PAD.r);
  const innerH = H - PAD.t - PAD.b;
  const x = (t: number) => PAD.l + ((t - data.from) / (data.to - data.from)) * innerW;
  let ymax = 0;
  for (const s of p.series) {
    for (const v of s.peaks ?? s.values) if (v != null && v > ymax) ymax = v;
    for (const v of s.values) if (v != null && v > ymax) ymax = v;
  }
  if (p.reference && p.reference.value > ymax) ymax = p.reference.value;
  const ticks = yTicks(ymax, !!p.bytes);
  const top = ticks[ticks.length - 1] || 1;
  const y = (v: number) => PAD.t + innerH - (v / top) * innerH;

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v == null || p.breaks[i] || p.down[i]) { pen = false; if (v == null || p.down[i]) return; }
      const px = x(data.t[i]).toFixed(1);
      const py = y(v as number).toFixed(1);
      if (!pen) { d += `M${px},${py}`; pen = true; }
      else if (p.step) d += `H${px}V${py}`;
      else d += `L${px},${py}`;
    });
    return d;
  };

  const band = (s: Series) => {
    if (!s.peaks) return "";
    let d = "";
    let seg: number[] = [];
    const flush = () => {
      if (seg.length < 2) { seg = []; return; }
      d += "M" + seg.map((i) => `${x(data.t[i]).toFixed(1)},${y(s.peaks![i] as number).toFixed(1)}`).join("L");
      d += "L" + [...seg].reverse().map((i) => `${x(data.t[i]).toFixed(1)},${y(s.values[i] as number).toFixed(1)}`).join("L") + "Z";
      seg = [];
    };
    s.values.forEach((v, i) => {
      if (v == null || s.peaks![i] == null || p.breaks[i] || p.down[i]) flush();
      if (v != null && s.peaks![i] != null && !p.down[i]) seg.push(i);
    });
    flush();
    return d;
  };

  // Downtime bands: runs of samples where the service was not active.
  const downBands: [number, number][] = [];
  let start: number | null = null;
  p.down.forEach((dn, i) => {
    if (dn && start === null) start = i;
    if ((!dn || i === p.down.length - 1) && start !== null) {
      downBands.push([data.t[start], data.t[dn ? i : i - 1]]);
      start = null;
    }
  });

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const t = data.from + ((e.clientX - r.left) / r.width) * (data.to - data.from);
    let best = -1;
    let bestD = Infinity;
    data.t.forEach((ti, i) => {
      const dd = Math.abs(ti - t);
      if (dd < bestD) { bestD = dd; best = i; }
    });
    p.setHover(best >= 0 ? best : null);
  };

  const hi = p.hover;
  const last = (vals: (number | null)[]) => {
    for (let i = vals.length - 1; i >= 0; i--) if (vals[i] != null) return i;
    return -1;
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
        <h4 className="text-sm font-medium">{p.title}</h4>
        {p.subtitle && <span className="text-xs text-muted-foreground">{p.subtitle}</span>}
        {p.series.length > 1 && (
          <span className="ml-auto flex gap-3 text-xs text-muted-foreground" aria-label="Legend">
            {p.series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <svg width="14" height="4" aria-hidden><rect width="14" height="2" y="1" rx="1" fill={s.color} /></svg>
                {s.label}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="relative">
        <svg width={width} height={H} role="img"
             aria-label={`${p.title} over the selected range`} className="block">
          {downBands.map(([a, b], i) => (
            <rect key={i} x={x(a)} y={PAD.t} width={Math.max(2, x(b) - x(a))} height={innerH}
                  fill="hsl(var(--muted-foreground))" opacity={0.08} />
          ))}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(v)} y2={y(v)}
                    stroke="hsl(var(--border))" strokeWidth={1} />
              <text x={PAD.l - 6} y={y(v)} dy="0.32em" textAnchor="end"
                    className="fill-muted-foreground" fontSize={10}>{p.format(v)}</text>
            </g>
          ))}
          {xTicks(data.from, data.to, innerW).map((t) => (
            <text key={t} x={x(t)} y={H - 6} textAnchor="middle"
                  className="fill-muted-foreground" fontSize={10}>
              {fmtTime(t, data.to - data.from)}
            </text>
          ))}
          {p.reference && (
            <g>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(p.reference.value)} y2={y(p.reference.value)}
                    stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.6} />
              <text x={width - PAD.r} y={y(p.reference.value) - 4} textAnchor="end"
                    className="fill-muted-foreground" fontSize={10}>{p.reference.label}</text>
            </g>
          )}
          {p.series.map((s) => s.peaks && (
            <path key={s.key + "-band"} d={band(s)} fill={s.color} opacity={0.12} />
          ))}
          {p.series.map((s) => (
            <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {/* end dots: where each series stands now */}
          {hi === null && p.series.map((s) => {
            const i = last(s.values);
            if (i < 0) return null;
            return <circle key={s.key + "-end"} cx={x(data.t[i])} cy={y(s.values[i] as number)} r={4}
                           fill={s.color} stroke="hsl(var(--card))" strokeWidth={2} />;
          })}
          {hi !== null && data.t[hi] != null && (
            <g pointerEvents="none">
              <line x1={x(data.t[hi])} x2={x(data.t[hi])} y1={PAD.t} y2={PAD.t + innerH}
                    stroke="hsl(var(--foreground))" strokeWidth={1} opacity={0.35} />
              {p.series.map((s) => s.values[hi] != null && (
                <circle key={s.key} cx={x(data.t[hi])} cy={y(s.values[hi] as number)} r={4}
                        fill={s.color} stroke="hsl(var(--card))" strokeWidth={2} />
              ))}
            </g>
          )}
          <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} fill="transparent"
                onPointerMove={onMove} onPointerLeave={() => p.setHover(null)} />
        </svg>
        {hi !== null && data.t[hi] != null && (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-[10rem] rounded-md border border-border bg-card/95 px-2.5 py-1.5 text-xs shadow-lg"
            style={x(data.t[hi]) > width / 2
              ? { right: width - x(data.t[hi]) + 10 } : { left: x(data.t[hi]) + 10 }}
          >
            <div className="mb-1 text-muted-foreground">
              {fmtFull(data.t[hi])}
              {data.bucket_seconds ? ` · ${Math.round(data.bucket_seconds / 60)} min avg` : ""}
            </div>
            {p.down[hi] ? <div className="text-muted-foreground">server down</div> :
              p.series.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <svg width="10" height="4" aria-hidden><rect width="10" height="2" y="1" rx="1" fill={s.color} /></svg>
                  <span className="font-semibold text-foreground">{p.format(s.values[hi])}</span>
                  {s.peaks && s.peaks[hi] != null && (
                    <span className="text-muted-foreground">peak {p.format(s.peaks[hi])}</span>
                  )}
                  <span className="text-muted-foreground">{s.label}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── the panel ────────────────────────────────────────────────────────────────

export function MetricsPanel({ server, canToggle }: { server: MpServer; canToggle: boolean }) {
  const [range, setRange] = useState<Range>(RANGES[2]);
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const [toggling, setToggling] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const to = Date.now() / 1000;
      const c = await run(server.server_id, "metrics.get",
        { from: to - range.seconds, to, max_points: MAX_POINTS });
      const r = c.result as unknown as MetricsData | null;
      // A malformed answer (an older agent, a proxy page) must not take the page
      // down: refuse it here, with a sentence, instead of crashing a chart.
      if (!r || !Array.isArray(r.t) || !r.avg || !r.sampling || !r.config || !r.stats) {
        throw new Error("The server answered in a shape this page does not understand. Is its agent up to date?");
      }
      setData(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load usage.");
    } finally {
      setLoading(false);
    }
  }, [server.server_id, range]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    // Live view only makes sense for short ranges; a 30-day chart does not move.
    if (!auto || range.seconds > 86400) return;
    const t = setInterval(() => { void load(); }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [auto, range, load]);

  const toggleLogging = async () => {
    if (!data) return;
    setToggling(true);
    try {
      await run(server.server_id, "metrics.set", { enabled: !data.config.enabled });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change logging.");
    } finally {
      setToggling(false);
    }
  };

  // Breaks: a gap longer than the sampling allows; down: the service was not active.
  const { breaks, down } = useMemo(() => {
    if (!data) return { breaks: [], down: [] };
    const idle = data.sampling.idle_seconds;
    const slack = Math.max((data.bucket_seconds ?? 0) * 2.5, idle * 1.6);
    return {
      breaks: data.t.map((t, i) => i > 0 && t - data.t[i - 1] > slack),
      down: data.t.map((_, i) => (data.avg.up?.[i] ?? 1) < 0.5),
    };
  }, [data]);

  const csv = () => {
    if (!data) return;
    const cols = Object.keys(data.avg);
    const peaks = Object.keys(data.max);
    const head = ["time_utc", ...cols, ...peaks.map((k) => `${k}_peak`)];
    const lines = [head.join(",")];
    data.t.forEach((t, i) => {
      lines.push([new Date(t * 1000).toISOString(), ...cols.map((k) => data.avg[k][i] ?? ""),
        ...peaks.map((k) => data.max[k][i] ?? "")].join(","));
    });
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${server.server_id}-usage-${range.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const now = (k: string) => {
    if (!data) return null;
    const v = data.avg[k];
    for (let i = v.length - 1; i >= 0; i--) if (v[i] != null) return v[i];
    return null;
  };
  const pk = (k: string) => data?.max[k];
  const common = data ? { data, breaks, down, hover, setHover, width } : null;
  const memTotal = now("host_mem_total");
  const diskTotal = now("disk_total");

  return (
    <div className="space-y-3" ref={boxRef}>
      {/* One row of controls, above everything it scopes. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" onClick={() => setRange(r)}
                    className={cn("rounded px-2.5 py-1 text-xs",
                      r.id === range.id ? "bg-accent font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground")}>
              {r.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
        </Button>
        {range.seconds <= 86400 && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Live (30 s)
          </label>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setTable(!table)} disabled={!data}>
            <Table2 /> {table ? "Charts" : "Table"}
          </Button>
          <Button size="sm" variant="ghost" onClick={csv} disabled={!data || data.t.length === 0}>
            <Download /> CSV
          </Button>
          {canToggle && data && (
            <Button size="sm" variant={data.config.enabled ? "outline" : "default"}
                    onClick={() => void toggleLogging()} disabled={toggling}>
              {toggling && <Loader2 className="animate-spin" />}
              {data.config.enabled ? "Pause logging" : "Resume logging"}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && (
        <p className="text-xs text-muted-foreground">
          {data.config.enabled
            ? `Logging every ${data.sampling.active_seconds} s with players online, every ${Math.round(data.sampling.idle_seconds / 60)} min otherwise. `
            : "Logging is paused: nothing new is recorded. "}
          Kept {data.config.retention_days} days on the server ({fmtBytes(data.stats.db_bytes)},{" "}
          {data.stats.samples.toLocaleString()} samples).{" "}
          {data.bucket_seconds
            ? `Each point averages ${data.bucket_seconds >= 3600 ? `${(data.bucket_seconds / 3600).toFixed(1)} h` : `${Math.round(data.bucket_seconds / 60)} min`}; shaded bands reach each bucket's peak.`
            : "Every recorded sample is shown."}
        </p>
      )}

      {!data && !error && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {data && common && data.t.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No samples in this range yet{data.config.enabled ? " — the first arrives within 5 minutes." : "."}
        </p>
      )}

      {data && common && data.t.length > 0 && !table && (
        <div className={cn("space-y-3 transition-opacity", loading && "opacity-60")}>
          {/* Now: the latest value of each measure. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["CPU", fmtPct(now("cpu_pct"))],
              ["Memory", fmtBytes(now("mem_bytes"))],
              ["Players", fmtInt(now("players"))],
              ["Universe", fmtBytes(now("store_bytes"))],
              ["Disk", diskTotal ? `${fmtBytes(now("disk_used"))} / ${fmtBytes(diskTotal)}` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="text-lg font-semibold tabular-nums">{v}</div>
              </div>
            ))}
          </div>
          <TimeChart {...common} title="CPU" format={fmtPct}
                     subtitle={`game server, % of one core (host has ${data.cpu_count})`}
                     series={[{ key: "cpu", label: "CPU", color: S1, values: data.avg.cpu_pct, peaks: pk("cpu_pct") }]} />
          <TimeChart {...common} title="Memory" format={fmtBytes} bytes
                     reference={memTotal ? { value: memTotal, label: `host total ${fmtBytes(memTotal)}` } : undefined}
                     series={[
                       { key: "game", label: "Game server", color: S1, values: data.avg.mem_bytes, peaks: pk("mem_bytes") },
                       { key: "host", label: "Whole host in use", color: S2, values: data.avg.host_mem_used },
                     ]} />
          <TimeChart {...common} title="Players online" format={fmtInt} step
                     series={[{ key: "players", label: "Players", color: S3, values: data.avg.players, peaks: pk("players") }]} />
          <TimeChart {...common} title="Network" format={fmtRate} bytes subtitle="game server traffic"
                     series={[
                       { key: "rx", label: "In", color: S1, values: data.avg.net_rx_bps, peaks: pk("net_rx_bps") },
                       { key: "tx", label: "Out", color: S2, values: data.avg.net_tx_bps, peaks: pk("net_tx_bps") },
                     ]} />
          <TimeChart {...common} title="Disk I/O" format={fmtRate} bytes subtitle="game server reads and writes"
                     series={[
                       { key: "rd", label: "Read", color: S1, values: data.avg.io_read_bps, peaks: pk("io_read_bps") },
                       { key: "wr", label: "Write", color: S2, values: data.avg.io_write_bps, peaks: pk("io_write_bps") },
                     ]} />
          <TimeChart {...common} title="Universe size" format={fmtBytes} bytes
                     subtitle="the save file, with its write-ahead log"
                     series={[{ key: "store", label: "Universe", color: S1, values: data.avg.store_bytes }]} />
          <TimeChart {...common} title="Host load" format={fmtNum}
                     subtitle={`1-minute load average (${data.cpu_count} core${data.cpu_count === 1 ? "" : "s"})`}
                     series={[{ key: "load", label: "Load", color: S1, values: data.avg.host_load1, peaks: pk("host_load1") }]} />
        </div>
      )}

      {data && table && data.t.length > 0 && (
        <div className="max-h-[32rem] overflow-auto rounded-lg border border-border bg-card">
          <table className="w-full text-xs tabular-nums">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr>
                {["Time", "Up", "Players", "CPU", "CPU peak", "Memory", "Host mem", "Net in",
                  "Net out", "Disk read", "Disk write", "Universe", "Load"].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.t.map((t, i) => (
                <tr key={t} className="border-t border-border">
                  <td className="whitespace-nowrap px-2 py-1">{fmtFull(t)}</td>
                  <td className="px-2 py-1">{down[i] ? "down" : "up"}</td>
                  <td className="px-2 py-1">{fmtInt(data.avg.players[i])}</td>
                  <td className="px-2 py-1">{fmtPct(data.avg.cpu_pct[i])}</td>
                  <td className="px-2 py-1">{fmtPct(data.max.cpu_pct?.[i])}</td>
                  <td className="px-2 py-1">{fmtBytes(data.avg.mem_bytes[i])}</td>
                  <td className="px-2 py-1">{fmtBytes(data.avg.host_mem_used[i])}</td>
                  <td className="px-2 py-1">{fmtRate(data.avg.net_rx_bps[i])}</td>
                  <td className="px-2 py-1">{fmtRate(data.avg.net_tx_bps[i])}</td>
                  <td className="px-2 py-1">{fmtRate(data.avg.io_read_bps[i])}</td>
                  <td className="px-2 py-1">{fmtRate(data.avg.io_write_bps[i])}</td>
                  <td className="px-2 py-1">{fmtBytes(data.avg.store_bytes[i])}</td>
                  <td className="px-2 py-1">{fmtNum(data.avg.host_load1[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
