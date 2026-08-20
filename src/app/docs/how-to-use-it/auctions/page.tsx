import type { Metadata } from "next";
import Link from "next/link";

import {
  DocHeader,
  Section,
  Steps,
  Step,
  Callout,
  DefinitionTable,
} from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";

export const metadata: Metadata = {
  title: "Auctions",
  description:
    "Reverse auctions: post a job with a starting price and let contractors bid it down. How escrow, anti-snipe and the close work.",
};

export default function AuctionsPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Playing"
        title="Auctions"
        description="An auction is a contract with the price left open. It runs backwards: the issuer names the most they will pay, and contractors compete by bidding lower."
      />

      <Section title="Why it runs backwards">
        <p>
          In an ordinary auction the buyer is scarce and bidders compete upwards.
          Here the buyer is the one with a job and the money, and the thing being
          competed for is the work, so bids go down. The lowest bid when the
          clock runs out wins.
        </p>
        <p>
          That is useful when you know what you want built but have no idea what
          it should cost. Rather than guessing a price and finding out you were
          wrong, you name a ceiling you would be content to pay and let the
          community discover the number.
        </p>
      </Section>

      <Section title="How it runs">
        <Steps>
          <Step n={1} title="Post it with a starting price">
            <p>
              The issuer writes the same thing a contract carries: a mission, a
              deadline, a fine, an optional part restriction. The difference is
              the price, which is a ceiling rather than an offer. The full
              starting amount is debited and held right then.
            </p>
          </Step>
          <Step n={2} title="Contractors bid it down">
            <p>
              Anyone can bid. A new bid has to undercut the current lowest by at
              least one KCoin, so the price cannot be nudged by nothing to hold a
              position.
            </p>
          </Step>
          <Step n={3} title="Late bids extend the clock">
            <p>
              A bid placed within the last minute pushes the end back by a
              minute. Sniping an auction in its final second gains you nothing,
              because everyone else gets a minute to answer.
            </p>
          </Step>
          <Step n={4} title="The close binds a real contract">
            <p>
              The lowest bidder becomes the contractor on an active contract for
              their bid amount, and the difference between the starting price and
              the winning bid goes back to the issuer. From here it is an
              ordinary contract, with the same submission, review and dispute
              path.
            </p>
          </Step>
        </Steps>
      </Section>

      <Section title="The numbers">
        <DefinitionTable
          rows={[
            {
              name: "Starting price",
              type: "escrowed up front",
              description:
                "Debited from the issuer when the auction is posted, not when it closes. An auction you cannot afford is refused at posting rather than at the close, where it would waste everyone's bidding.",
            },
            {
              name: "Minimum starting price",
              type: "2 KCoins",
              description:
                "A bid has to undercut the current price by one and still be above zero, so an auction opened at 1 has no legal bid at all: it would take the escrow and then refuse everyone who tried.",
            },
            {
              name: "Minimum decrement",
              type: "1 KCoin",
              description:
                "Every bid must undercut the current lowest by at least this much.",
            },
            {
              name: "Anti-snipe window",
              type: "60 seconds",
              description:
                "A bid inside the last sixty seconds extends the end by sixty seconds.",
            },
            {
              name: "Duration",
              type: "1 hour to 7 days",
              description:
                "Set by the issuer at posting, within those bounds.",
            },
          ]}
        />
        <Callout variant="info" title="No bids is not a loss">
          <p>
            An auction that closes with nobody having bid refunds the whole
            escrow to the issuer and cancels itself. The only thing you lose by
            posting one is the time it was open.
          </p>
        </Callout>
      </Section>

      <Section title="Where to post one">
        <p>
          Auctions are opened on this website, or from the contract form in the
          game&rsquo;s sidebar, which carries an auction switch on the same
          screen that writes ordinary contracts. Either way the auction is
          global: it is mirrored into the auction channel of every server, where
          the post updates live as bids come in.
        </p>
        <p>
          Bidding is the other way round. It happens on the Discord post, which
          carries a bid button, and on this site. The add-on posts auctions but
          does not bid on them, which is the right split: opening one needs to
          read your game, and bidding on one needs nothing but a number. The
          issuer can also close an auction early rather than waiting out the
          clock.
        </p>
        <p>
          Everything in{" "}
          <Link
            href="/docs/how-to-use-it/contracts"
            className="text-primary hover:underline"
          >
            Contracts
          </Link>{" "}
          about mission text, part restrictions, constraints, submission and
          disputes applies unchanged once the auction has closed.
        </p>
      </Section>

      <DocPager
        prev={{ title: "Contracts", href: "/docs/how-to-use-it/contracts" }}
        next={{ title: "Rescue Missions", href: "/docs/how-to-use-it/rescues" }}
      />
    </article>
  );
}
