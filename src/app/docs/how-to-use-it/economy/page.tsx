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
  title: "Economy & Ranks",
  description:
    "KCoins, XP, the fifteen rank titles, and every way to earn or lose money in Boundless Missions.",
};

const levels = [
  ["1", "Kerbin orbit"],
  ["2", "Mun landing"],
  ["3", "Docking, space stations included"],
  ["4", "Duna landing"],
  ["5", "Earth orbit in Real Solar System"],
  ["6", "Eve landing"],
  ["7", "Asteroid redirect"],
  ["8", "Moon landing in Real Solar System"],
  ["9", "Jool 5"],
  ["10", "Interstellar mission"],
  ["11", "Mars in Real Solar System"],
  ["12", "Venus landing in Real Solar System"],
  ["13", "Gas giant in Real Solar System"],
  ["14", "Kerbol grand tour, every planet in one mission"],
  ["15", "Interstellar in Real Solar System"],
];

export default function EconomyPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Playing"
        title="Economy & Ranks"
        description="Two numbers follow you around: a wallet in KCoins and an XP total. The wallet is what other players pay you. XP is what the community sees."
      />

      <Section title="One wallet, everywhere">
        <p>
          Your balance and XP are stored per player rather than per Discord
          server. Join a second server that runs the bot and the same wallet
          comes with you, because the money is between players and the servers
          are just where they happen to talk.
        </p>
        <p>
          New accounts start at zero. There is no daily handout, and nothing is
          minted out of nowhere: with the exception of mission rewards and
          activity XP, the KCoins you receive came out of somebody else&rsquo;s
          wallet.
        </p>
      </Section>

      <Section title="Earning">
        <DefinitionTable
          rows={[
            {
              name: "Completing contracts",
              type: "the main way",
              description:
                "The escrowed payment is released to you when the issuer accepts your submission. Whatever the two of you agreed.",
            },
            {
              name: "Winning an auction",
              type: "your own bid",
              description:
                "You get the amount you bid, not the starting price. Bidding low to win and then resenting it is a mistake you only make once.",
            },
            {
              name: "Weekly missions",
              type: "60 KCoins and 100 XP per difficulty point",
              description:
                "A difficulty 5 mission pays 300 KCoins and 500 XP. The board runs Monday to Monday.",
            },
            {
              name: "Screenshot analysis",
              type: "18 KCoins and 50 XP per difficulty point",
              description:
                "Post a KSP screenshot and it is read for the craft, the place and how hard the shot was to earn, then paid accordingly.",
            },
            {
              name: "Selling craft",
              type: "your asking price",
              description:
                "Plus a 300 KCoin bonus for listing a design with more than twenty distinct part types, once a day at most.",
            },
            {
              name: "Levelling up",
              type: "200 KCoins per level",
              description: "Paid automatically when you cross a level boundary.",
            },
            {
              name: "Talking",
              type: "15 XP plus up to 10 bonus",
              description:
                "Per message, with a 45 second cooldown so a wall of text is worth the same as a sentence. Server boosters earn double. XP only, no KCoins.",
            },
          ]}
        />
      </Section>

      <Section title="Losing">
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            <strong className="text-foreground">Issuing a contract.</strong> The
            payment leaves your wallet the moment you send it, not when the work
            arrives. A cancelled or refused contract returns it.
          </li>
          <li>
            <strong className="text-foreground">Posting an auction.</strong> The
            full starting price is held. The difference between that and the
            winning bid comes back at the close.
          </li>
          <li>
            <strong className="text-foreground">Failing a contract.</strong> The
            fine the contract carried, which the issuer set when they wrote it.
          </li>
          <li>
            <strong className="text-foreground">Failing a weekly mission.</strong>{" "}
            Half the payment you would have earned.
          </li>
          <li>
            <strong className="text-foreground">Buying a craft.</strong> The
            listing price, once. Re-downloading something you already own is
            free.
          </li>
        </ul>
        <Callout variant="info" title="Escrow is the whole point">
          <p>
            Money is debited from the issuer up front rather than on delivery, so
            a contractor is never working on a promise from somebody whose
            balance might be spent by the time they finish. It also means an
            issuer cannot post more work than they can pay for.
          </p>
        </Callout>
      </Section>

      <Section title="Levels and XP">
        <p>
          Levels come from XP on a curve: level N needs 100 multiplied by N to
          the power of 1.5. That is 100 XP for level 1, 282 for level 2,
          and roughly 3,162 by level 10, so early levels arrive quickly and later
          ones are earned.
        </p>
        <p>
          Levelling up pays 200 KCoins and is announced in the channel it
          happened in.
        </p>
      </Section>

      <Section title="The fifteen rank titles">
        <p>
          Separately from XP levels, there are fifteen achievement titles, each
          tied to a real mission you have flown. They are Discord roles you equip
          through the title selector rather than something granted
          automatically, so your displayed rank is the one you want shown.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Achievement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {levels.map(([n, what]) => (
                <tr key={n}>
                  <td className="px-4 py-2.5 font-mono text-xs text-primary">
                    {n}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Rescues are counted separately again, with their own leaderboard. See{" "}
          <Link
            href="/docs/how-to-use-it/rescues"
            className="text-primary hover:underline"
          >
            Rescue Missions
          </Link>
          .
        </p>
      </Section>

      <Section title="Paying each other directly">
        <p>
          You can transfer KCoins to another player without a contract, for a
          minimum of 1. It is the right tool for a tip, a favour or splitting a
          job three ways, and the wrong tool for anything you would want a
          dispute path for.
        </p>
      </Section>

      <DocPager
        prev={{ title: "Craft Marketplace", href: "/docs/how-to-use-it/marketplace" }}
        next={{ title: "Bot Commands", href: "/docs/how-to-use-it/commands" }}
      />
    </article>
  );
}
