"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MpServer } from "@/lib/mp-servers";

/**
 * Console — Minecraft-style command access to the server (design sheet: "to be
 * designed with autocomplete, suggest and similar features"). UI ONLY for now:
 * the command groups and their functions arrive with a later instruction.
 *
 * Built around a registry so the commands plug in without touching the UI: each
 * `CommandSpec` names itself, its group, its arguments and a one-line help; the
 * input suggests from it as you type (Tab completes, ↑/↓ walks the history).
 * Running a command will become one signed host command per line, like every
 * other action — nothing here executes anything yet.
 */

export interface CommandSpec {
  name: string;
  group: string;
  args?: string;
  help: string;
}

/** Empty until the command set is specified. */
export const COMMANDS: CommandSpec[] = [];

interface Line {
  kind: "in" | "out" | "info";
  text: string;
}

export function ConsoleShell({ server: s }: { server: MpServer }) {
  const [lines, setLines] = useState<Line[]>([
    { kind: "info", text: `Boundless Missions server console — ${s.name} (${s.server_id})` },
    { kind: "info", text: "Commands are not available yet. They arrive with the next update; the console is ready for them." },
  ]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [pick, setPick] = useState(0);
  const outRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);

  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [lines]);

  const word = value.trimStart().split(/\s+/)[0] ?? "";
  const suggestions = useMemo(
    () => (word ? COMMANDS.filter((c) => c.name.startsWith(word.toLowerCase())).slice(0, 8) : []),
    [word],
  );

  const submit = () => {
    const cmd = value.trim();
    if (!cmd) return;
    setHistory((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 50));
    setCursor(-1);
    setLines((l) => [...l, { kind: "in", text: cmd },
      { kind: "out", text: "Not available yet — the server console's commands arrive in a later update." }]);
    setValue("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); return; }
    if (e.key === "Tab" && suggestions.length) {
      e.preventDefault();
      const c = suggestions[Math.min(pick, suggestions.length - 1)];
      setValue(c.name + " ");
      return;
    }
    if (e.key === "ArrowDown" && suggestions.length) { e.preventDefault(); setPick((p) => (p + 1) % suggestions.length); return; }
    if (e.key === "ArrowUp" && suggestions.length) { e.preventDefault(); setPick((p) => (p - 1 + suggestions.length) % suggestions.length); return; }
    if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      const n = Math.min(cursor + 1, history.length - 1);
      setCursor(n); setValue(history[n]);
      return;
    }
    if (e.key === "ArrowDown" && cursor >= 0) {
      e.preventDefault();
      const n = cursor - 1;
      setCursor(n); setValue(n >= 0 ? history[n] : "");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#070807] shadow-inner"
         onClick={() => inRef.current?.focus()}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary/70" aria-hidden /> Console
        <span className="ml-auto font-mono">{s.server_id}</span>
      </div>
      <div ref={outRef} className="h-[26rem] overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed"
           role="log" aria-live="polite">
        {lines.map((l, i) => (
          <div key={i} className={cn("whitespace-pre-wrap break-words",
            l.kind === "in" ? "text-foreground" : l.kind === "info" ? "text-primary/80" : "text-muted-foreground")}>
            {l.kind === "in" ? <><span className="select-none text-primary">› </span>{l.text}</> : l.text}
          </div>
        ))}
      </div>
      <div className="relative border-t border-border">
        {word && (
          <div className="absolute bottom-full left-0 right-0 border-t border-border bg-card/95 py-1 font-mono text-xs">
            {suggestions.length ? suggestions.map((c, i) => (
              <div key={c.name} className={cn("flex gap-3 px-4 py-1", i === pick && "bg-primary/15")}>
                <span className="text-foreground">{c.name}</span>
                {c.args && <span className="text-muted-foreground">{c.args}</span>}
                <span className="ml-auto truncate text-muted-foreground">{c.help}</span>
              </div>
            )) : (
              <div className="px-4 py-1 text-muted-foreground">No commands yet — suggestions appear here as you type.</div>
            )}
          </div>
        )}
        <form className="flex items-center gap-2 px-4 py-2.5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <span className="select-none font-mono text-primary">›</span>
          <input
            ref={inRef} value={value} onChange={(e) => { setValue(e.target.value); setPick(0); }} onKeyDown={onKey}
            spellCheck={false} autoComplete="off" aria-label="Console command"
            placeholder="Type a command (Tab completes, ↑ history)"
            className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <button type="submit" aria-label="Run" className="text-muted-foreground hover:text-foreground">
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
