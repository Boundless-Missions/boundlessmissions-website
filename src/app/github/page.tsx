import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Gamepad2, Github, Globe, Server } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/nav";

export const metadata: Metadata = {
  title: "Source Code",
  description: `Browse the open-source repositories for ${siteConfig.name}. All code is available under the GPL-3.0 licence.`,
};

const repos = [
  {
    icon: Server,
    title: "Server / Discord Bot",
    description:
      "The backend server and Discord bot that power the community economy, contracts, weekly missions and account linking.",
    tags: ["Python"],
    href: "https://github.com/Boundless-Missions/boundlessmissions-server",
  },
  {
    icon: Gamepad2,
    title: "KSP Mod",
    description:
      "The Kerbal Space Program add-on that brings community features into the game: in-game contracts, craft sharing, linking and the consent system.",
    tags: ["C#", "Python", "Shell"],
    href: "https://github.com/Boundless-Missions/boundlessmissions-modside",
  },
  {
    icon: Globe,
    title: "Website",
    description:
      "This site: the marketplace, the contracts and account pages, the documentation, and the owner console that moderates all of it.",
    tags: ["TypeScript", "Next.js"],
    href: "https://github.com/Boundless-Missions/boundlessmissions-website",
  },
];

export default function GitHubPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pointer-events-none absolute inset-0 glow-grid opacity-40" />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[22rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="container relative py-16 sm:py-20">
            <div className="mx-auto max-w-3xl">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="mb-6 -ml-3 text-muted-foreground"
              >
                <Link href="/">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back to home
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <Github className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Source Code
                </h1>
              </div>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                {siteConfig.name} is fully open-source under the GPL-3.0
                licence. Pick a repository below to browse the code, report
                issues, or contribute.
              </p>
            </div>
          </div>
        </section>

        {/* Repo cards */}
        <section className="container py-14 sm:py-20">
          <div className="mx-auto grid max-w-3xl gap-6">
            {repos.map((repo) => (
              <a
                key={repo.title}
                href={repo.href}
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <Card className="transition-colors hover:border-primary/40 hover:bg-card/80">
                  <CardContent className="flex items-start gap-5 p-6">
                    <span className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                      <repo.icon className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">
                          {repo.title}
                        </h2>
                        <Github className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {repo.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {repo.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
