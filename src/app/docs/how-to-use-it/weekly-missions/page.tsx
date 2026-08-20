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
  title: "Weekly Missions",
  description:
    "Twenty community objectives a week, claimed through your corporation, paid on difficulty and fined if you claim one and never deliver.",
};

export default function WeeklyMissionsPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Playing"
        title="Weekly Missions"
        description="Not every job needs a client. Once a week the bot posts a board of twenty objectives that anybody can claim, so there is always something to fly even when nobody is hiring."
      />

      <Section title="What gets posted">
        <p>
          Twenty missions, drawn from a hand written template pool and spread
          across difficulty: roughly six easy, six medium, five hard and three
          extreme, sorted easiest first. They range from reaching a stable Kerbin
          orbit up to Jool-5 and beyond.
        </p>
        <p>
          The selection is deterministic for a given week rather than rolled
          fresh on demand, so everybody in the server sees the same twenty and
          the board can be rebuilt if a message is lost.
        </p>
        <Callout variant="info" title="These are written, not generated">
          <p>
            The mission texts come from a curated pool, not from a language
            model. The AI&rsquo;s role here is only to classify a mission once it
            exists: is this a build job or a flying job, which body does it
            concern, what limits does its wording imply. See{" "}
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

      <Section title="Claiming one">
        <p>
          Each mission on the board is a button. Pressing it creates a real
          contract with the bot as the issuer and you as the contractor, posted
          into your corporation&rsquo;s channel. From there it behaves exactly
          like any other contract: it appears in your active list in game, it is
          submitted the same way, and it is verified the same way.
        </p>
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            You need to be in a corporation to claim one, since the contract is
            posted to a corp channel.
          </li>
          <li>
            You can claim any number of different missions, but each one only
            once.
          </li>
          <li>
            The deadline is the end of the week the mission belongs to.
          </li>
        </ul>
      </Section>

      <Section title="Rewards and the fine">
        <p>
          Payment scales with the mission&rsquo;s difficulty rating rather than
          being flat, so an extreme mission is worth taking seriously and an easy
          one is not worth farming.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "XP",
              type: "100 per difficulty point",
              description:
                "A difficulty 3 Mun landing pays 300 XP; a difficulty 8 Jool-5 pays 800.",
            },
            {
              name: "KCoins",
              type: "60 per difficulty point",
              description:
                "Same scale, applied to the wallet.",
            },
            {
              name: "Fine",
              type: "50% of the payment",
              description:
                "What you pay if you claim a mission and fail to deliver it. Claiming is a commitment, not a bookmark.",
            },
          ]}
        />
      </Section>

      <Section title="The week, and the Sunday lock">
        <p>
          Weeks run Monday to Monday in GMT+3. Selection closes for the last day
          of the week, so Sunday is for finishing what you claimed rather than
          claiming something you have a few hours left for.
        </p>
        <p>
          Moderators can be exempted from that lock through a server setting,
          which exists for fixing a mistake rather than for playing on Sunday.
        </p>
      </Section>

      <DocPager
        prev={{ title: "Rescue Missions", href: "/docs/how-to-use-it/rescues" }}
        next={{ title: "Craft Marketplace", href: "/docs/how-to-use-it/marketplace" }}
      />
    </article>
  );
}
