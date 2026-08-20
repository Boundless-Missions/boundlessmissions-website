import * as React from "react";
import { Info, AlertTriangle, Lightbulb } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DocHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10 border-b border-border pb-8">
      {eyebrow ? (
        <p className="mb-3 text-sm font-medium text-primary">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-8 first:pt-0">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

const calloutStyles = {
  info: {
    icon: Info,
    border: "border-primary/30",
    bg: "bg-primary/5",
    iconColor: "text-primary",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    iconColor: "text-amber-400",
  },
  tip: {
    icon: Lightbulb,
    border: "border-primary/30",
    bg: "bg-primary/5",
    iconColor: "text-primary",
  },
};

export function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: keyof typeof calloutStyles;
  title?: string;
  children: React.ReactNode;
}) {
  const style = calloutStyles[variant];
  const Icon = style.icon;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        style.border,
        style.bg
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.iconColor)} />
      <div className="space-y-1 text-sm leading-relaxed text-foreground/90">
        {title ? <p className="font-semibold text-foreground">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function Steps({ children }: { children: React.ReactNode }) {
  return (
    <ol className="relative space-y-6 border-l border-border pl-8">
      {children}
    </ol>
  );
}

export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative">
      <span className="absolute -left-[2.875rem] flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-primary">
        {n}
      </span>
      <h3 className="mb-1.5 font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </li>
  );
}

export interface EndpointRow {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth?: boolean;
}

const methodColor: Record<EndpointRow["method"], string> = {
  GET: "text-primary",
  POST: "text-amber-400",
  PUT: "text-blue-400",
  DELETE: "text-destructive",
};

export function EndpointTable({ rows }: { rows: EndpointRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Endpoint</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">
              Description
            </th>
            <th className="px-4 py-3 font-medium">Auth</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.method + row.path} className="align-top">
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    methodColor[row.method]
                  )}
                >
                  {row.method}
                </span>
              </td>
              <td className="px-4 py-3">
                <code className="font-mono text-xs text-foreground">
                  {row.path}
                </code>
                <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                  {row.description}
                </p>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {row.description}
              </td>
              <td className="px-4 py-3">
                {row.auth ? (
                  <Badge variant="muted">Token</Badge>
                ) : (
                  <Badge variant="outline">Public</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Simple key/value definition list used for settings & config reference. */
export function DefinitionTable({
  rows,
}: {
  rows: { name: string; type?: string; description: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.name} className="align-top">
              <td className="w-1/3 px-4 py-3">
                <code className="font-mono text-xs text-primary">
                  {row.name}
                </code>
                {row.type ? (
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {row.type}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
