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
  title: "Contracts",
  description:
    "How a player to player contract is written, accepted, flown, submitted, reviewed and paid, and what happens when it goes wrong.",
};

export default function ContractsPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Playing"
        title="Contracts"
        description="A contract is one player paying another to do something in Kerbal Space Program. It is the centre of the system, and auctions, rescues and weekly missions are all variations on it."
      />

      <Section title="The four kinds">
        <DefinitionTable
          rows={[
            {
              name: "Craft build",
              type: "craft_build",
              description:
                "Build a ship to a spec and hand the file over. The contractor submits the craft from the editor, and on acceptance it installs into the issuer's save.",
            },
            {
              name: "Active vessel",
              type: "active_vessel",
              description:
                "Fly a mission. The contractor submits from flight, and the vessel's live situation, body, crew and resources are attached as evidence.",
            },
            {
              name: "Rescue",
              type: "rescue",
              description:
                "Go and get a stranded ship and crew. The wreck really leaves the issuer's save and spawns in the rescuer's. Covered in full on its own page.",
            },
            {
              name: "Flag design",
              type: "flag_design",
              description:
                "Artwork rather than a ship. The deliverable is a flag image, which installs like any other flag on acceptance.",
            },
          ]}
        />
      </Section>

      <Section title="Writing one">
        <p>
          Contracts are written in the contract form in the game&rsquo;s
          sidebar. That is the only place they can be written, because the form
          reads your install as you fill it in: the player list, the parts a
          restriction would cover, the body a target sits on. Neither Discord nor
          this website can see any of that, which is the same reason neither of
          them can receive a submission.
        </p>
        <p>A contract carries:</p>
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            <strong className="text-foreground">A contractor.</strong> A specific
            player, picked from a searchable list with favourites. You cannot
            send one to yourself.
          </li>
          <li>
            <strong className="text-foreground">A mission text.</strong> Written
            in plain language. It is also what the constraint extraction reads,
            so &ldquo;no nuclear engines, under 40 parts&rdquo; is not just
            flavour.
          </li>
          <li>
            <strong className="text-foreground">A payment and a fine.</strong> The
            payment is debited from you when the contract is sent. The fine is
            what the contractor pays if they fail it.
          </li>
          <li>
            <strong className="text-foreground">A deadline.</strong> Either a
            duration in hours or a date from the calendar picker.
          </li>
          <li>
            <strong className="text-foreground">A part restriction, optionally.</strong>{" "}
            See the table below.
          </li>
        </ul>
        <Callout variant="info" title="Ten at a time">
          <p>
            A player can hold ten active contracts at once, counted across both
            sides. That is a cap on how much you can have running, not on how
            much you can do.
          </p>
        </Callout>
      </Section>

      <Section title="Part restrictions">
        <p>
          A restriction says which parts the contractor may build with. It is
          declared by the issuer as a mode rather than as a list, because a list
          of part names written by hand is wrong the moment either side changes
          mods.
        </p>
        <DefinitionTable
          rows={[
            { name: "Any", type: "none", description: "No restriction. Build it however you like." },
            { name: "Stock", type: "stock", description: "Squad parts only, with no expansion parts." },
            { name: "Stock + DLC", type: "stock_dlc", description: "Squad plus the official expansions, Making History and Breaking Ground." },
            { name: "My mods", type: "mine", description: "Every mod currently installed on the issuer's game. The usual choice when the issuer wants a craft that will actually load for them." },
            { name: "Janitor's", type: "janitor", description: "Only the mods visible in the issuer's Janitor's Closet filter, for a curated subset of a large install." },
          ]}
        />
        <p>
          On the contractor&rsquo;s side, an active contract that sets a
          restriction can arm the editor enforcer, which limits the VAB and SPH
          part list to what is permitted. It is a switch in the inbox rather than
          something forced on you, so you can still open the editor for
          unrelated work.
        </p>
      </Section>

      <Section title="Constraints read out of the mission text">
        <p>
          Beyond the mod restriction, the mission text itself is parsed for
          harder limits, which the submission is then checked against. These land
          on a fixed vocabulary rather than free text, so the game can enforce
          them:
        </p>
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>Required and forbidden specific parts.</li>
          <li>Required and forbidden propellants.</li>
          <li>
            Required and forbidden engine categories, and part categories.
          </li>
          <li>Minimum and maximum part count.</li>
          <li>
            Minimum and maximum delta-v.
          </li>
          <li>
            Minimum and maximum crew, where a maximum of zero means fly it
            uncrewed.
          </li>
          <li>
            Crew professions, matched on the exact profession string so a
            contract written on a modded install still means something on one
            without it.
          </li>
        </ul>
        <p>
          Extraction is done by the AI where it is available and by keyword
          heuristics where it is not, and the result is the same shape either
          way. See{" "}
          <Link
            href="/docs/how-does-it-work/ai"
            className="text-primary hover:underline"
          >
            AI Integration
          </Link>{" "}
          for what happens when the model is unavailable.
        </p>
      </Section>

      <Section title="The lifecycle">
        <Steps>
          <Step n={1} title="Pending">
            <p>
              Created and offered. The payment has already left the
              issuer&rsquo;s wallet and is held. The contractor has not answered
              yet.
            </p>
          </Step>
          <Step n={2} title="Active">
            <p>
              Accepted. It appears on the contractor&rsquo;s active list in
              Discord, on this website and in the game&rsquo;s inbox, together
              with any part limits it carries. Declining or cancelling at this
              stage returns the escrow.
            </p>
          </Step>
          <Step n={3} title="Submitted">
            <p>
              The contractor submits from inside KSP. What goes with it depends
              on the kind: the craft file and a rendered blueprint for a build,
              the live vessel telemetry for a flight, screenshots either way.
            </p>
          </Step>
          <Step n={4} title="Completed, or disputed">
            <p>
              The issuer reviews. Accepted releases the escrow to the contractor
              and delivers the craft, crew or flag into the issuer&rsquo;s save.
              Refused opens a dispute rather than simply ending.
            </p>
          </Step>
        </Steps>
      </Section>

      <Section title="When it goes wrong">
        <p>
          A refused submission puts the contract into dispute, where the
          contractor picks how to resolve it: settle on the agreed penalty, ask
          the issuer for more time, or escalate to the moderators for a human
          decision.
        </p>
        <p>
          Left alone, a dispute does not sit there forever. The fine collects
          itself three days after the dispute opened, because a dispute that
          never closes would be a free way to dodge the penalty. That clock runs
          from the moment the dispute opened and does not pause while a settle or
          extension request is pending, since pausing it would hand back the same
          loophole through another door.
        </p>
        <p>
          A contractor gets one extension request per dispute. Submitting again
          and being refused again opens a new dispute, which resets that count.
        </p>
        <Callout variant="warning" title="Escalation is for people, not scripts">
          <p>
            The moderator route exists for the cases nobody can automate: a
            mission text that turned out to be ambiguous, a submission that meets
            the letter of the contract and not the intent, a disagreement about
            what was actually asked for. It posts to a moderation channel with
            both sides attached.
          </p>
        </Callout>
      </Section>

      <DocPager
        prev={{ title: "Linking Your Game", href: "/docs/how-to-use-it/linking" }}
        next={{ title: "Auctions", href: "/docs/how-to-use-it/auctions" }}
      />
    </article>
  );
}
