"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CommandError, run, type MpServer } from "@/lib/mp-servers";
import type { Act } from "@/components/account/servers-card";
import { cn } from "@/lib/utils";

/**
 * Options — the server settings file as a form (design: "interactive menu for
 * modifying the server settings file"). Today that file holds the listing; the
 * form grows as the server gains settings. Limits and the allowed tag list come
 * from the server itself (settings.get), so this never disagrees with the
 * master's rules. Saved with `listing.set`, which the host validates with the
 * game's own loader and rolls back if the game refuses the reload.
 */

interface Limits {
  tags: string[];
  tags_max: number;
  name_max: number;
  summary_max: number;
  description_max: number;
}

interface ListingFields {
  name: string;
  summary: string;
  description: string;
  tags: string[];
  website: string;
  discord: string;
}

const EMPTY: ListingFields = { name: "", summary: "", description: "", tags: [], website: "", discord: "" };

function fromResult(r: Record<string, unknown>): { fields: ListingFields; base: string; limits: Limits | null } {
  const l = (r.listing ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof l[k] === "string" ? (l[k] as string) : "");
  return {
    fields: {
      name: str("name"), summary: str("summary"), description: str("description"),
      tags: Array.isArray(l.tags) ? (l.tags as string[]) : [],
      website: str("website"), discord: str("discord"),
    },
    base: String(r.hash ?? ""),
    limits: (r.limits as Limits) ?? null,
  };
}

export function OptionsForm({ server: s, canSave, busy, act, setNote }: {
  server: MpServer; canSave: boolean; busy: string | null; act: Act; setNote: (n: string | null) => void;
}) {
  const [fields, setFields] = useState<ListingFields>(EMPTY);
  const [saved, setSaved] = useState<ListingFields>(EMPTY);
  const [base, setBase] = useState("");
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => act("settings.get", async () => {
    const c = await run(s.server_id, "settings.get");
    const r = fromResult(c.result ?? {});
    setFields(r.fields);
    setSaved(r.fields);
    setBase(r.base);
    setLimits(r.limits);
    setLoaded(true);
  }), [act, s.server_id]);

  useEffect(() => { void load(); }, [load]);

  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);
  const set = <K extends keyof ListingFields>(k: K, v: ListingFields[K]) => setFields((f) => ({ ...f, [k]: v }));

  const save = () => act("listing.set", async () => {
    try {
      const c = await run(s.server_id, "listing.set", { base_hash: base, listing: fields });
      const r = c.result as { applied?: string; config_hash?: string } | null;
      if (r?.config_hash) setBase(r.config_hash);
      setSaved(fields);
      setNote(r?.applied === "on_next_start"
        ? "Saved. The server is stopped, so the listing changes when it next starts."
        : "Saved and live. The server browser shows it within a minute.");
    } catch (e) {
      const cur = e instanceof CommandError ? (e.command.result as Record<string, unknown> | null) : null;
      if (cur?.hash) {
        await load();
        throw new Error("The settings were changed on the server since you opened them. They are reloaded — make your change again.");
      }
      throw e;
    }
  });

  const toggleTag = (t: string) => {
    const has = fields.tags.includes(t);
    if (!has && limits && fields.tags.length >= limits.tags_max) return;
    set("tags", has ? fields.tags.filter((x) => x !== t) : [...fields.tags, t]);
  };

  if (!loaded) {
    return (
      <Card><CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
        {busy === "settings.get" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy === "settings.get" ? "Asking the server for its settings…" : (
          <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw /> Load settings</Button>
        )}
      </CardContent></Card>
    );
  }

  const input = "h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm";
  const counter = (v: string, max?: number) =>
    max ? <span className="text-xs text-muted-foreground tabular-nums">{v.length}/{max}</span> : null;

  return (
    <Card><CardContent className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Listing</h2>
        <span className="text-xs text-muted-foreground">How the server appears in the in-game server browser</span>
      </div>

      <label className="block space-y-1.5">
        <span className="flex justify-between text-sm">Name {counter(fields.name, limits?.name_max)}</span>
        <input className={input} value={fields.name} maxLength={limits?.name_max}
               onChange={(e) => set("name", e.target.value)} />
      </label>

      <label className="block space-y-1.5">
        <span className="flex justify-between text-sm">One-line summary {counter(fields.summary, limits?.summary_max)}</span>
        <input className={input} value={fields.summary} maxLength={limits?.summary_max}
               onChange={(e) => set("summary", e.target.value)} />
      </label>

      <label className="block space-y-1.5">
        <span className="flex justify-between text-sm">Description {counter(fields.description, limits?.description_max)}</span>
        <textarea className="min-h-[7rem] w-full rounded-md border border-border bg-transparent p-3 text-sm"
                  value={fields.description} maxLength={limits?.description_max}
                  onChange={(e) => set("description", e.target.value)} />
      </label>

      {limits && (
        <div className="space-y-1.5">
          <span className="flex justify-between text-sm">
            Tags <span className="text-xs text-muted-foreground">{fields.tags.length}/{limits.tags_max}</span>
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tags">
            {limits.tags.map((t) => {
              const on = fields.tags.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTag(t)} aria-pressed={on}
                        className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                          on ? "border-primary bg-primary/15 text-foreground"
                             : "border-border text-muted-foreground hover:text-foreground")}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm">Website</span>
          <input className={input} value={fields.website} placeholder="https://…"
                 onChange={(e) => set("website", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm">Discord invite</span>
          <input className={input} value={fields.discord} placeholder="https://discord.gg/…"
                 onChange={(e) => set("discord", e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {canSave ? (
          <Button size="sm" disabled={!!busy || !dirty || !fields.name.trim()} onClick={() => void save()}>
            {busy === "listing.set" && <Loader2 className="animate-spin" />} Save changes
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">This server does not allow listing changes remotely.</span>
        )}
        {dirty && (
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => setFields(saved)}>Discard</Button>
        )}
        <Button size="sm" variant="ghost" className="ml-auto" disabled={!!busy} onClick={() => void load()}>
          <RefreshCw /> Reload from server
        </Button>
      </div>
    </CardContent></Card>
  );
}
