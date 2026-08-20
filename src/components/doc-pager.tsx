import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PagerLink {
  title: string;
  href: string;
}

export function DocPager({
  prev,
  next,
}: {
  prev?: PagerLink;
  next?: PagerLink;
}) {
  return (
    <div className="mt-14 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </span>
          <span className="mt-1 font-medium text-foreground group-hover:text-primary">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className={cn(
            "group flex flex-col rounded-lg border border-border p-4 text-right transition-colors hover:border-primary/40",
            !prev && "sm:col-start-2"
          )}
        >
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <span className="mt-1 font-medium text-foreground group-hover:text-primary">
            {next.title}
          </span>
        </Link>
      ) : null}
    </div>
  );
}
