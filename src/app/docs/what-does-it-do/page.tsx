import type { Metadata } from "next";
import Link from "next/link";

import { DocHeader, Section, Callout } from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "What It Does",
  description:
    "A tour of everything Boundless Missions adds to a Kerbal Space Program community, on Discord and inside the game.",
};

const jobs = [
  {
    title: "Contracts",
    href: "/docs/how-to-use-it/contracts",
    body: "One player hires another. Build a craft, or fly a mission. A deadline, a price, and optionally a list of parts the contractor is allowed to use.",
  },
  {
    title: "Auctions",
    href: "/docs/how-to-use-it/auctions",
    body: "The same job, with the price left open. Contractors bid downwards and the lowest bid at the close becomes the contract.",
  },
  {
    title: "Rescues",
    href: "/docs/how-to-use-it/rescues",
    body: "A ship and its crew leave the issuer's save for real, and spawn in the rescuer's on the orbit they were abandoned at.",
  },
  {
    title: "Flag design",
    href: "/docs/how-to-use-it/contracts",
    body: "A contract whose deliverable is artwork rather than a ship: a custom flag, delivered as an image and installed like any other flag.",
  },
  {
    title: "Weekly missions",
    href: "/docs/how-to-use-it/weekly-missions",
    body: "Twenty community objectives a week, drawn from a template set, with rewards scaled to difficulty and a fine for claiming one and not delivering.",
  },
  {
    title: "The marketplace",
    href: "/docs/how-to-use-it/marketplace",
    body: "Sell a finished craft outright. Listed from the editor in game, browsed and bought here, delivered into the buyer's save.",
  },
];

export default function WhatDoesItDoPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Start Here"
        title="What It Does"
        description="Boundless Missions gives a KSP community the one thing a single player save cannot have: other people who want something built. This page is the tour."
      />

      <Section title="Six ways to get work">
        <p>
          Everything below runs on the same wallet, the same escrow and the same
          submission machinery. They differ in who sets the price, and in what
          counts as delivery.
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <Link key={job.title} href={job.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {job.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {job.body}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="What the bot handles">
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            <strong className="text-foreground">Wallets and XP.</strong> One
            balance in KCoins and one XP total per player, shared across every
            server the bot is in rather than kept per server.
          </li>
          <li>
            <strong className="text-foreground">Rank titles.</strong> Fifteen
            achievement levels, from Kerbin orbit up to an interstellar mission
            in Real Solar System, each with a Discord role you can equip.
          </li>
          <li>
            <strong className="text-foreground">Boards and announcements.</strong>{" "}
            Contract offers, auction posts, marketplace listings and the weekly
            mission drop, each in its own channel.
          </li>
          <li>
            <strong className="text-foreground">Screenshot analysis.</strong> Post
            a KSP screenshot and it is read for the craft, the location and the
            difficulty, then paid out accordingly.
          </li>
          <li>
            <strong className="text-foreground">Corporations.</strong> Found one
            and get a text channel to run it from.
          </li>
          <li>
            <strong className="text-foreground">Disputes, tickets and
            moderation.</strong> A refused submission has somewhere to go, and so
            does a bug report filed from inside the game.
          </li>
        </ul>
      </Section>

      <Section title="What the add-on handles">
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            <strong className="text-foreground">The sidebar.</strong> Missions,
            the contract inbox, your profile, the notification feed, the selling
            half of the marketplace, tools and settings, drawn over the game.
          </li>
          <li>
            <strong className="text-foreground">Submission.</strong> A draggable
            window that reads the live scene: the craft on the build stage, or
            the vessel&rsquo;s situation, body, crew and resources in flight.
          </li>
          <li>
            <strong className="text-foreground">Blueprints.</strong> An
            eight view render of the craft, composited into a blueprint sheet,
            used as the thumbnail on listings and submissions.
          </li>
          <li>
            <strong className="text-foreground">Craft transfer.</strong> Packing a
            ship with its flags, paint, fuel configs and mod list on the way out,
            and reconciling it against the local install on the way in.
          </li>
          <li>
            <strong className="text-foreground">Editor restrictions.</strong> The
            VAB and SPH limited to the parts an active contract permits, when it
            sets a limit and you switch the restriction on.
          </li>
          <li>
            <strong className="text-foreground">Life support bridging.</strong>{" "}
            Detecting which life support mod a save runs, and freezing stranded
            crew out of it while they wait for a rescue.
          </li>
        </ul>
      </Section>

      <Section title="What it does not do">
        <p>
          It is not a multiplayer mod. Nobody flies in your save and you do not
          see other players&rsquo; ships in flight. What moves between saves is
          files and money, not physics.
        </p>
        <p>
          It also does not replace career mode. Community contracts are kept
          separate from KSP&rsquo;s own contract system on purpose, and the funds
          in your career save are not the KCoins in your wallet.
        </p>
        <Callout variant="info" title="Link once">
          <p>
            You connect the game to your Discord account a single time. The
            session token the add-on stores is good for thirty days, after which
            you link again with a fresh code.
          </p>
        </Callout>
      </Section>

      <DocPager
        prev={{ title: "Introduction", href: "/docs" }}
        next={{ title: "Linking Your Game", href: "/docs/how-to-use-it/linking" }}
      />
    </article>
  );
}
