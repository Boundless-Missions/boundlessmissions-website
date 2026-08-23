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
  title: "Mod Build & Setup",
  description:
    "Building the C# add-on, where it deploys, and the pieces it is made of.",
};

export default function KspModPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Under the Hood"
        title="Mod Build & Setup"
        description="A C# add-on targeting .NET 4.7.2, running inside Kerbal Space Program. This page is for building it rather than using it."
      />

      <Section title="Building">
        <CodeBlock
          title="Terminal"
          code={`cd "KSP Mod Side"
./build.sh

# Build only, without deploying:
cd "KSP Mod Side/GeneKerman"
dotnet build -c Release`}
        />
        <p>
          The build script compiles the assembly, copies it into the GameData
          folder, and deploys to the local development installs. Managed
          assemblies are referenced from{" "}
          <code className="font-mono text-xs">KSP_Data/Managed</code>.
        </p>
        <Callout variant="warning" title="Two names, do not conflate them">
          <p>
            The source project and the assembly are called{" "}
            <code className="font-mono text-xs">GeneKerman</code>. The GameData
            folder it installs into is called{" "}
            <code className="font-mono text-xs">BoundlessMissions</code>. That is
            intentional, and the settings node keeps the source name too, so
            renaming either one to match the other breaks things quietly.
          </p>
        </Callout>
      </Section>

      <Section title="Build channels">
        <p>
          The default channel produces a clean assembly with the in-game debug
          test panel compiled out entirely. A development channel includes it,
          for running the live security tests from inside the game.
        </p>
        <p>
          A development build must never be published: it carries test-only code,
          and its hash differs, so the server&rsquo;s version gate would reject
          it anyway. Packaging a release on a non-production channel is refused
          by the script rather than merely discouraged.
        </p>
      </Section>

      <Section title="The pieces">
        <DefinitionTable
          rows={[
            {
              name: "GeneKermanMod.cs",
              type: "the singleton",
              description:
                "Loaded at the main menu and persisting across every scene. Runs the unlinked, linking, linked state machine and holds the API client and the interface.",
            },
            {
              name: "ApiClient.cs",
              type: "all HTTP",
              description:
                "Every request to the server, through Unity's own web request type with coroutine callbacks, which is the only practical HTTP client in KSP's Mono runtime. Also owns the settings file and the session token.",
            },
            {
              name: "Consent.cs",
              type: "the gate",
              description:
                "The privacy opt-in everything else waits on. Blocks all transmission until accepted, and re-reads its file when it changes on disk.",
            },
            {
              name: "ClientState.cs",
              type: "shared state",
              description:
                "Profile, missions, contracts and the notification feed, plus the fetch, the local notification merge, de-duplication, the unread count and the action coroutines. Exposed by reference rather than copied, because a second copy drifts the moment either side gains a mutation.",
            },
            {
              name: "VesselDataCollector.cs",
              type: "telemetry",
              description:
                "Reads situation, body, resources and crew off the active vessel for submission verification.",
            },
            {
              name: "UI/Gui/",
              type: "the sidebar",
              description:
                "A retained-mode canvas UI with its own design tokens, procedurally drawn sprites and a fluent builder, since there is no Unity editor in this workflow.",
            },
            {
              name: "UI/",
              type: "the gates",
              description:
                "The screens drawn in immediate mode rather than on the canvas: consent, the update gate, the suspension notice, device verification and the link screen. Each of them draws at a moment when the canvas may not.",
            },
            {
              name: "LifeSupport/",
              type: "reflection only",
              description:
                "One adapter per optional life support mod over a shared base, plus the registry, the endurance scan and the freeze. The build references none of them.",
            },
          ]}
        />
      </Section>

      <Section title="A note on the Python files in the source tree">
        <p>
          There are a handful of{" "}
          <code className="font-mono text-xs">.py</code> files sitting beside the
          C#. They are one-off patching scripts and are not part of the build.
          The interface is entirely C#.
        </p>
      </Section>

      <Section title="Optional mod integrations">
        <p>
          No other mod is referenced at build time. Each is detected at runtime
          and reached through reflection where it has an API worth reaching, so
          every integration degrades to doing nothing when the mod is absent and
          to doing nothing harmful when it is present in a version the add-on
          does not recognise. That covers TweakScale, Textures Unlimited,
          RealFuels, ConformalDecals, Janitor&rsquo;s Closet, CKAN, Deferred
          and all five life support mods. The details of what each one
          carries are on{" "}
          <Link
            href="/docs/how-to-use-it/craft-sharing"
            className="text-primary hover:underline"
          >
            Sharing Craft
          </Link>{" "}
          and{" "}
          <Link
            href="/docs/how-to-use-it/life-support"
            className="text-primary hover:underline"
          >
            Life Support
          </Link>
          .
        </p>
      </Section>

      <DocPager
        prev={{
          title: "Bot Setup & Config",
          href: "/docs/how-does-it-work/discord-bot",
        }}
        next={{ title: "REST API", href: "/docs/how-does-it-work/api" }}
      />
    </article>
  );
}
