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
  title: "Sharing Craft",
  description:
    "How a craft survives the trip between two differently modded saves: flags, rescaling, paint, fuel configs, part substitution and the CKAN modpack.",
};

export default function CraftSharingPage() {
  return (
    <article>
      <DocHeader
        eyebrow="In the Game"
        title="Sharing Craft"
        description="Two players never have the same install. That is the hard problem behind every contract that hands over a ship, and most of the add-on exists to solve it."
      />

      <Section title="The problem">
        <p>
          A KSP craft file is a list of part names and their arrangement. That is
          almost enough. What it does not say is which mod each part came from,
          which flag image the player imported, which recolour pack painted it,
          what its tanks were configured as, or what any of it was scaled to.
        </p>
        <p>
          Handed to somebody with a different install, a craft with those gaps
          fails in ways that are hard to diagnose: parts silently missing, a
          flag that errors mid-load, an engine that is the wrong size, a tank
          full of a propellant that does not exist here.
        </p>
        <p>
          So a craft leaving your save is packed with everything the file cannot
          express, and a craft arriving is reconciled against the local install
          before KSP ever sees it. Every export path in the add-on runs the same
          chain, and the install path unpacks it in exactly the reverse order.
        </p>
        <CodeBlock
          title="On the way out"
          code={`rescale bake  ->  flags  ->  scale version  ->  paint  ->  fuel configs  ->  mod list  ->  thumbnail`}
        />
      </Section>

      <Section title="Rescaling, baked rather than referenced">
        <p>
          TweakScale stores a scale factor and lets exponents derive everything
          else at load time. Those exponents differ between TweakScale versions
          and forks, so the same file rebuilds differently on two machines.
        </p>
        <p>
          Instead of carrying the factor, the sender copies the values already
          computed on the live part: the model scale, the dry mass, the module
          stats. A craft that leaves this way needs no TweakScale at all on
          arrival, which is why TweakScale is deliberately left out of the
          dependency list a submission reports.
        </p>
        <p>Baking fixes three things, not one, which is why skipping it broke craft even for people who did have TweakScale:</p>
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>The scale itself.</li>
          <li>
            The position of surface-attached parts on a scaled parent, which KSP
            serialises in an encoding that only reads correctly if the recipient
            has KSP-Recall.
          </li>
          <li>
            A layout pin re-asserted at runtime, because KSP re-seats
            surface-attached parts a few frames after load and on every undo.
          </li>
        </ul>
        <Callout variant="warning" title="A mismatch warning that only fires when it matters">
          <p>
            TweakScale attaches its module to every compatible part whether or
            not you scaled it, so a fully baked craft still carries plenty of
            TweakScale modules. The version warning therefore checks whether
            anything is <em>actually</em> rescaled rather than whether the file
            mentions TweakScale, which is the difference between a useful warning
            and one every recipient sees for no reason.
          </p>
        </Callout>
      </Section>

      <Section title="Flags">
        <p>
          Custom flags travel with the craft as embedded images, written into the
          add-on&rsquo;s flag folder on arrival and injected into the game&rsquo;s
          database so they render without a restart.
        </p>
        <p>
          They are named by a hash of the image rather than by the name KSP gave
          them, because KSP names player-imported flags with short random ids and
          two people&rsquo;s identically named flags are different pictures. That
          hash can only be computed from the bytes, so a flag reference of that
          shape in a craft is proof the sender actually held the image.
        </p>
        <p>
          A reference that does not resolve is reset to the default flag at both
          ends. Left alone it is self-perpetuating rather than cosmetic:
          re-exporting finds no file, embeds nothing, and ships the same dead
          reference onward, while every module trying to resolve it throws. A
          broken mission flag in particular surfaces as a ConformalDecals
          exception partway through loading, which names neither the flag nor the
          craft.
        </p>
      </Section>

      <Section title="Textures Unlimited paint">
        <p>
          Textures Unlimited adds zero parts, so every part-based mod detection
          path is blind to it. The recolour data itself already rides in the
          craft file, but which pack defines the texture set does not, and that
          is only knowable on the sender&rsquo;s machine.
        </p>
        <p>
          So each referenced texture set is resolved back to the folder of the
          config that defines it, and that manifest travels with the craft. It is
          what makes a painted craft tag correctly on the marketplace, and what
          turns a missing recolour pack into an installable CKAN modpack.
        </p>
        <p>
          On arrival, every recolour module the local prefab accepts is kept and
          the ones it cannot are dropped, so the craft arrives either fully
          painted or in stock colours, never with orphaned modules. The texture
          files themselves are never embedded: they are the pack author&rsquo;s
          art, far too large for a craft transfer, and not ours to redistribute.
        </p>
        <p>
          Reforged Materials Redux &mdash; the in-editor painter built on top of
          Textures Unlimited &mdash; is carried the same way, with one difference
          that matters. It keeps its paint in its own part module and needs no
          manifest at all, because it is a single mod in a single folder. But it
          patches that module onto <em>every</em> part in the game, painted or
          not, so a craft only counts as painted when a setting is actually off
          its default. That is the test behind the marketplace tag, and it is why
          an unpainted craft built on a Reforged install still lists as stock.
        </p>
      </Section>

      <Section title="RealFuels and Realism Overhaul">
        <p>
          RealFuels also adds zero parts, configuring existing ones instead. Two
          RSS-RO players already exchange working craft with no help at all. What
          the manifest adds is the part a file cannot express: the sender&rsquo;s
          RealFuels version, whether their install runs Realism Overhaul, each
          tank type resolved to the folder that declares it, and the selected
          engine config names.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "Recipient has RealFuels",
              type: "checks, not changes",
              description:
                "Undefined tank types, unavailable engine configs and a Realism Overhaul mismatch are each reported once. Nothing is rewritten.",
            },
            {
              name: "Recipient has no RealFuels",
              type: "reconciled",
              description:
                "The RealFuels modules and any resource naming a propellant that does not exist locally are dropped, so parts refill from their local defaults and the craft arrives in local fuels rather than half loaded. The caveat that it was balanced for other physics is stated plainly.",
            },
            {
              name: "Realism Overhaul itself",
              type: "named, never installed",
              description:
                "The CKAN modpack lists RealFuels and missing tank packs but never Realism Overhaul, because it is an environment rather than a dependency. Like a DLC, it is named in the warning and kept out of the file.",
            },
          ]}
        />
      </Section>

      <Section title="Missing parts, and what can be substituted">
        <p>
          Where a part is genuinely the same object under two names, it is
          swapped. The motivating case is Making History&rsquo;s inflatable
          airlock against ReStock+&rsquo;s stand-in for it: the same object,
          because ReStock retextures the DLC part using the very asset ReStock+
          builds its DLC-free version from.
        </p>
        <p>
          That is also how the substitution table was built, mechanically rather
          than by eye. Two parts are listed as the same thing only where
          ReStock&rsquo;s DLC patch and the ReStock+ stand-in resolve to the same
          model asset, which proves identical geometry and attach points.
        </p>
        <Callout variant="warning" title="Shared art is not shared balance">
          <p>
            ReStock+ reuses some engine bells for much smaller engines. Those
            pairs live on a separate look-alike list that is only ever reported,
            never substituted, because swapping them would quietly change what
            the ship does.
          </p>
        </Callout>
        <p>
          Substitution runs in both directions, because ReStock+ hides its
          stand-ins when the DLC is present and a career save treats a hidden
          part as unpurchased and refuses to launch. Switching substitution off
          in settings still scans and reports; it just offers the advice instead
          of acting on it.
        </p>
      </Section>

      <Section title="Whatever is left: a CKAN modpack">
        <p>
          A missing part cannot be traced back to a mod on the recipient&rsquo;s
          machine, because the part is exactly what is absent. So the answer is
          worked out on the sender&rsquo;s side and carried with the transfer,
          then turned into a CKAN modpack file the recipient can open.
        </p>
        <p>
          A GameData folder is not a mod, and the whole thing is built around not
          confusing the two. Some mods install a parts folder next to a
          plugin-only companion, and several ship a core split where a parts mod
          and a library live under one name. So parts are resolved through
          install paths rather than folder names, and a path two mods share is
          left out rather than guessed at.
        </p>
        <p>
          The stock expansions are treated as dependencies rather than as stock,
          keyed separately from each other, because they are bought separately
          and owning one says nothing about the other. A missing expansion is
          reported but never written into the modpack, since CKAN can detect a
          DLC and can never install one.
        </p>
      </Section>

      <Section title="Crew that come with a ship">
        <p>
          Kerbals transferred into someone else&rsquo;s save are tagged with the
          owner&rsquo;s name while they are there. The tag is reversible and is
          stripped when they go home, which makes an untagged roster name the
          test for whether a kerbal is yours.
        </p>
        <p>
          A modded profession that this install cannot define is not invented.
          The kerbal is given a valid local profession instead, the swap is
          reported once, and the original profession is kept twice over: in the
          craft&rsquo;s own crew data so a re-import elsewhere resolves it, and
          in a local repair record so installing the mod later hands those roster
          entries their job back.
        </p>
        <Callout variant="info" title="The roster repair tool">
          <p>
            If you uninstall a mod that defined a profession one of your kerbals
            has, the astronaut complex breaks: an unresolvable profession throws
            partway through drawing any crew list, naming neither the kerbal nor
            the trait. The Tools panel offers a repair, which copies the original
            profession into a record file before overwriting it and hands it back
            by itself once the defining mod is reinstalled. It is a loan, not a
            deletion.
          </p>
        </Callout>
      </Section>

      <Section title="The switches">
        <p>
          Part substitution, texture transfer and fuel config transfer each have
          their own setting, all on by default. Switched off, each one still
          scans and reports; it simply stops changing anything. See{" "}
          <Link
            href="/docs/how-does-it-work/ksp-mod/settings"
            className="text-primary hover:underline"
          >
            Mod Settings File
          </Link>
          .
        </p>
      </Section>

      <DocPager
        prev={{ title: "The Sidebar", href: "/docs/how-to-use-it/features" }}
        next={{ title: "Life Support", href: "/docs/how-to-use-it/life-support" }}
      />
    </article>
  );
}
