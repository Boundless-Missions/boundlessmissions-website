import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Gamepad2, Server, ArrowRight } from "lucide-react";

import { DocHeader, Section, Callout } from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Introduction",
  description:
    "What Boundless Missions is, who it is for, and how the Discord bot and the KSP add-on fit together.",
};

const pillars = [
  {
    icon: Bot,
    title: "Discord bot",
    body: "Python and discord.py, with a FastAPI server running in the same process. Wallets, contracts, auctions, weekly missions, moderation and tickets.",
    href: "/docs/how-does-it-work/discord-bot",
  },
  {
    icon: Gamepad2,
    title: "KSP add-on",
    body: "A C# add-on that brings all of it into the game: linking, the sidebar, submission, and craft transfer between saves that are never identically modded.",
    href: "/docs/how-does-it-work/ksp-mod",
  },
  {
    icon: Server,
    title: "REST API",
    body: "The only thing the two share. Signed session tokens, versioned routes under /api/v1, and no secret ever handed to the game client.",
    href: "/docs/how-does-it-work/api",
  },
];

export default function DocsIntroPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Start Here"
        title="Introduction"
        description="Boundless Missions is a contract economy for a Kerbal Space Program community. Players hire each other to build ships and fly missions, the reward is held in escrow until the job is delivered, and the finished craft moves from one save into another."
      />

      <Section title="The short version">
        <p>
          Someone posts a job. Someone else takes it, flies it, and submits it
          from inside KSP with the vessel&rsquo;s real state attached. The issuer
          reviews the submission, the escrowed payment is released, and if the
          contract was for a craft, that craft is installed into the
          issuer&rsquo;s save.
        </p>
        <p>
          Everything else in this documentation is a variation on that, or a
          consequence of it. Auctions change how the price is agreed. Rescues
          change what is being handed over. Weekly missions replace the issuer
          with the community. The marketplace is the same delivery machinery
          without a contract in front of it.
        </p>
      </Section>

      <Section title="The three pieces">
        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map((pillar) => (
            <Link key={pillar.title} href={pillar.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary">
                    <pillar.icon className="h-5 w-5" />
                  </span>
                  <h3 className="flex items-center gap-1 font-semibold text-foreground">
                    {pillar.title}
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {pillar.body}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Three places, one account">
        <p>
          The same account reaches the system three ways, and which one you use
          is a matter of where you happen to be:
        </p>
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            <strong className="text-foreground">Discord</strong> for the boards,
            the announcements, the leaderboards and anything social.
          </li>
          <li>
            <strong className="text-foreground">This website</strong> for
            browsing and buying craft, and for managing contracts on a proper
            screen.
          </li>
          <li>
            <strong className="text-foreground">The game</strong> for everything
            that has to read the ship in front of you: submitting, listing a
            craft for sale, installing what arrives.
          </li>
        </ul>
        <p>
          The wallet is global rather than per server, so your balance and XP
          follow you between any Discord servers the bot is in.
        </p>
      </Section>

      <Section title="Where to go next">
        <p>
          If you are here to play, start with{" "}
          <Link
            href="/docs/how-to-use-it/linking"
            className="text-primary hover:underline"
          >
            Linking Your Game
          </Link>{" "}
          and then{" "}
          <Link
            href="/docs/how-to-use-it/contracts"
            className="text-primary hover:underline"
          >
            Contracts
          </Link>
          . If you are here to run or build on it, the{" "}
          <Link
            href="/docs/how-does-it-work/architecture"
            className="text-primary hover:underline"
          >
            Architecture
          </Link>{" "}
          page is the right door.
        </p>
        <Callout variant="info" title="Two languages, one boundary">
          <p>
            The bot is Python and the add-on is C#. They share no code at all,
            only the REST API and a signed token format. That boundary is what
            keeps credentials off the game client: the add-on can present a
            token, but it cannot forge one and it holds nothing else worth
            taking.
          </p>
        </Callout>
      </Section>

      <DocPager next={{ title: "What It Does", href: "/docs/what-does-it-do" }} />
    </article>
  );
}
