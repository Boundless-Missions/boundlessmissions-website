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
  title: "Rescue Missions",
  description:
    "Pay another player to recover a ship and crew you stranded. How the wreck moves between saves, and how the crew survive the wait.",
};

export default function RescuesPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Playing"
        title="Rescue Missions"
        description="You put a ship somewhere it cannot come back from, with kerbals aboard. Then you pay somebody else to go and get them. The wreck genuinely leaves your save and appears in theirs, on the orbit you abandoned it at."
      />

      <Section title="What makes this different">
        <p>
          Every other contract hands over a file at the end. A rescue hands over
          a situation at the start. The ship is snapshotted and removed from the
          issuer&rsquo;s save when the contract is created, which is why the
          creation form puts it behind an explicit switch that says out loud that
          this is permanent.
        </p>
        <p>
          If the contract never completes, the wreck is restored to the issuer.
          It is not thrown away, but it is genuinely gone from your save while
          the mission is live, and that is the point: you are not asking for a
          favour, you are out a ship until someone earns the fee.
        </p>
        <Callout variant="warning" title="Sending destroys the vessel in your save">
          <p>
            Vessel removal in KSP kills whoever is aboard, so the removal also
            has to decide what happens to the crew. On the issuer&rsquo;s side
            the stranded crew leave with the craft, because they are the
            contract, and they come home later as an import. On the
            rescuer&rsquo;s side, giving the recovered craft up returns their own
            pilots to the astronaut complex and hands over only the borrowed ship
            and the borrowed kerbals.
          </p>
        </Callout>
      </Section>

      <Section title="Creating one">
        <Steps>
          <Step n={1} title="Be flying the ship you want rescued">
            <p>
              The contract is written from the game, because it needs the actual
              vessel: its orbit, its crew, its parts and its life support state
              are all read off the live ship rather than typed in.
            </p>
          </Step>
          <Step n={2} title="Choose what counts as success">
            <p>
              Crew only, meaning the rescuer may strip or abandon the hulk as
              long as the kerbals get home. Or crew plus the vessel, a salvage
              where the ship has to be towed or flown home too, which is worth
              pricing higher.
            </p>
          </Step>
          <Step n={3} title="Set the target and the margins">
            <p>
              The body is picked from a searchable list, and the orbit the
              rescuer has to reach can carry margins on apoapsis, periapsis and
              inclination, so &ldquo;get to roughly here&rdquo; is expressible
              rather than being an exact match nobody could hit.
            </p>
          </Step>
          <Step n={4} title="Confirm the permanence">
            <p>
              The switch that acknowledges the vessel is leaving your save is
              separate from the send button on purpose.
            </p>
          </Step>
        </Steps>
        <p>
          The part restriction is not a choice on a rescue. The rescuer needs
          whatever the wreck is made of in order for it to load at all, so it is
          set automatically.
        </p>
      </Section>

      <Section title="On the rescuer's side">
        <p>
          Accepting a rescue does not spawn the wreck immediately. It sits as an
          action on the active contract in the sidebar, so you spawn it when you
          are ready to fly the mission rather than finding a derelict in your
          tracking station.
        </p>
        <p>
          When it does spawn, it arrives on the orbit it was abandoned at, with
          the epoch frozen so the intervening real time has not silently moved
          it. The kerbals aboard are tagged with the owner&rsquo;s name while
          they are in your save, which is reversible and stripped when they go
          home, and which makes an untagged roster name the test for whether a
          kerbal is yours.
        </p>
      </Section>

      <Section title="How the crew survive the wait">
        <p>
          This is the part that makes a rescue work between two players who do
          not run the same life support mod, or where one runs none at all.
          Three things hold it together.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "Out of the simulation",
              type: "while stranded",
              description:
                "The stranded crew are lifted out of the vessel entirely. Nothing consumes a kerbal who is not aboard a ship, which is the only approach that also works under Kerbalism's background simulation.",
            },
            {
              name: "A clean slate on thaw",
              type: "not a stored clock",
              description:
                "USI-LS, TAC-LS and Snacks all reconstruct hunger from a stored last-fed timestamp. Handing a kerbal back with that timestamp intact after two hundred days would kill them the instant they woke up, so the thaw resets it.",
            },
            {
              name: "A ration kit",
              type: "the rescuer's resources",
              description:
                "A few days of supplies in whatever the rescuer's own save understands are stowed aboard, because a wreck provisioned for TAC carries nothing a USI save recognises. The default is three days, and it is configurable.",
            },
          ]}
        />
        <p>
          Crew thaw on their own once you are within ten kilometres, which is
          outside physics load range so the wreck is still unloaded and KSP seats
          them as it loads. There is also a button, and pressing it twice is
          harmless.
        </p>
        <Callout variant="info" title="Which mods are handled">
          <p>
            USI-LS, TAC-LS, Snacks, Kerbalism and DeepFreeze. All of it is done
            by reflection, so the add-on references none of them and does nothing
            at all if you have none installed. See{" "}
            <Link
              href="/docs/how-to-use-it/life-support"
              className="text-primary hover:underline"
            >
              Life Support
            </Link>
            .
          </p>
        </Callout>
      </Section>

      <Section title="Credit for it">
        <p>
          Completed rescues are counted per player and have their own
          leaderboard, separate from the XP ranking. Going and getting somebody
          is the one job in the system that is worth being known for on its own.
        </p>
      </Section>

      <DocPager
        prev={{ title: "Auctions", href: "/docs/how-to-use-it/auctions" }}
        next={{ title: "Weekly Missions", href: "/docs/how-to-use-it/weekly-missions" }}
      />
    </article>
  );
}
