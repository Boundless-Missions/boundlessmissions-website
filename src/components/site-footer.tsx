import Link from "next/link";

import { BrandMark } from "@/components/brand";
import { docsNav, siteConfig } from "@/config/nav";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/30">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-sm font-semibold text-foreground">
                {siteConfig.name}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>

          {docsNav.slice(0, 2).map((section) => (
            <div key={section.title}>
              <p className="text-sm font-semibold text-foreground">
                {section.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {section.items.slice(0, 5).map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-sm font-semibold text-foreground">Legal</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/tos"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/pp"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            Built for the Kerbal Space Program community. Not affiliated with
            Squad, Intercept Games or Private Division.
          </p>
          {/* No Terms/Privacy links here: the Legal column directly above is
              the one place they belong, and repeating them a row later only
              gives a keyboard or screen-reader user the same two stops twice. */}
          <p>Made by the community, for the community.</p>
        </div>
      </div>
    </footer>
  );
}
