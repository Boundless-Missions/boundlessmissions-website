import type { Metadata } from "next";

import { DocHeader, Section, Callout } from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Bot Commands",
  description:
    "Every slash command the bot registers, how they are grouped, and where they can be run.",
};

const groups = [
  {
    name: "Everyday",
    prefix: "/",
    badge: "default" as const,
    note: "Available to everyone.",
    commands: [
      { cmd: "help", desc: "List all available commands." },
      { cmd: "ping", desc: "Check the bot's latency." },
      { cmd: "linkcode", desc: "Generate a 6-digit code to link your KSP game." },
      { cmd: "balance", desc: "Check your or another user's KCoin balance." },
      { cmd: "pay", desc: "Transfer KCoins to another user." },
      { cmd: "richest", desc: "View the wealthiest members." },
      { cmd: "rank", desc: "View your XP rank and level." },
      { cmd: "leaderboard", desc: "View the server XP leaderboard." },
      { cmd: "roles", desc: "Open the KSP title selector to manage your equipped roles." },
      { cmd: "rescues", desc: "Show how many rescue missions a user has completed." },
      { cmd: "rescueboard", desc: "View the rescue-mission leaderboard." },
      { cmd: "analyze", desc: "Analyze a KSP screenshot, attached or auto-detected above." },
      { cmd: "corpsetup", desc: "Establish a new corporation with its own text channel." },
      { cmd: "privacy", desc: "How Boundless Missions uses your data, and how to delete it." },
      { cmd: "deletemydata", desc: "Permanently delete all your Boundless Missions data." },
    ],
  },
  {
    name: "Info",
    prefix: "/info",
    badge: "muted" as const,
    note: "Nested one level deeper when a command group is configured.",
    commands: [
      { cmd: "serverinfo", desc: "Display information about this server." },
      { cmd: "userinfo", desc: "Display information about a user." },
      { cmd: "botinfo", desc: "Display information about this bot." },
    ],
  },
  {
    name: "Moderation",
    prefix: "/mod",
    badge: "secondary" as const,
    note: "Requires the kick members permission. Can be switched off entirely for a server.",
    commands: [
      { cmd: "warn", desc: "Warn a member." },
      { cmd: "warnings", desc: "List all warnings for a member." },
      { cmd: "mute", desc: "Timeout a member." },
      { cmd: "unmute", desc: "Remove a timeout from a member." },
      { cmd: "kick", desc: "Kick a member from the server." },
      { cmd: "ban", desc: "Ban a member from the server." },
      { cmd: "unban", desc: "Unban a user by ID." },
      { cmd: "purge", desc: "Bulk-delete messages from this channel." },
      { cmd: "givemoney", desc: "Give KCoins to a user." },
      { cmd: "fine", desc: "Deduct KCoins from a user." },
      { cmd: "setbalance", desc: "Set a user's KCoin balance." },
      { cmd: "contractreset", desc: "Cancel all active contracts for a user." },
      { cmd: "gkchannel", desc: "Toggle this channel as a Boundless Missions channel." },
      { cmd: "add_custom_mission", desc: "Add an additional custom weekly mission." },
      { cmd: "removeroles", desc: "Remove KSP level roles from a user." },
    ],
  },
  {
    name: "Admin",
    prefix: "/admin",
    badge: "outline" as const,
    note: "Requires the administrator permission. The last four are owner only.",
    commands: [
      { cmd: "setchannel", desc: "Configure which channels the bot uses in this server." },
      { cmd: "setrole", desc: "Map the bot's level, notification and mod roles in this server." },
      { cmd: "ticketpanel", desc: "Post the Open a Ticket panel in the ticket channel." },
      { cmd: "announce", desc: "Send an announcement embed to a channel." },
      { cmd: "setxp", desc: "Set a user's XP." },
      { cmd: "setprefix", desc: "Change the bot's prefix command character." },
      { cmd: "publishversion", desc: "Register a KSP add-on DLL version and hash for the update gate." },
      { cmd: "versioninfo", desc: "Show the currently published latest add-on version." },
      { cmd: "policyversion", desc: "Show or bump the privacy and terms version players must accept." },
      { cmd: "linkas", desc: "Generate a KSP link code that logs in as another user." },
      { cmd: "costs", desc: "Show this month's estimated Gemini and Firebase spend." },
      { cmd: "mimic", desc: "Act as another user for testing. Owner only." },
      { cmd: "unmimic", desc: "Stop mimicking another user. Owner only." },
      { cmd: "reload", desc: "Reload a cog without restarting. Owner only." },
      { cmd: "shutdown", desc: "Gracefully shut the bot down. Owner only." },
    ],
  },
];

export default function CommandsPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Playing"
        title="Bot Commands"
        description="The full set of slash commands the bot registers. Where they appear in the command list depends on one setting, so read the grouping section first if the names below do not match what you see."
      />

      <Section title="Grouping">
        <p>
          By default commands sit at the top level:{" "}
          <code className="font-mono text-xs">/help</code>,{" "}
          <code className="font-mono text-xs">/balance</code>, and so on. That is
          the right choice when the bot is the only one in the server.
        </p>
        <p>
          Setting a command group nests them all under it, so{" "}
          <code className="font-mono text-xs">COMMAND_GROUP=g</code> gives you{" "}
          <code className="font-mono text-xs">/g help</code> and{" "}
          <code className="font-mono text-xs">/g balance</code>. That is worth
          doing when several bots would otherwise fight over the same names.
        </p>
        <p>
          Moderation and administration commands are separated by intent
          regardless, under{" "}
          <code className="font-mono text-xs">/mod</code> and{" "}
          <code className="font-mono text-xs">/admin</code>, and stay at the top
          level even when a group is configured so that Discord applies their
          permission requirements properly.
        </p>
        <Callout variant="info" title="Channel gating">
          <p>
            When a command group is active, grouped commands only work in
            channels marked as Boundless Missions channels, or in direct
            messages. Moderators bypass this. It keeps a busy server&rsquo;s
            general chat free of bot output without needing a permission rule per
            channel.
          </p>
        </Callout>
      </Section>

      <Section title="The commands">
        <div className="space-y-5">
          {groups.map((group) => (
            <Card key={group.name}>
              <CardContent className="p-5">
                <div className="mb-1 flex items-center gap-3">
                  <Badge variant={group.badge}>{group.name}</Badge>
                  <code className="font-mono text-xs text-muted-foreground">
                    {group.prefix} &hellip;
                  </code>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  {group.note}
                </p>
                <ul className="divide-y divide-border">
                  {group.commands.map((c) => (
                    <li
                      key={c.cmd}
                      className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:gap-4"
                    >
                      <code className="shrink-0 font-mono text-sm text-primary sm:w-44">
                        {group.prefix === "/"
                          ? `/${c.cmd}`
                          : `${group.prefix} ${c.cmd}`}
                      </code>
                      <span className="text-sm text-muted-foreground">
                        {c.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="What moved out of Discord">
        <p>
          Contracts are written and submitted in the add-on, auctions are opened
          in the add-on or on this site, and crafts are bought here. Discord kept the
          parts it is good at: the offer, dispute and review buttons that arrive
          in your DMs, the weekly mission board, and the channels the contract,
          auction and marketplace posts appear in. What it gave up is everything
          that needs to see your game, because a contract is judged against the
          craft, its mod list and its telemetry, none of which survives a channel
          upload.
        </p>
        <p>
          One command still duplicates something the add-on does better, because it
          can read your install: <code className="font-mono text-xs">analyze</code>.
          A server can turn it off on Discord so it only works in game, in which
          case running it gives you a private note pointing you back to the add-on.
        </p>
      </Section>

      <DocPager
        prev={{ title: "Economy & Ranks", href: "/docs/how-to-use-it/economy" }}
        next={{ title: "The Sidebar", href: "/docs/how-to-use-it/features" }}
      />
    </article>
  );
}
