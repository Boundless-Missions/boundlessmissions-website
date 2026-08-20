"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand";
import { docsNav, visibleNav } from "@/config/nav";
import { useAdminAccess } from "@/lib/admin";
import { useSignedIn } from "@/lib/session";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const signedIn = useSignedIn();
  const adminAccess = useAdminAccess();
  const nav = adminAccess
    ? [...visibleNav(signedIn), { title: "Admin", href: "/admin" }]
    : visibleNav(signedIn);

  // Close the drawer whenever the route changes.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[18rem] max-w-[85vw] overflow-y-auto border-l border-border bg-card p-5 shadow-xl animate-fade-up">
            <div className="mb-6 flex items-center justify-between">
              <BrandLogo />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="space-y-6">
              <div className="flex flex-col gap-1">
                {nav.map((item) => (
                  <MobileLink
                    key={item.href}
                    href={item.href}
                    active={pathname === item.href}
                  >
                    {item.title}
                  </MobileLink>
                ))}
                {signedIn !== true && (
                  <Button size="sm" asChild className="mt-3">
                    <Link href="/account">
                      <LogIn className="mr-1.5 h-4 w-4" />
                      Log in
                    </Link>
                  </Button>
                )}
              </div>

              {/* The full docs tree is part of the way in, and disappears with the
                  header's Documentation link once signed in. Still reachable from the
                  footer on every page and from the landing page. */}
              {signedIn !== true && docsNav.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <MobileLink
                        key={item.href}
                        href={item.href}
                        active={pathname === item.href}
                      >
                        {item.title}
                      </MobileLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-primary"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
