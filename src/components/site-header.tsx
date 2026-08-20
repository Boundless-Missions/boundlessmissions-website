"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Youtube, Github, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand";
import { MobileNav } from "@/components/mobile-nav";
import { PatreonIcon } from "@/components/brand";
import { visibleNav, siteConfig } from "@/config/nav";
import { useAdminAccess } from "@/lib/admin";
import { useSignedIn } from "@/lib/session";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const signedIn = useSignedIn();
  const adminAccess = useAdminAccess();
  // The Admin tab exists for the BOT_OWNER_ID account and for mapped guild
  // admins; the server re-checks on every call, so this is presentation, not
  // protection.
  const nav = adminAccess
    ? [...visibleNav(signedIn), { title: "Admin", href: "/admin" }]
    : visibleNav(signedIn);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <BrandLogo />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {/* Signed out (and while unknown) the primary call to action is getting in.
              /account carries the link-code card, so there is no separate login page. */}
          {signedIn !== true && (
            <Button size="sm" asChild className="mr-1 hidden sm:inline-flex">
              <Link href="/account">
                <LogIn className="mr-1.5 h-4 w-4" />
                Log in
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden sm:inline-flex"
          >
            <a
              href={siteConfig.links.patreon}
              target="_blank"
              rel="noreferrer"
              aria-label="Patreon"
            >
              <PatreonIcon className="h-[18px] w-[18px]" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden sm:inline-flex"
          >
            <a
              href={siteConfig.links.youtube}
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
            >
              <Youtube className="h-5 w-5" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link
              href="/github"
              aria-label="GitHub"
            >
              <Github className="h-[18px] w-[18px]" />
            </Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
