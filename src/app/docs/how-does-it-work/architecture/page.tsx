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
  title: "Architecture",
  description:
    "How the Discord bot, the FastAPI server, Firestore, the website and the KSP add-on fit together.",
};

export default function ArchitecturePage() {
  return (
    <article>
      <DocHeader
        eyebrow="Under the Hood"
        title="Architecture"
        description="One bot process runs everything on the community side and serves a private REST API. The KSP add-on and this website are both clients of that API, and neither shares any code with the bot."
      />

      <Section title="One process, two servers">
        <p>
          The entry point starts the Discord bot and a uvicorn-hosted FastAPI
          server as concurrent asyncio tasks in the same process. The bot handles
          Discord interactions, the API handles requests from the game and from
          the website, and they share the same in-memory data layer rather than
          talking to each other over a socket.
        </p>
        <CodeBlock
          title="Shape of it"
          code={`bot.py
  |-- discord.py client        slash commands, buttons, embeds, DMs
  |-- uvicorn / FastAPI        /api/v1/...      the KSP add-on
  |                            /api/v1/web/...  this website
  \\-- data layer               Firestore, buffered in memory

Next.js site
  \\-- server-side proxies      never calls Firestore directly`}
        />
        <p>
          The website reaches the API through its own server-side routes rather
          than from the browser, so a session token is never handed to page
          JavaScript. The add-on&rsquo;s browser interface does the same thing
          for the same reason, one layer further down.
        </p>
      </Section>

      <Section title="Where the data lives">
        <p>
          Firestore, with a deliberate split between what belongs to a player and
          what belongs to a server.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "users/{user_id}",
              type: "top level, guild independent",
              description:
                "XP, balance, level, message count, unlocked levels, rescue count, language preference. The wallet is global: a player carries one balance between every server the bot is in.",
            },
            {
              name: "guilds/{guild_id}/...",
              type: "per server",
              description:
                "Server configuration, corporations, weekly missions and selections, tickets. Things that genuinely belong to one community rather than to a player.",
            },
            {
              name: "contracts/",
              type: "global",
              description:
                "One collection, because a contract can run between players in different servers. The originating server is stored on the document for channel routing, not used as a key.",
            },
            {
              name: "marketplace/",
              type: "global",
              description:
                "Listings, with votes and reports in their own collections beside it.",
            },
            {
              name: "mission_classifications/",
              type: "cache",
              description:
                "AI classification results, so a set of missions is classified at most once.",
            },
          ]}
        />
        <p>
          User records are mirrored in an in-memory dictionary. Writes are
          buffered there and flushed to Firestore on a five minute timer rather
          than on every change, because XP from chat would otherwise be one
          Firestore write per message.
        </p>
      </Section>

      <Section title="Synchronous storage, asynchronous handlers">
        <p>
          The firebase-admin SDK is synchronous while Discord and API handlers
          are async. Writes are wrapped so they can be awaited; simple reads stay
          synchronous.
        </p>
        <CodeBlock
          code={`user = store.get_user(guild_id, user_id)          # synchronous read
await store.add_balance(guild_id, user_id, 250)   # awaited write`}
        />
        <Callout variant="info" title="The guild_id that is not a key">
          <p>
            <code className="font-mono text-xs">store.get_user</code> still takes
            a guild id, because hundreds of call sites pass one, but it is
            ignored when locating the record. The wallet moved to the top level
            and the signature stayed put.
          </p>
        </Callout>
      </Section>

      <Section title="Spending controls">
        <p>
          Gemini and Firebase both cost money, and a runaway loop is a bill
          rather than an outage. The cost guard tracks the month&rsquo;s spend
          from three sources and applies a ladder rather than a wall.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "In-process counters",
              type: "instant, approximate",
              description:
                "Every Firestore and Storage operation is counted as it happens. Instant is the only property a brake needs, and it cannot be exactly right: a file fetched from a signed URL never passes through the process.",
            },
            {
              name: "Cloud Monitoring",
              type: "accurate, minutes behind",
              description:
                "Sees the egress the counters miss, plus anything that was not the bot at all. Adopted as a baseline that the fast counters then add to, with the gap reported rather than hidden.",
            },
            {
              name: "Billing export",
              type: "exact, hours behind",
              description:
                "Actual billed dollars, net of free-tier credits. Display only, never a trigger, because a brake fed by a source that lands a few times a day would let a runaway spend for a whole cycle first.",
            },
          ]}
        />
        <p>
          The ladder runs normal, warn, degraded and frozen. Degraded refuses new
          uploads while reads, downloads and everything else keep working, so the
          bot stays usable. Freezing arms exactly one final flush, because
          flushing the memory buffer is itself a write and a stop that refuses it
          would convert &ldquo;we stopped spending&rdquo; into &ldquo;we lost
          everyone&rsquo;s last few minutes of XP&rdquo;.
        </p>
        <p>
          When the AI budget is spent, every AI call site behaves exactly as if
          no API key were configured. See{" "}
          <Link
            href="/docs/how-does-it-work/ai"
            className="text-primary hover:underline"
          >
            AI Integration
          </Link>
          .
        </p>
      </Section>

      <Section title="Cogs">
        <p>
          Every bot feature is a discord.py cog. Shared state goes through the
          store, the settings module and the localisation module rather than
          between cogs, though a few cogs do import each other where one
          genuinely owns a helper another needs. New work should prefer the
          shared modules.
        </p>
      </Section>

      <Section title="The mimic system">
        <p>
          An administrator can act as another user for testing. Rather than
          threading a fake identity through every handler, the bot patches three
          internal discord.py dispatch points so the swapped identity is applied
          before any handler runs.
        </p>
        <p>
          Code that needs the genuine caller, such as a permission check, reads
          it back explicitly. Anything that does not is by definition happy to
          see the mimicked user, which is the whole point.
        </p>
      </Section>

      <DocPager
        prev={{
          title: "Browser Interface",
          href: "/docs/how-does-it-work/ksp-mod/browser-ui",
        }}
        next={{ title: "AI Integration", href: "/docs/how-does-it-work/ai" }}
      />
    </article>
  );
}
