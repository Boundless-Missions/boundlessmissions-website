"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { docsNav } from "@/config/nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4">
        <nav className="space-y-7">
          {docsNav.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <ul className="space-y-0.5 border-l border-border">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "-ml-px block border-l py-1.5 pl-4 text-sm transition-colors",
                          active
                            ? "border-primary font-medium text-primary"
                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
