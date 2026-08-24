import type { Metadata } from "next";
import Link from "next/link";

import {
  DocHeader,
  Section,
  Callout,
  DefinitionTable,
} from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";

export const metadata: Metadata = {
  title: "Privacy & Your Data",
  description:
    "What is stored, what is not, what leaves your machine, and the three controls you have over all of it.",
};

export default function PrivacyPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Under the Hood"
        title="Privacy & Your Data"
        description="This page is the plain-language version. The Privacy Policy and Terms are the binding documents, and both are linked from the footer of every page."
      />

      <Section title="Nothing is sent before you agree">
        <p>
          The first time the add-on loads it shows a consent screen. Until you
          accept it, transmission is blocked outright, not merely discouraged.
          That is a requirement of KSP&rsquo;s add-on rules and it is implemented
          as a hard gate rather than a preference.
        </p>
        <p>
          When the policy changes, the server publishes a new version number.
          The add-on compares it against what you accepted and, if yours is
          older, blocks transmission and asks again before sending anything
          further.
        </p>
      </Section>

      <Section title="What is stored">
        <DefinitionTable
          rows={[
            {
              name: "Your Discord ID",
              type: "identity",
              description:
                "The account everything else hangs off. No password is stored, because none is ever asked for.",
            },
            {
              name: "Your Discord profile",
              type: "seen by other players",
              description:
                "Your display name, profile picture and corp name, stored so the add-on can draw you in the in-game player lists other players pick from (sending a craft, offering a contract, issuing a rescue) and beside the listings and auctions you take part in. It is the same public profile the community server already shows; your Discord ID is not displayed.",
            },
            {
              name: "Gameplay progress",
              type: "the point of the thing",
              description:
                "XP, balance, level, contracts, your corporation, marketplace listings and purchases.",
            },
            {
              name: "A session token",
              type: "on your machine",
              description:
                "Signed by the server and stored in the add-on's folder. The server keeps a version number to invalidate it against, not the token itself.",
            },
            {
              name: "A random device id",
              type: "not your hardware",
              description:
                "Generated once per install and bound to your account, so a copied session token from another machine is blocked. It is a random identifier, not a MAC address, and it says nothing about your computer.",
            },
            {
              name: "What you submit",
              type: "content",
              description:
                "Screenshots, craft files, vessel telemetry, and the mod and part lists a craft needs. All of it is what a contract, a listing or a submission consists of.",
            },
          ]}
        />
      </Section>

      <Section title="What is not stored">
        <p>
          Your MAC address is not collected at all; the add-on never reads
          it, or any other hardware identifier. Your IP address and your KSP.log
          are{" "}
          <strong className="text-foreground">not</strong> collected as a matter
          of course either, and neither is part of the device binding. They are
          gathered in exactly one situation: a moderation report that you file
          yourself, about a device you did not recognise, where they exist for
          the moderators looking into it.
        </p>
        <p>
          A bug report is the same shape of trade. Filing one from the Tools
          panel offers to attach your KSP.log, because it is the one thing that
          makes a KSP bug diagnosable, and it is your decision each time. The log
          is trimmed on your machine before it is uploaded rather than sent
          whole.
        </p>
      </Section>

      <Section title="Where AI comes into it">
        <p>
          Screenshots you post for analysis, and mission text for classification,
          may be processed by Google&rsquo;s Gemini in order to provide those
          features. That is the whole extent of it. See{" "}
          <Link
            href="/docs/how-does-it-work/ai"
            className="text-primary hover:underline"
          >
            AI Integration
          </Link>{" "}
          for exactly which calls those are.
        </p>
      </Section>

      <Section title="Your three controls">
        <DefinitionTable
          rows={[
            {
              name: "Pause sharing",
              type: "reversible, immediate",
              description:
                "One switch in the settings panel. While it is off the add-on transmits nothing and runs inert until you switch it back on. Nothing is deleted.",
            },
            {
              name: "Log out everywhere",
              type: "reversible, immediate",
              description:
                "Invalidates every session token issued to your account, including on installs you no longer have access to. Every device drops to its link screen on its next request. Your data is untouched.",
            },
            {
              name: "Delete everything",
              type: "permanent",
              description:
                "Removes your record, your sessions, your device bindings and any outstanding link codes or challenges. What is left behind is a tombstone carrying only a version number, so that already-issued tokens cannot become valid again.",
            },
          ]}
        />
        <Callout variant="warning" title="Deletion is a deletion">
          <p>
            It takes your balance, your XP and your progress with it. There is no
            undo and no archive to restore from. If you want to stop the add-on
            sending anything without losing your account, pause sharing instead.
          </p>
        </Callout>
      </Section>

      <Section title="Suspensions, and what they are not">
        <p>
          An account can be suspended from the API for a period, which blocks the
          KSP add-on and this website. It is deliberately not a Discord ban and
          not a wipe: your balance, XP, contracts and listings are untouched and
          waiting for you. There is no permanent option, because a suspension
          that never ends is a ban wearing a disguise.
        </p>
        <p>
          While suspended, the add-on shows a notice with the reason, a live
          countdown, a check again button and the reassurance that nothing was
          deleted. Sessions are deliberately not revoked, so that every request
          comes back carrying the explanation rather than dropping you to a link
          screen whose only offer would be to link again.
        </p>
        <p>
          Two things keep working throughout: checking whether the suspension has
          lifted, and logging out everywhere. The second is your own privacy
          control, and a punishment must not take it away.
        </p>
      </Section>

      <DocPager
        prev={{ title: "AI Integration", href: "/docs/how-does-it-work/ai" }}
        next={{
          title: "Bot Setup & Config",
          href: "/docs/how-does-it-work/discord-bot",
        }}
      />
    </article>
  );
}
