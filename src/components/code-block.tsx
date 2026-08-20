import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  /** Optional filename / label shown in the title bar. */
  title?: string;
  className?: string;
}

/**
 * A lightweight, dependency-free code block with a window-style title bar.
 * Not syntax-highlighted on purpose — keeps things crisp and legible on dark.
 */
export function CodeBlock({ code, title, className }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-[hsl(120_8%_5%)]",
        className
      )}
    >
      {title ? (
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {title}
          </span>
        </div>
      ) : null}
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed">
        <code className="font-mono text-foreground/90">{code}</code>
      </pre>
    </div>
  );
}
