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
  title: "Craft Marketplace",
  description:
    "Sell a finished craft outright. Listing from the editor, browsing and buying on the website, and the compatibility check that runs before you spend anything.",
};

export default function MarketplacePage() {
  return (
    <article>
      <DocHeader
        eyebrow="Playing"
        title="Craft Marketplace"
        description="Not everything needs a contract. If you have already built something good, list it, and let anyone buy a copy. Listing happens in the game, browsing and buying happen here."
      />

      <Section title="Why it is split across two places">
        <p>
          Listing is done from inside KSP because that is the only place a craft
          can be read: its parts, its mass, its delta-v, the mods it depends on,
          and the blueprint render used as its thumbnail all come off the vehicle
          on the build stage. A browser cannot do any of that.
        </p>
        <p>
          Browsing is done on this website because that is the only place it is
          pleasant: a filter sidebar, twenty five listings to a page, full size
          images and a proper search box beat anything drawn over a game at
          1080p. The add-on&rsquo;s market panel is the selling half only, and
          its browse button opens the site.
        </p>
      </Section>

      <Section title="Selling">
        <Steps>
          <Step n={1} title="Open the market panel with the craft loaded">
            <p>
              In the VAB or SPH, with the ship you want to sell on the stage.
            </p>
          </Step>
          <Step n={2} title="Set a name, a description and a price">
            <p>
              Prices run from 1 up to 10,000,000 KCoins. Everything else about
              the craft is read rather than typed: part count, distinct part
              types, mass, craft type, and the list of mods it came from.
            </p>
          </Step>
          <Step n={3} title="It is posted and rendered">
            <p>
              The listing appears on this website, which is where every craft is
              browsed and bought, and Discord is not involved. The thumbnail is the
              blueprint sheet the add-on renders, not a screenshot you have to
              remember to take.
            </p>
          </Step>
        </Steps>
        <Callout variant="info" title="A bonus for real designs">
          <p>
            Listing a sufficiently complex craft pays a flat bonus of 300
            KCoins, at most once a day. Complexity is counted in{" "}
            <em>distinct</em> part types and the threshold is more than twenty,
            because a booster made of three hundred copies of one girder is not a
            design worth paying for while a twenty five part probe is. Listing
            itself is never on a cooldown; only the bonus is.
          </p>
        </Callout>
      </Section>

      <Section title="Buying">
        <p>
          A purchase debits your wallet, credits the seller, and gives you the
          craft file. You own it from then on, so re-downloading later costs
          nothing.
        </p>
        <p>
          Craft bought here go through exactly the same install path as a craft
          delivered by a contract, so everything on{" "}
          <Link
            href="/docs/how-to-use-it/craft-sharing"
            className="text-primary hover:underline"
          >
            Sharing Craft
          </Link>{" "}
          applies: flags, paint, fuel configs, part substitution and the CKAN
          modpack for whatever is genuinely missing.
        </p>
      </Section>

      <Section title="The compatibility check">
        <p>
          Every listing records the exact part names its craft uses. If you have
          uploaded your part catalogue from the game, the site compares that list
          against what you actually have installed before you spend anything, and
          again on the purchase result.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "Compatible",
              type: "clear",
              description:
                "Every part in the craft resolves against your catalogue.",
            },
            {
              name: "Substitutable",
              type: "reported separately",
              description:
                "Parts the add-on will swap for an equivalent on install. These do not count against compatibility, because warning about a problem that fixes itself on arrival is a false alarm.",
            },
            {
              name: "Blocking",
              type: "genuinely missing",
              description:
                "Parts with no local equivalent. The craft will still install, but it will be missing pieces until you add the mods behind them.",
            },
            {
              name: "Unknown",
              type: "not a green light",
              description:
                "No catalogue uploaded yet, or a listing that predates part tagging. Deliberately kept distinct from compatible, and never rendered as one.",
            },
          ]}
        />
        <Callout variant="warning" title="Advisory, never a gate">
          <p>
            The check informs you; it does not stop you. You are allowed to buy a
            craft you cannot fully load, because installing the missing mod
            afterwards is a perfectly normal thing to do, and the add-on hands
            you a CKAN modpack to make it quick.
          </p>
        </Callout>
      </Section>

      <Section title="Sorting, filtering and finding things">
        <p>
          Listings can be filtered by price, craft type, part count, mass, mods
          and free text search. Six sort orders are available:
        </p>
        <DefinitionTable
          rows={[
            {
              name: "Recommended",
              type: "the default",
              description:
                "A discovery sort. New craft under fifteen days old, ranked by how fast they are picking up likes, then everything else by net likes as a tail so a quiet fortnight does not empty the tab.",
            },
            {
              name: "Newest",
              type: "by date",
              description: "Most recently listed first.",
            },
            {
              name: "Most liked",
              type: "net, all time",
              description:
                "Likes minus dislikes, without any time weighting.",
            },
            {
              name: "Best selling",
              type: "by sales",
              description: "The craft people actually bought.",
            },
            {
              name: "Price",
              type: "either direction",
              description: "Low to high, or high to low.",
            },
          ]}
        />
        <p>
          The mod filter has three modes, which do quite different things:{" "}
          <strong className="text-foreground">required</strong> finds craft that
          use every mod you picked,{" "}
          <strong className="text-foreground">allowed</strong> finds craft that
          use nothing outside your picks, and{" "}
          <strong className="text-foreground">restricted</strong> excludes craft
          using any of them.
        </p>
      </Section>

      <Section title="Likes, dislikes and reports">
        <p>
          All three require you to be signed in. An anonymous like is worth
          nothing, and an anonymous report costs a moderator their afternoon.
        </p>
        <p>
          A report opens a ticket in your own server, so you can follow what
          happens to it, with the listing&rsquo;s origin server named in the
          embed. The same listing cannot be reported twice by the same person to
          make a complaint look louder.
        </p>
      </Section>

      <DocPager
        prev={{ title: "Weekly Missions", href: "/docs/how-to-use-it/weekly-missions" }}
        next={{ title: "Economy & Ranks", href: "/docs/how-to-use-it/economy" }}
      />
    </article>
  );
}
