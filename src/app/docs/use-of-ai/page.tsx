import type { Metadata } from "next";
import Link from "next/link";

import { DocHeader, Section, Callout } from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bot,
  Gamepad2,
  Globe,
  FlaskConical,
  ShieldCheck,
  Rocket,
  FileSearch,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Use of AI",
  description:
    "Boundless Missions was written with an AI coding assistant. Where it was used, what it was not used for, and how the result was audited, tested and played before it shipped.",
};

const fields = [
  {
    icon: Bot,
    title: "Discord bot & API server",
    body: "Python, roughly 41,000 lines. The cogs, the wallet and contract economy, the FastAPI routes the game talks to, the Firestore data layer and the spend guard in front of it.",
  },
  {
    icon: Gamepad2,
    title: "The KSP add-on",
    body: "C#, roughly 55,000 lines. Craft transfer between differently modded saves, the TweakScale / texture / fuel-config bakes, life-support adapters, cheat detection, the in-game sidebar and the blueprint renderer.",
  },
  {
    icon: Globe,
    title: "This website",
    body: "Next.js and TypeScript. The marketplace, the contract and account pages, the moderation console, and the documentation you are reading now.",
  },
  {
    icon: FlaskConical,
    title: "Tests, tooling & audits",
    body: "The offline test suites, the harness that drives a running KSP from outside it, the build and packaging scripts, and repeated line-by-line security passes over the whole codebase.",
  },
];

const verification = [
  {
    icon: FlaskConical,
    title: "29 offline test suites",
    body: "Signing and session auth, the economy and fine debt, contract state transitions, suspensions, craft bans, the crew ledger, cost limits and rate limits, plus a separate suite for the website. They run against the real modules, not mocks of them, and they run before anything ships.",
  },
  {
    icon: ShieldCheck,
    title: "Eleven written security audits",
    body: "Successive passes over the same code, each one ending in a numbered ledger of findings that has to be closed before the next pass begins. The deep passes carry executable repro scripts, so a claimed bug has to actually reproduce before it is accepted as one, and a claimed fix has to make it stop.",
  },
  {
    icon: Rocket,
    title: "Played in four modded installs",
    body: "Not stock. Two near-identical instances run side by side so two-player hand-overs can be tested with a real account on each end, plus a Realism Overhaul / RSS install and an RP-1 install with Kerbalism, FAR and KCT. If a craft transfer survives those, it survives most saves.",
  },
  {
    icon: FileSearch,
    title: "An in-game verification pass",
    body: "A dev-only bridge lets the game itself be inspected while it runs: the roster, the vessel list, the persisted queues and the derived crew sets, read in one consistent snapshot. It found real defects that reading the code had not, including a crew-transfer bug that had already survived four rounds of review and testing.",
  },
];

export default function UseOfAiPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Start Here"
        title="Use of AI"
        description="Boundless Missions was written with an AI coding assistant. This page is here because you deserve to know that before you install an add-on that runs inside your game, and because the honest version of the story is longer than yes or no."
      />

      <Section title="The short version">
        <p>
          The code in the bot, the add-on and this website was written with
          heavy use of Anthropic&rsquo;s Claude, driven from Claude Code, over
          months of daily work alongside a human author who directed it,
          rejected a great deal of it, and is answerable for every line that
          shipped.
        </p>
        <p>
          The assistant is a tool that writes quickly and understands nothing
          about whether a craft actually lands. So the part of the process that
          matters is not what wrote the first draft. It is what happened to that
          draft afterwards, which is the rest of this page.
        </p>
      </Section>

      <Section title="Where it was used">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <Card key={field.title} className="h-full">
              <CardContent className="p-5">
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary">
                  <field.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-foreground">{field.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {field.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p>
          There is no part of the codebase it did not touch. Saying it was used
          &ldquo;for boilerplate&rdquo; would be a more comfortable claim and it
          would not be true.
        </p>
      </Section>

      <Section title="What it was not used for">
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            <strong className="text-foreground">Deciding what this is.</strong>{" "}
            The design aspects, the rules of the economy, what is fair between two
            players, what a rescue contract even means: those are the
            author&rsquo;s, and most of the work was arguing the assistant out
            of the obvious wrong answer.
          </li>
          <li>
            <strong className="text-foreground">
              Judging whether it works.
            </strong>{" "}
            A model cannot tell you that a transferred craft arrives buried in a
            hillside, that a thawed kerbal loses SAS, or that the Astronaut
            Complex has quietly stopped hiring. Every one of those was found by
            playing the game.
          </li>
          <li>
            <strong className="text-foreground">Art and assets.</strong> The
            add-on ships no parts, no models and no textures. It is a plugin; it
            adds behaviour to the parts you already have.
          </li>
          <li>
            <strong className="text-foreground">Other people&rsquo;s work.</strong>{" "}
            Nothing here redistributes another mod. When a shared craft uses a
            texture pack, the paint job is carried as a reference and a
            dependency list, never the pack&rsquo;s art. Missing mods are
            resolved into a CKAN modpack that installs them from their authors,
            with the right attribution and the right versions.
          </li>
        </ul>
      </Section>

      <Section title="How it was checked">
        <p>
          Generated code that nobody verified is worthless, and we treat it that
          way. Four things stand between a draft and a release:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {verification.map((item) => (
            <Card key={item.title} className="h-full">
              <CardContent className="p-5">
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p>
          Two rules run through all of it. A test scenario whose manual step was
          not actually performed reports <strong>skipped</strong>, never{" "}
          <strong>passed</strong>. Reporting green for work nobody did is the
          exact failure this process exists to prevent. And the test harness
          calls the real functions rather than its own copy of them, because a
          harness that reimplements the logic it is checking passes precisely
          when the real code fails.
        </p>
        <p>
          The debug bridge that makes all of this possible is compiled out of
          the released add-on, and the build asserts it both ways: the shipped
          DLL must contain none of its markers, and a development build must
          contain all of them. Without the second half, their absence proves
          nothing except that the check is broken.
        </p>
      </Section>

      <Section title="A note for the KSP modding community">
        <p>
          We know the reception AI-assisted mods get, and we think the objection
          is mostly right. What the community actually objects to is not a
          machine touching a keyboard. It is code nobody understood being
          published, breaking saves, and being abandoned when the questions
          start. It is people passing off work they cannot support, and assets
          they do not own.
        </p>
        <p>
          That is a fair thing to be angry about, and it is the standard we
          would rather be measured against than the tooling question. So:
        </p>
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            Every subsystem in this add-on is documented with the reasoning
            behind it: not what it does, but why it is built that way and what
            breaks if you change it. If we cannot explain a decision, it is
            not finished.
          </li>
          <li>
            All three repositories are public and GPL-3.0. The audits, the
            findings ledgers and the in-game verification write-ups are part of
            the work. You are invited to check the claims on this page against
            the code.
          </li>
          <li>
            Bugs go to a real ticket with a real person on the other end, and
            the add-on can file one for you from its Tools tab with your KSP.log
            attached.
          </li>
        </ul>
        <p>
          If it turns out badly, the tooling will not be the excuse. That is the
          deal.
        </p>
        <Callout variant="info" title="Different from the AI inside the product">
          <p>
            This page is about how the software was <em>built</em>. Boundless
            Missions also <em>calls</em> a model at runtime in a few narrow
            places: reading a screenshot, reviewing a submission, classifying a
            mission&rsquo;s wording. What those do, what they are
            never allowed to do, and what happens when the model is unavailable
            is covered in{" "}
            <Link
              href="/docs/how-does-it-work/ai"
              className="text-primary hover:underline"
            >
              AI Integration
            </Link>
            .
          </p>
        </Callout>
      </Section>

      <Section title="Read the source">
        <p>
          The bot, the add-on and this website are on{" "}
          <Link href="/github" className="text-primary hover:underline">
            GitHub
          </Link>
          . The fastest way to judge whether the work behind this is real is to
          open{" "}
          <Link
            href="/docs/how-to-use-it/craft-sharing"
            className="text-primary hover:underline"
          >
            Sharing Craft
          </Link>{" "}
          and see what it takes to move one ship between two saves that are not
          identically modded. That problem is the reason this project exists,
          and no amount of generated code solves it by itself.
        </p>
      </Section>

      <Section title="With respect to the people who built the rest of it">
        <p>
          Almost nothing this add-on does would work without mods written by
          other people, for free, over years. Craft transfer exists as a problem
          at all because the community made KSP installs so varied that no two
          are alike, and every hard part of this project is really a piece of
          somebody else&rsquo;s work being handled carefully.
        </p>
        <p>
          TweakScale and KSP-Recall taught us why a scaled part has to be baked
          rather than re-derived. Textures Unlimited and Reforged Materials
          Redux are the reason a paint job can cross between two saves at all.
          RealFuels and Realism Overhaul set the bar for what a transferred
          craft has to survive. USI-LS, TAC-LS, Snacks, Kerbalism and DeepFreeze
          are why a stranded crew can be rescued by someone running a completely
          different life support mod. ReStock and ReStock+ made part
          substitution possible, ConformalDecals made us fix a renderer we
          thought was finished, and ModuleManager and CKAN are the ground the
          whole ecosystem stands on. Parallax, FAR, Principia, RP-1 and
          blackrack&rsquo;s Deferred each broke something here and made it
          better.
        </p>
        <p>
          None of those authors asked for this, endorsed it, or owe it anything.
          We do not bundle their work, patch over it, or ask you to install a
          fork of it. Where this add-on needs one of their mods, it names it,
          points you at the author, and gets out of the way. If anything here
          ever handles your mod in a way you would rather it did not, say so and
          we will change it.
        </p>
      </Section>

      <DocPager next={{ title: "Introduction", href: "/docs" }} />
    </article>
  );
}
