"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, FileUp, Link2, Loader2,
  PackageCheck, Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CommandError, run, type MpServer } from "@/lib/mp-servers";
import type { Act } from "@/components/account/servers-card";
import { cn } from "@/lib/utils";

/**
 * Files — the mods players need to join this server, and where they get each one.
 *
 * Players install a server's mods through the BM Launcher, which reads the
 * server's mod list (modset). Mods on CKAN install by themselves; every other
 * required mod needs a download — today a GitHub release file. KSP's "Export
 * server modset" writes those with the link left empty, and the server refuses
 * the list until each is filled in. This page is where that happens, without
 * anyone editing JSON:
 *
 *   import the exported list → paste a release link per mod → the server
 *   downloads it once, hashes it and checks it really contains the mod's folders
 *   (files.inspect) → save (modset.set, validated and reloaded on the host).
 *
 * Adding or removing mods is NOT done here: the list carries a fingerprint of
 * the owner's game install (physics/terrain hashes), so it must come from the
 * game. A re-import keeps every link already filled in for an unchanged mod.
 * The draft lives in this browser until saved.
 */

interface ModEntry {
  id: string;
  source: string;
  version?: string;
  class?: string;
  folders?: string[];
  assemblies?: string[];
  optional?: boolean;
  url?: string;
  sha256?: string;
  ckan_version?: string;
}

interface Modset {
  v: number;
  ksp_version: string;
  physics_hash: string;
  collide_hash: string;
  policy?: { unknown?: string };
  mods: ModEntry[];
}

interface Inspected {
  url: string;
  size: number;
  sha256: string;
  layout: string;
  folders: string[];
  assemblies: string[];
}

const MOD_KEYS = ["id", "source", "version", "class", "folders", "assemblies", "optional", "url",
  "sha256", "ckan_version"] as const;
const MAX_BYTES = 256 * 1024;
const INSPECT_BUDGET_MS = 12 * 60_000;

const CLASS_TEXT: Record<string, string> = {
  parts: "adds parts",
  physics: "changes physics",
  "world-collide": "changes terrain",
  visual: "visual only",
  client: "client only",
};

function draftKey(id: string) { return `bm:files-draft:${id}`; }
function loadDraft(id: string): Modset | null {
  try { const r = localStorage.getItem(draftKey(id)); return r ? (JSON.parse(r) as Modset) : null; }
  catch { return null; }
}
function saveDraft(id: string, m: Modset | null) {
  try { if (m) localStorage.setItem(draftKey(id), JSON.stringify(m)); else localStorage.removeItem(draftKey(id)); }
  catch { /* private mode etc.: the draft just won't survive a reload */ }
}

function human(n?: number): string {
  if (!n && n !== 0) return "";
  for (const [u, s] of [["GB", 2 ** 30], ["MB", 2 ** 20], ["KB", 2 ** 10]] as const) {
    if (n >= s) { const v = n / s; return `${v < 10 ? v.toFixed(1) : v.toFixed(0)} ${u}`; }
  }
  return `${n} bytes`;
}

function ghParts(url?: string): { repo: string; file: string } | null {
  const m = url?.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/([^/]+)$/);
  return m ? { repo: `${m[1]}/${m[2]}`, file: decodeURIComponent(m[4]) } : null;
}

function needsLink(m: ModEntry): boolean {
  return m.source === "github" && !(m.url && /^[0-9a-f]{64}$/.test(m.sha256 ?? ""));
}

/** The exported file, reduced to what the modset format knows. */
function parseImport(text: string): Modset {
  const raw = JSON.parse(text);
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.mods)) {
    throw new Error("That file is not a mod list exported from KSP.");
  }
  for (const k of ["ksp_version", "physics_hash", "collide_hash"]) {
    if (typeof raw[k] !== "string") throw new Error("That file is not a mod list exported from KSP.");
  }
  const mods: ModEntry[] = raw.mods.map((m: Record<string, unknown>) => {
    const e: Record<string, unknown> = {};
    for (const k of MOD_KEYS) if (m[k] !== undefined && m[k] !== "") e[k] = m[k];
    return e as unknown as ModEntry;
  });
  return { v: Number(raw.v ?? 1), ksp_version: raw.ksp_version, physics_hash: raw.physics_hash,
    collide_hash: raw.collide_hash, policy: raw.policy ?? { unknown: "warn" }, mods };
}

/** Keep links already filled in for a mod whose version did not change. */
function mergeLinks(next: Modset, prev: Modset | null): { merged: Modset; kept: number; stale: string[] } {
  if (!prev) return { merged: next, kept: 0, stale: [] };
  const old = new Map(prev.mods.map((m) => [m.id, m]));
  let kept = 0;
  const stale: string[] = [];
  const mods = next.mods.map((m) => {
    const o = old.get(m.id);
    if (m.source !== "github" || !needsLink(m) || !o || needsLink(o)) return m;
    if ((o.version ?? "") !== (m.version ?? "")) { stale.push(m.id); return m; }
    kept++;
    return { ...m, url: o.url, sha256: o.sha256 };
  });
  return { merged: { ...next, mods }, kept, stale };
}

export function FilesPanel({ server: s, allow, busy, act, setNote }: {
  server: MpServer; allow: Set<string>; busy: string | null; act: Act; setNote: (n: string | null) => void;
}) {
  const [saved, setSaved] = useState<Modset | null | undefined>(undefined);
  const [draft, setDraft] = useState<Modset | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supported = allow.has("modset.get") && allow.has("files.inspect");

  const load = useCallback(() => act("modset.get", async () => {
    const c = await run(s.server_id, "modset.get");
    const m = ((c.result ?? {}) as { modset?: Modset | null }).modset ?? null;
    setSaved(m);
    setDraft(loadDraft(s.server_id));
  }), [act, s.server_id]);

  useEffect(() => { if (supported) void load(); }, [load, supported]);

  const current = draft ?? saved ?? null;
  const dirty = draft !== null;
  const updateDraft = (m: Modset | null) => { setDraft(m); saveDraft(s.server_id, m); };

  const counts = useMemo(() => {
    const mods = current?.mods ?? [];
    const required = mods.filter((m) => !m.optional);
    const missing = required.filter(needsLink);
    return { total: mods.length, required: required.length, missing: missing.length,
      optional: mods.length - required.length };
  }, [current]);

  const importFile = async (file: File) => {
    setImportMsg(null);
    if (file.size > MAX_BYTES) { setImportMsg("That file is too large to be a mod list."); return; }
    try {
      const parsed = parseImport(await file.text());
      const { merged, kept, stale } = mergeLinks(parsed, current);
      updateDraft(merged);
      const bits = [`Imported ${merged.mods.length} mods.`];
      if (kept) bits.push(`Kept ${kept} download link${kept === 1 ? "" : "s"} you had already added.`);
      if (stale.length) bits.push(`${stale.length} mod${stale.length === 1 ? " has" : "s have"} a new version — update ${stale.length === 1 ? "its link" : "their links"}.`);
      setImportMsg(bits.join(" "));
    } catch (e) {
      setImportMsg(e instanceof SyntaxError ? "That file is not valid JSON." : (e as Error).message);
    }
  };

  const setLink = (id: string, r: Inspected) => {
    if (!current) return;
    const mods = current.mods.map((m) => m.id !== id ? m : {
      ...m, url: r.url, sha256: r.sha256,
      folders: m.folders?.length ? m.folders : r.folders,
    });
    setSizes((x) => ({ ...x, [id]: r.size }));
    updateDraft({ ...current, mods });
  };

  const save = () => act("modset.set", async () => {
    if (!draft) return;
    try {
      await run(s.server_id, "modset.set", { modset: draft });
    } catch (e) {
      if (e instanceof CommandError && e.command.problems?.length) {
        throw new Error("The server did not accept the mod list. " + e.command.problems.slice(0, 3).join(" · "));
      }
      throw e;
    }
    setSaved(draft);
    updateDraft(null);
    setNote("Saved. Joining players are checked against this mod list from now on.");
  });

  if (!supported) {
    return (
      <Card><CardContent className="p-5 text-sm text-muted-foreground">
        This server&apos;s admin agent is older than the Files page. Update the server to manage
        player downloads here.
      </CardContent></Card>
    );
  }

  if (saved === undefined) {
    return (
      <Card><CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading this server&apos;s mod list…
      </CardContent></Card>
    );
  }

  const fileInput = (
    <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1}
           aria-hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importFile(f); }} />
  );

  if (!current) {
    return (
      <Card><CardContent className="space-y-5 p-6">
        {fileInput}
        <div>
          <h2 className="text-lg font-semibold">Downloads for players</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This server does not ask for any mods yet, so anyone with the multiplayer mod can join.
            To require mods, bring in the mod list from your own game.
          </p>
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          <li>Start KSP with the mods you want this server to use.</li>
          <li>Open the multiplayer menu (<kbd className="rounded border border-border px-1 text-xs">Alt</kbd> + <kbd className="rounded border border-border px-1 text-xs">M</kbd>), go to <b>Settings</b>, and press <b>Export server modset</b>.</li>
          <li>Bring the file in here. You&apos;ll find it in your KSP folder at <span className="whitespace-nowrap font-mono text-xs">GameData/BoundlessMultiplayer/PluginData/modset.json</span>.</li>
        </ol>
        <DropZone onFile={(f) => void importFile(f)} onBrowse={() => fileRef.current?.click()} />
        {importMsg && <p role="status" className="text-sm text-amber-500">{importMsg}</p>}
      </CardContent></Card>
    );
  }

  const ordered = [...current.mods].sort((a, b) =>
    Number(needsLink(b) && !b.optional) - Number(needsLink(a) && !a.optional)
    || Number(!!a.optional) - Number(!!b.optional) || a.id.localeCompare(b.id));
  const visible = ordered.filter((m) => !m.optional || showOptional);
  const pct = counts.required ? Math.round(((counts.required - counts.missing) / counts.required) * 100) : 100;

  return (
    <div className="space-y-4">
      {fileInput}
      <Card><CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Downloads for players</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Players need these mods to join. The BM Launcher installs them for each player — mods on CKAN
              automatically, every other one from the download link you give here.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp /> Import a new mod list
          </Button>
        </div>

        <div role="status" aria-live="polite" className="space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className="font-medium">{counts.required} required mod{counts.required === 1 ? "" : "s"}</span>
            {counts.missing ? (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="h-4 w-4" aria-hidden /> {counts.missing} still need{counts.missing === 1 ? "s" : ""} a download link
              </span>
            ) : (
              <span className="flex items-center gap-1 text-primary">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> every required mod has a download
              </span>
            )}
            {counts.optional > 0 && <span className="text-muted-foreground">· {counts.optional} optional</span>}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {importMsg && <p role="status" className="text-sm text-muted-foreground">{importMsg}</p>}

        {dirty && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
            <span className="flex-1">
              You have unsaved changes{counts.missing ? " — add the missing links before saving" : ""}.
            </span>
            <Button size="sm" disabled={!!busy || counts.missing > 0} onClick={() => void save()}>
              {busy === "modset.set" ? <Loader2 className="animate-spin" /> : <Upload />} Save to server
            </Button>
            <Button size="sm" variant="ghost" disabled={!!busy}
                    onClick={() => { updateDraft(null); setImportMsg(null); }}>
              Discard changes
            </Button>
          </div>
        )}
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <ul className="divide-y divide-border" aria-label="Mods">
          {visible.map((m) => (
            <ModRow key={m.id} mod={m} size={sizes[m.id]} server={s}
                    onLink={(r) => setLink(m.id, r)} disabled={!!busy && busy !== "files.inspect"} />
          ))}
        </ul>
        {counts.optional > 0 && (
          <button type="button" onClick={() => setShowOptional((v) => !v)} aria-expanded={showOptional}
                  className="flex w-full items-center gap-2 border-t border-border px-5 py-3 text-sm text-muted-foreground hover:text-foreground">
            {showOptional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {showOptional ? "Hide" : "Show"} {counts.optional} optional mod{counts.optional === 1 ? "" : "s"}
            <span className="text-xs">(players may have these, but don&apos;t need them)</span>
          </button>
        )}
      </CardContent></Card>

      <p className="text-xs text-muted-foreground">
        To add or remove a mod, change your game and import a new list — the list carries a
        fingerprint of your install, so players are checked against exactly what you play with.
        Links you already added are kept.
      </p>
    </div>
  );
}

function DropZone({ onFile, onBrowse }: { onFile: (f: File) => void; onBrowse: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button" onClick={onBrowse}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      className={cn("flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm transition-colors",
        over ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}
    >
      <FileUp className="h-6 w-6 text-primary" aria-hidden />
      <span className="font-medium">Drop modset.json here, or choose the file</span>
      <span className="text-xs text-muted-foreground">Nothing is uploaded until you save</span>
    </button>
  );
}

function ModRow({ mod: m, size, server: s, onLink, disabled }: {
  mod: ModEntry; size?: number; server: MpServer; onLink: (r: Inspected) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(m.url ?? "");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Inspected | null>(null);
  const [error, setError] = useState<{ text: string; problems: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const missing = needsLink(m);
  const gh = ghParts(m.url);
  const inputId = `link-${m.id}`;

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const check = async () => {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const c = await run(s.server_id, "files.inspect", { url: url.trim() }, { budgetMs: INSPECT_BUDGET_MS });
      setResult(c.result as unknown as Inspected);
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : "Couldn't check that link.",
        problems: e instanceof CommandError ? e.command.problems ?? [] : [] });
    } finally {
      setChecking(false);
    }
  };

  const expected = m.folders ?? [];
  const found = new Set((result?.folders ?? []).map((f) => f.toLowerCase()));
  const missingFolders = expected.filter((f) => !found.has(f.toLowerCase()));
  const usable = !!result && missingFolders.length === 0 && result.folders.length > 0;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{m.id}</span>
            {m.version && <span className="text-xs text-muted-foreground">v{m.version}</span>}
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]",
              m.optional ? "border-border text-muted-foreground" : "border-primary/40 text-foreground")}>
              {m.optional ? "Optional" : "Required"}
            </span>
            {m.class && CLASS_TEXT[m.class] && (
              <span className="text-xs text-muted-foreground">{CLASS_TEXT[m.class]}</span>
            )}
          </div>
          <div className="mt-1 text-sm">
            {m.source === "ckan" ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <PackageCheck className="h-4 w-4 text-primary" aria-hidden />
                Installed automatically through CKAN
              </span>
            ) : missing ? (
              <span className="flex items-center gap-1.5 text-amber-500">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Needs a download link
              </span>
            ) : (
              <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                <span>GitHub release{gh ? ` · ${gh.repo} · ${gh.file}` : ""}{size ? ` · ${human(size)}` : ""}</span>
                {m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center hover:text-foreground"
                     aria-label={`Open the download for ${m.id} in a new tab`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </span>
            )}
          </div>
        </div>
        {m.source === "github" && (
          <Button size="sm" variant={missing ? "default" : "outline"} disabled={disabled}
                  aria-expanded={open} aria-controls={`${inputId}-panel`}
                  onClick={() => setOpen((v) => !v)}>
            <Link2 /> {missing ? "Add link" : "Change link"}
          </Button>
        )}
      </div>

      {open && (
        <div id={`${inputId}-panel`} className="mt-3 space-y-3 rounded-lg border border-border bg-background/40 p-4">
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) void check(); }}>
            <label htmlFor={inputId} className="block text-sm font-medium">GitHub release download link</label>
            <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
              On the mod&apos;s GitHub page, open <b>Releases</b>, right-click the .zip under <b>Assets</b> and copy
              the link. It looks like <span className="font-mono">github.com/…/releases/download/…/{m.id}.zip</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <input ref={inputRef} id={inputId} value={url} onChange={(e) => { setUrl(e.target.value); setResult(null); setError(null); }}
                     aria-describedby={`${inputId}-hint ${inputId}-out`} spellCheck={false} inputMode="url"
                     placeholder="https://github.com/…/releases/download/…/….zip"
                     className="h-9 min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 font-mono text-xs" />
              <Button type="submit" size="sm" disabled={checking || !url.trim()}>
                {checking && <Loader2 className="animate-spin" />} Check link
              </Button>
            </div>
          </form>

          <div id={`${inputId}-out`} role="status" aria-live="polite" className="text-sm">
            {checking && (
              <p className="text-muted-foreground">The server is downloading the file to check it. Large mods can take a minute…</p>
            )}
            {error && (
              <div className="text-destructive">
                {error.text}
                {error.problems.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs">{error.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
              </div>
            )}
            {result && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                  Downloaded {human(result.size)} and checked it.
                </p>
                {expected.length > 0 ? (
                  <ul className="space-y-0.5 text-xs">
                    {expected.map((f) => {
                      const ok = found.has(f.toLowerCase());
                      return (
                        <li key={f} className={cn("flex items-center gap-1.5", ok ? "text-muted-foreground" : "text-destructive")}>
                          {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden /> : <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
                          <span>{ok ? "Contains" : "Missing"} GameData/{f}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Contains: {result.folders.map((f) => `GameData/${f}`).join(", ") || "no mod folders"}</p>
                )}
                {missingFolders.length > 0 && (
                  <p className="text-destructive">
                    This file doesn&apos;t contain what your game has for {m.id}, so players would still be missing
                    it. Check you copied the right file (some mods publish several).
                  </p>
                )}
                {result.folders.length === 0 && (
                  <p className="text-destructive">No mod folders were found in this zip.</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" disabled={!usable} onClick={() => { onLink(result); setOpen(false); }}>
                    Use this download
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
