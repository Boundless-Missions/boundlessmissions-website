import Link from "next/link";
import {
  ArrowRight,
  Coins,
  ScrollText,
  Gavel,
  LifeBuoy,
  Store,
  CalendarClock,
  Rocket,
  Wrench,
  ScanLine,
  Link2,
  ShieldCheck,
  Building2,
  Scale,
  Bot,
  Gamepad2,
  PanelRight,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FeatureCard } from "@/components/feature-card";
import { HeroConsole } from "@/components/hero-console";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: ScrollText,
    title: "Player to player contracts",
    description:
      "Hire someone to build a craft or to fly a mission. The reward is taken out of the issuer's wallet when the contract is sent and released when the work is accepted, so nobody works on a promise.",
  },
  {
    icon: Gavel,
    title: "Reverse auctions",
    description:
      "Post a job with a starting price and let contractors bid it down. The lowest bid at the close wins and becomes a real contract; the leftover escrow goes back to the issuer.",
  },
  {
    icon: LifeBuoy,
    title: "Rescue missions",
    description:
      "Strand your own ship and crew somewhere awful, and pay another player to go get them. The wreck really leaves your save and spawns in theirs, on the same orbit you left it.",
  },
  {
    icon: Store,
    title: "Craft marketplace",
    description:
      "Sell a ship you are proud of. List it from the editor in game, browse and buy on this website, with likes, reports and a compatibility check against the parts you actually have installed.",
  },
  {
    icon: CalendarClock,
    title: "Weekly missions",
    description:
      "A fresh set of community objectives every week, split between build a craft and fly a mission, with rewards scaled to difficulty and a fine if you claim one and never deliver.",
  },
  {
    icon: Rocket,
    title: "Craft that arrive intact",
    description:
      "A shared ship carries its own flags, its Textures Unlimited paint, its RealFuels plumbing and a list of the mods it came from. Parts you are missing are swapped for equivalents where a safe one exists.",
  },
  {
    icon: Wrench,
    title: "Rescale baked in, not required",
    description:
      "TweakScale sizing is measured on the sender's machine and written into the file as plain numbers, so a rescaled craft rebuilds identically for someone on a different TweakScale version, or on none at all.",
  },
  {
    icon: LifeBuoy,
    title: "Life support that crosses mods",
    description:
      "USI-LS, TAC-LS, Snacks, Kerbalism and DeepFreeze are each handled. Stranded crew are frozen out of the simulation while they wait, and thawed with a clean slate so a 200 day wait is survivable.",
  },
  {
    icon: PanelRight,
    title: "A full interface in game",
    description:
      "Missions, the contract inbox, your profile, the notification feed, selling and the tools panel all live in a sidebar drawn over the game. Nothing here needs you to alt-tab.",
  },
  {
    icon: ScanLine,
    title: "Screenshot analysis",
    description:
      "Post a KSP screenshot and the bot reads the ship, the place and the difficulty out of it, then pays XP and KCoins to match.",
  },
  {
    icon: Building2,
    title: "Corporations",
    description:
      "Found a corporation and get a text channel of your own to run it from, so a group of players can take on work together.",
  },
  {
    icon: Scale,
    title: "Disputes with a deadline",
    description:
      "A refused submission opens a dispute the contractor can settle, appeal or ask more time for. Left untouched it resolves itself after three days, so nobody can stall out of paying.",
  },
];

const loop = [
  {
    n: "01",
    title: "Somebody needs a ship",
    body: "An issuer writes a contract in the add-on: build this, or fly this, by this date, for this much. The money leaves their wallet right then and sits in escrow.",
  },
  {
    n: "02",
    title: "A contractor takes it",
    body: "It shows up in Discord, on this website and in the game's contract inbox. Accepting it puts it on their active list, along with any part restrictions it carries.",
  },
  {
    n: "03",
    title: "The work gets flown",
    body: "Submission happens from inside KSP, with the vessel's real situation, body, crew and resources attached, plus screenshots and the craft file itself where the contract asks for one.",
  },
  {
    n: "04",
    title: "Payment and delivery",
    body: "The issuer reviews it. Accepted, the escrow is released and any craft or crew hand over into their save. Refused, it goes to dispute rather than nowhere.",
  },
];

const care = [
  {
    icon: ShieldCheck,
    title: "No secrets on the game client",
    body: "Linking trades a 6-digit code for a signed session token. The mod never holds an API key, a Discord token or a database credential, and a token can be revoked from the server at any time.",
  },
  {
    icon: Coins,
    title: "Escrow, not trust",
    body: "Contract and auction rewards are debited up front and held. A contract that is cancelled or never delivered returns the money rather than leaving one side out of pocket.",
  },
  {
    icon: Link2,
    title: "Nothing is sent before you agree",
    body: "The mod transmits nothing at all until you accept the privacy terms in game, and a single switch turns data sharing back off and leaves the add-on inert.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 glow-grid opacity-60" />
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="container relative py-20 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-6 gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Discord bot + KSP add-on
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl text-gradient">
                Uniting The KSP Community
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Boundless Missions turns a Kerbal Space Program community into a
                working space industry. Players can create contracts to get others to design crafts or fly them to locations of interest.
                Corporations can work together, players can auction off their services, and everyone gets a little something for their troubles.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/docs">
                    Read the docs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/marketplace">Browse the marketplace</Link>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto mt-16 max-w-5xl">
              <div className="ring-glow rounded-2xl">
                <HeroConsole />
              </div>
            </div>
          </div>
        </section>

        {/* The loop */}
        <section className="border-y border-border/60 bg-card/20">
          <div className="container py-20">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <Badge variant="default" className="mb-4">
                The loop
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How a job actually runs
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every contract, auction and rescue in the system follows the same
                four beats. The difference is only in what counts as finished.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {loop.map((step) => (
                <div
                  key={step.n}
                  className="relative rounded-xl border border-border bg-card/60 p-6"
                >
                  <span className="font-mono text-xs font-semibold text-primary">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Two components */}
        <section className="container py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Two halves of one system
            </h2>
            <p className="mt-4 text-muted-foreground">
              A Discord bot runs the community side and serves a private API. An
              add-on brings all of it inside Kerbal Space Program. They share no
              code, only that API.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">Discord bot</h3>
                    <p className="text-xs text-muted-foreground">
                      Lives in your Discord server
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                  <li>
                    Wallets, XP and the rank titles that come with them, shared
                    across every server the bot is in.
                  </li>
                  <li>
                    Contract and auction boards, dispute handling, tickets and
                    moderation.
                  </li>
                  <li>
                    Weekly missions, screenshot analysis and corporations.
                  </li>
                  <li>
                    A signed REST API, running in the same process, that the game
                    talks to.
                  </li>
                </ul>
                <Button asChild variant="link" className="mt-4 px-0">
                  <Link href="/docs/how-does-it-work/discord-bot">
                    Bot documentation
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary">
                    <Gamepad2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">KSP add-on</h3>
                    <p className="text-xs text-muted-foreground">
                      Runs inside Kerbal Space Program
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                  <li>
                    A sidebar over the game for missions, the inbox, your
                    profile, selling and the tools panel.
                  </li>
                  <li>
                    Submission that reads the live vessel and renders a blueprint
                    sheet of the craft.
                  </li>
                  <li>
                    Craft transfer that carries flags, paint, fuel configs and a
                    mod list, and installs the result.
                  </li>
                  <li>
                    Editor restrictions while a contract that sets them is active.
                  </li>
                </ul>
                <Button asChild variant="link" className="mt-4 px-0">
                  <Link href="/docs/how-does-it-work/ksp-mod">
                    Add-on documentation
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Feature grid */}
        <section className="border-y border-border/60 bg-card/20">
          <div className="container py-20">
            <div className="mb-12 max-w-2xl">
              <Badge variant="default" className="mb-4">
                Features
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything the community runs on
              </h2>
              <p className="mt-4 text-muted-foreground">
                One wallet, one contract system and one set of data, reachable
                from Discord, from this website and from inside the game.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Linking flow */}
        <section className="container py-20">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="default" className="mb-4">
                How it connects
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Link a KSP install in three steps
              </h2>
              <p className="mt-4 text-muted-foreground">
                The add-on and the bot pair over a short lived code, then stay
                connected on a signed token. No password is involved and none is
                ever asked for.
              </p>
              <ol className="mt-8 space-y-6">
                {[
                  {
                    title: "Ask the bot for a code",
                    body: "Run the link command in Discord. You get a 6-digit code that is good for three minutes, which is long enough to type it and short enough that a screenshot of it is worthless.",
                  },
                  {
                    title: "Type it in game",
                    body: "The add-on's link screen takes the code and trades it for a session token that lasts thirty days. The code is thrown away at that point.",
                  },
                  {
                    title: "Play without switching",
                    body: "Contracts, missions, rewards, notifications and craft deliveries now move between Discord and KSP on their own.",
                  },
                ].map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <Button asChild className="mt-8" variant="outline">
                <Link href="/docs/how-to-use-it/linking">
                  Read the linking guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-4 lg:pt-16">
              {care.map((item) => (
                <Card key={item.title}>
                  <CardContent className="flex gap-4 p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Modded saves */}
        <section className="container pb-20">
          <Card className="overflow-hidden">
            <CardContent className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <Badge variant="default" className="mb-4">
                  Modded saves
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Two players never have the same install
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  That is the hard part of sharing craft, and most of the add-on
                  exists to deal with it. A ship leaving one save is packed with
                  everything a part name cannot express, and a ship arriving in
                  another is reconciled against what is actually installed there
                  before KSP ever sees it.
                </p>
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/docs/how-to-use-it/craft-sharing">
                    How craft sharing works
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {[
                  "Custom flags travel with the craft, keyed by the image itself rather than by the random name KSP gives them.",
                  "Textures Unlimited recolours are carried as a manifest, and dropped cleanly rather than half applied when the pack is missing.",
                  "RealFuels tank types and engine configs are checked on arrival, or stripped back to local fuels if RealFuels is not installed.",
                  "Missing parts are matched to equivalents where the geometry is provably identical, and only reported where it is not.",
                  "Whatever cannot be substituted is turned into a CKAN modpack file so the mods behind it are one click away.",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="container pb-24">
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 glow-grid opacity-50" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <CardContent className="relative flex flex-col items-center gap-6 p-10 text-center sm:p-16">
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to fly for hire?
              </h2>
              <p className="max-w-xl text-muted-foreground">
                Start with linking your game, then take a look at what the
                contract system can be asked to do. The documentation covers both
                the playing and the running of it.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/docs/how-to-use-it/linking">
                    Link your game
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/docs">Open documentation</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
