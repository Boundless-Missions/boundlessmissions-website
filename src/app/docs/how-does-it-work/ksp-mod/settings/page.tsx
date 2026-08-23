import type { Metadata } from "next";
import Link from "next/link";

import {
  DocHeader,
  Section,
  Callout,
  DefinitionTable,
} from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Mod Settings File",
  description:
    "Every key in the add-on's settings file, what it does, and the other files that live beside it.",
};

export default function SettingsPage() {
  return (
    <article>
      <DocHeader
        eyebrow="In the Game"
        title="Mod Settings File"
        description="Everything here can be changed from the settings panel in game, and this page is for the times you would rather edit a file. It is a KSP ConfigNode, which has one quirk worth knowing about."
      />

      <Section title="Where it lives">
        <p>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            GameData/BoundlessMissions/PluginData/settings.cfg
          </code>
        </p>
        <p>
          The node inside it is named{" "}
          <code className="font-mono text-xs">GeneKerman</code>, which is the
          add-on&rsquo;s source project name rather than the folder it installs
          to. A node with any other name is ignored and the add-on falls back to
          its defaults, so do not rename it to match the folder.
        </p>
        <p>
          The file does not ship with a release. It is written the first time the
          add-on saves settings, which means an update never overwrites your
          choices.
        </p>
      </Section>

      <Section title="Example">
        <CodeBlock
          title="settings.cfg"
          code={`GeneKerman
{
    useOfficialServer = true
    serverProtocol = http
    serverHost = localhost
    serverPort = 5022
    enableNotifications = true
    enableCheckpointPhotos = true
    enableDataGathering = true
    enableWebUi = false
    enableEmergencyFreeze = true
    emergencyRationDays = 3
    enablePartSubstitution = true
    enableTextureTransfer = true
    enableFuelConfigTransfer = true
    marketplaceProtocol = https
    marketplaceAddress = example.com/marketplace
}`}
        />
        <Callout variant="warning" title="Why every URL is split in two">
          <p>
            In ConfigNode format,{" "}
            <code className="font-mono text-xs">//</code> starts a comment. A
            full URL written as one value would be silently truncated at its
            double slash, which is a bug that is very hard to see and very easy
            to reintroduce. So protocol, host and port are always stored as
            separate keys and recombined by the add-on.
          </p>
        </Callout>
      </Section>

      <Section title="Server">
        <DefinitionTable
          rows={[
            {
              name: "useOfficialServer",
              type: "bool, default true",
              description:
                "Use the official Boundless Missions server. When false, the host, port and protocol below are used instead. The custom address is remembered either way, so switching back and forth does not mean retyping it.",
            },
            {
              name: "serverHost",
              type: "string, default localhost",
              description:
                "Hostname or IP of the machine running the API. Only used when useOfficialServer is false.",
            },
            {
              name: "serverPort",
              type: "int, default 5022",
              description: "Port the API listens on.",
            },
            {
              name: "serverProtocol",
              type: "http or https, default http",
              description: "Protocol used to reach the API.",
            },
          ]}
        />
      </Section>

      <Section title="Interface and privacy">
        <DefinitionTable
          rows={[
            {
              name: "enableDataGathering",
              type: "bool, default true",
              description:
                "The master opt-out. While false the add-on transmits nothing and runs inert until you switch it back on from the in-game panel. This is the setting behind KSP's add-on rules on data collection.",
            },
            {
              name: "enableNotifications",
              type: "bool, default true",
              description: "Whether in-game notification popups are shown.",
            },
            {
              name: "enableWebUi",
              type: "bool, default false",
              description:
                "Open the interface in your browser instead of the sidebar drawn over the game. Absent means off, so an update never moves an existing install to a different interface.",
            },
            {
              name: "enableCheckpointPhotos",
              type: "bool, default true",
              description:
                "Whether milestone photo prompts fire on a rendezvous, flyby or asteroid encounter. Currently dormant because the feature is switched off server side, so the add-on holds it off too and hides its switch. Your value is still read and written and takes effect again when the feature returns.",
            },
          ]}
        />
      </Section>

      <Section title="Craft transfer">
        <p>
          All three of these are on by default, and switching one off does not
          make the add-on blind to the problem it solves. Each one still scans
          and still reports; it just stops changing anything, offering advice
          instead. See{" "}
          <Link
            href="/docs/how-to-use-it/craft-sharing"
            className="text-primary hover:underline"
          >
            Sharing Craft
          </Link>
          .
        </p>
        <DefinitionTable
          rows={[
            {
              name: "enablePartSubstitution",
              type: "bool, default true",
              description:
                "Swap a part a received craft asks for but this install does not have, where a provably identical equivalent exists. Only engages on a craft that would otherwise refuse to load.",
            },
            {
              name: "enableTextureTransfer",
              type: "bool, default true",
              description:
                "Carry a craft's paint job — Textures Unlimited or Reforged Materials Redux — and reconcile it against what is installed here on arrival.",
            },
            {
              name: "enableFuelConfigTransfer",
              type: "bool, default true",
              description:
                "Carry a craft's RealFuels tank and engine configuration, and either check it or strip it back to local fuels depending on whether RealFuels is installed here.",
            },
          ]}
        />
      </Section>

      <Section title="Life support and rescues">
        <DefinitionTable
          rows={[
            {
              name: "enableEmergencyFreeze",
              type: "bool, default true",
              description:
                "Freeze the crew of a rescue wreck out of the life support simulation while they wait, and thaw them with a clean slate on arrival.",
            },
            {
              name: "emergencyRationDays",
              type: "int, default 3",
              description:
                "How many days of the rescuer's own resources to stow aboard a wreck on thaw. Zero is allowed; a negative value is clamped to zero rather than sizing a ration kit backwards.",
            },
          ]}
        />
      </Section>

      <Section title="Marketplace">
        <DefinitionTable
          rows={[
            {
              name: "marketplaceProtocol",
              type: "http or https, default https",
              description:
                "Protocol for the marketplace website opened from the Market panel.",
            },
            {
              name: "marketplaceAddress",
              type: "string",
              description:
                "Optional override for the marketplace website, without the scheme. Replaces an older single-value key that could not survive ConfigNode comment parsing; a leftover of that key is read once and migrated.",
            },
          ]}
        />
      </Section>

      <Section title="The other files in that folder">
        <DefinitionTable
          rows={[
            {
              name: "session.token",
              type: "the active session",
              description:
                "The signed token for the server you are currently pointed at. Deleting it returns this install to its unlinked state, ready for a new code, and affects nothing else.",
            },
            {
              name: "sessions.cfg",
              type: "parked sessions",
              description:
                "A token per server address, so moving between the official server and one you run yourself does not mean linking again each time.",
            },
            {
              name: "consent.cfg",
              type: "privacy opt-in",
              description:
                "Kept separate from settings.cfg on purpose. It is re-read when it changes on disk, so an edit takes effect without a restart.",
            },
            {
              name: "device.id",
              type: "random identifier",
              description:
                "Written once, sent with every request, and bound to your account. Not a MAC address and not derived from your hardware.",
            },
            {
              name: "favorites.cfg",
              type: "starred players",
              description: "The players you have starred in the picker lists.",
            },
            {
              name: "trait_repairs.cfg",
              type: "roster repair records",
              description:
                "The original crew professions the roster repair tool overwrote, kept so they can be handed back when the defining mod is reinstalled.",
            },
          ]}
        />
        <Callout variant="info" title="None of these ship with a release">
          <p>
            Every file listed here is created by the add-on at runtime, so
            upgrading never overwrites your settings, your session or your
            starred players.
          </p>
        </Callout>
      </Section>

      <DocPager
        prev={{ title: "Life Support", href: "/docs/how-to-use-it/life-support" }}
        next={{
          title: "Browser Interface",
          href: "/docs/how-does-it-work/ksp-mod/browser-ui",
        }}
      />
    </article>
  );
}
