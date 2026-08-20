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
  title: "Life Support",
  description:
    "Which life support mods the add-on understands, how endurance is shown on listings and contracts, and how the emergency freeze keeps stranded crew alive.",
};

export default function LifeSupportPage() {
  return (
    <article>
      <DocHeader
        eyebrow="In the Game"
        title="Life Support"
        description="A crewed craft built for one life support mod means nothing to a save running a different one, and a rescue that takes two hundred days would kill the crew it was sent to save. The add-on handles both."
      />

      <Section title="Which mods are handled">
        <DefinitionTable
          rows={[
            { name: "USI-LS", type: "Supplies", description: "Roverdude's life support." },
            { name: "TAC-LS", type: "Food, Water, Oxygen", description: "Thunder Aerospace Corporation life support." },
            { name: "Snacks", type: "Snacks", description: "The lighter-weight option." },
            { name: "Kerbalism", type: "read from its own profile", description: "Rates are taken from Kerbalism's live rule set rather than guessed at, since its profiles change what a kerbal consumes." },
            { name: "DeepFreeze", type: "cryopods", description: "Handled as a life support participant so kerbals already in a pod are left alone." },
          ]}
        />
        <Callout variant="info" title="None of them are dependencies">
          <p>
            All of this is done by reflection. The add-on references no life
            support mod in its build, works normally with none installed, and
            degrades to doing nothing rather than throwing when it meets a
            version it does not recognise.
          </p>
        </Callout>
      </Section>

      <Section title="Endurance on listings and contracts">
        <p>
          When a crewed craft is listed for sale or attached to a contract, it is
          scanned for what life support mod it is provisioned for and for how
          long. That flag is shown on the listing and in the contract embed, so
          a buyer can see at a glance that a station is stocked for ninety days
          under TAC-LS before they spend anything on it.
        </p>
        <p>
          The daily consumption rates behind that number are declared once per
          mod and feed both the endurance display and the ration kit described
          below, so the two cannot drift apart.
        </p>
      </Section>

      <Section title="The emergency freeze">
        <p>
          This is what makes a rescue work between two players who do not run the
          same life support mod, and it is three things that all have to hold.
        </p>
        <ol className="list-inside list-decimal space-y-2 pl-1">
          <li>
            <strong className="text-foreground">The crew leave the simulation.</strong>{" "}
            Stranded kerbals are lifted out of the vessel entirely. Nothing
            consumes a kerbal who is not aboard a ship, and this is the only
            approach that also holds under Kerbalism&rsquo;s background
            simulation.
          </li>
          <li>
            <strong className="text-foreground">Each mod is told to let go.</strong>{" "}
            USI-LS, TAC-LS and Snacks reconstruct hunger from a stored last-fed
            timestamp. Handing a kerbal back with that timestamp intact after two
            hundred days would kill them the instant they thawed, so the thaw
            gives them a clean slate.
          </li>
          <li>
            <strong className="text-foreground">A ration kit goes aboard.</strong>{" "}
            A few days of the rescuer&rsquo;s own resources are stowed on the
            wreck, because a ship provisioned for TAC carries nothing a USI save
            recognises. Three days by default, adjustable in settings.
          </li>
        </ol>
        <p>
          Crew thaw on their own at ten kilometres, which is outside physics load
          range so the wreck is still unloaded and the game seats them as it
          loads. There is also a manual button, and pressing it twice is
          harmless.
        </p>
      </Section>

      <Section title="Why a thaw is two releases">
        <p>
          The freeze imposes two states, so undoing it has to undo both. The life
          support mods have to let go, and so does the roster.
        </p>
        <p>
          Frozen crew are parked as dead so KSP&rsquo;s own respawn timer cannot
          quietly revive them behind the add-on&rsquo;s back, and the freeze
          record is the only note that this was deliberate. Any path that drops
          such a record without seating the crew has to release them too: yours
          back to available, borrowed ones out of the roster entirely. Left
          parked, they would read in the astronaut complex as kerbals who are
          simply not there.
        </p>
        <Callout variant="warning" title="Every exit path thaws first">
          <p>
            Including the one where the wreck is already gone. Under Kerbalism
            the exemption flag is saved with the game, so a kerbal frozen and
            never thawed would be exempt from life support for the rest of that
            save.
          </p>
        </Callout>
      </Section>

      <Section title="Switching it off">
        <p>
          The freeze has its own setting, on by default, and the ration size is a
          number of days you can change. Both live in the{" "}
          <Link
            href="/docs/how-does-it-work/ksp-mod/settings"
            className="text-primary hover:underline"
          >
            settings file
          </Link>{" "}
          and in the settings panel. See also{" "}
          <Link
            href="/docs/how-to-use-it/rescues"
            className="text-primary hover:underline"
          >
            Rescue Missions
          </Link>{" "}
          for the mission side of it.
        </p>
      </Section>

      <DocPager
        prev={{ title: "Sharing Craft", href: "/docs/how-to-use-it/craft-sharing" }}
        next={{ title: "Mod Settings File", href: "/docs/how-does-it-work/ksp-mod/settings" }}
      />
    </article>
  );
}
