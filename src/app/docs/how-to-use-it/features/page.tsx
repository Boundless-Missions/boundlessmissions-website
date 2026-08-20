import type { Metadata } from "next";
import Link from "next/link";

import { DocHeader, Section, Callout, DefinitionTable } from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { Card, CardContent } from "@/components/ui/card";
import {
  ListChecks,
  Inbox,
  User,
  Bell,
  Store,
  Wrench,
  Settings,
  Send,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Sidebar",
  description:
    "What the add-on draws over Kerbal Space Program: the sidebar panels, the submission window, and the screens that stay separate from both.",
};

const panels = [
  {
    icon: ListChecks,
    title: "Missions",
    body: "The week's community missions, with what each one pays and whether you have already claimed it.",
  },
  {
    icon: Inbox,
    title: "Contracts",
    body: "The inbox. Offers waiting on an answer, your active work, week groups, a local bin and multi-select. In the editor on an active contract it also shows the contract's part limits and the switch that arms the editor restriction. Rescue wrecks are spawned from here.",
  },
  {
    icon: User,
    title: "Profile",
    body: "Your balance, XP, level and rank, without leaving the game to check.",
  },
  {
    icon: Bell,
    title: "Feed",
    body: "Notifications from the server merged with local ones the add-on raises itself. Mark read and dismiss from either here or Discord; the unread count follows.",
  },
  {
    icon: Store,
    title: "Market",
    body: "The selling half of the marketplace. List the craft on the stage, set a price, and open the website to browse.",
  },
  {
    icon: Wrench,
    title: "Tools",
    body: "Quicksend a craft to another player, export a craft to a file with everything packed in, import a flag, file a bug report with your KSP.log attached, and repair a roster with broken crew professions.",
  },
  {
    icon: Settings,
    title: "Settings",
    body: "Server address, notifications, data sharing, the craft transfer switches, and whether the interface opens in your browser instead.",
  },
];

export default function FeaturesPage() {
  return (
    <article>
      <DocHeader
        eyebrow="In the Game"
        title="The Sidebar"
        description="Everything the add-on does in game is reached from one panel that expands out of the middle of the screen. The toolbar button is the only way in, and it is the only thing the add-on adds to the game's own UI."
      />

      <Section title="The panels">
        <div className="space-y-4">
          {panels.map((panel) => (
            <Card key={panel.title}>
              <CardContent className="flex gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary">
                  <panel.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {panel.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {panel.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Submitting is a window, not a tab">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-accent/40 text-primary">
            <Send className="h-5 w-5" />
          </span>
          <div className="space-y-3">
            <p>
              Submission opens in a draggable window rather than as a sidebar
              panel, because it is read against the scene behind it: the craft on
              the build stage, or the navball in flight. A centred panel that
              owns the middle of the screen is the wrong shape for that.
            </p>
            <p>
              Drag it by its header, put it where it does not cover what you are
              looking at, and it stays inside the screen no matter what
              resolution you remembered a position from. Physics Range Extender
              is paused while it is up.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Blueprints">
        <p>
          When a craft is submitted, listed or sent, the add-on renders it rather
          than asking you for a screenshot. An off-screen camera shoots eight
          views, six orthographic and two perspective, against a black and then a
          white background so exact per-pixel transparency can be recovered from
          the pair, and composites them onto a blueprint sheet.
        </p>
        <p>
          A capture that comes back with no vessel pixels in it falls back to a
          plain screenshot rather than submitting a blank image. ConformalDecals
          decals are re-issued onto the capture layer so they appear, since a
          decal has no renderer of its own and would otherwise be culled out.
          Where Deferred is installed the capture runs on the deferred path
          instead, with supersampling standing in for the MSAA that path ignores.
        </p>
      </Section>

      <Section title="Editor restrictions">
        <p>
          A contract can limit which parts the contractor may build with. When
          one is active and you switch the restriction on from the inbox, the VAB
          and SPH part list is limited to what the contract permits. It is opt in
          per contract rather than forced, so the editor stays usable for
          unrelated work.
        </p>
      </Section>

      <Section title="What is deliberately not on the sidebar">
        <p>
          A handful of screens are drawn separately, because each of them exists
          for a moment when the sidebar itself may not be available or may not be
          trustworthy.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "Consent",
              type: "first run",
              description:
                "The privacy and terms gate. Everything else waits on it, so it cannot depend on anything.",
            },
            {
              name: "The update gate",
              type: "version mismatch",
              description:
                "Shown when your add-on is older than the published version. It offers a re-check and a download link, and narrows the rest of the interface to the panels that work without a server.",
            },
            {
              name: "The suspension notice",
              type: "account suspended",
              description:
                "Reason, a live countdown and a check again button, plus the reassurance that nothing was deleted.",
            },
            {
              name: "Device verification",
              type: "security",
              description:
                "A prompt about this specific machine. Answering it inside a screen the prompt is about would defeat it.",
            },
            {
              name: "The link screen",
              type: "before linking",
              description:
                "The toolbar opens the sidebar only once you are linked.",
            },
            {
              name: "The data paused notice",
              type: "sharing switched off",
              description:
                "Shown while you have turned data sharing off and the add-on is running inert.",
            },
          ]}
        />
        <Callout variant="info" title="It hides when the game hides its UI">
          <p>
            The sidebar respects F2 and every screenshot capture, so it does not
            end up in your screenshots. That is also why the submission window no
            longer needs to be closed before taking a shot for a submission.
          </p>
        </Callout>
      </Section>

      <Section title="If you would rather use a browser">
        <p>
          There is an optional browser interface that serves most of the same
          screens on a second monitor. It is off by default and the sidebar is
          not going anywhere. See{" "}
          <Link
            href="/docs/how-does-it-work/ksp-mod/browser-ui"
            className="text-primary hover:underline"
          >
            Browser Interface
          </Link>
          .
        </p>
      </Section>

      <DocPager
        prev={{ title: "Bot Commands", href: "/docs/how-to-use-it/commands" }}
        next={{ title: "Sharing Craft", href: "/docs/how-to-use-it/craft-sharing" }}
      />
    </article>
  );
}
