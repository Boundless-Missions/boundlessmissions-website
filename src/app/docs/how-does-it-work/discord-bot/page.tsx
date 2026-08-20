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
  title: "Bot Setup & Config",
  description:
    "Install, configure and run the Python bot and its embedded API server, and know which settings matter before you expose it.",
};

export default function DiscordBotPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Under the Hood"
        title="Bot Setup & Config"
        description="A Python discord.py bot with a FastAPI server in the same process. This page is for running your own instance."
      />

      <Section title="Install and run">
        <CodeBlock
          title="Terminal"
          code={`cd "GK Discord Bot"
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then fill it in

# Normal start:
python bot.py

# After adding or changing slash commands:
python bot.py --sync`}
        />
        <Callout variant="warning" title="Only sync when commands change">
          <p>
            Pass <code className="font-mono text-xs">--sync</code> only when the
            slash command set has actually changed. Repeated syncing hits
            Discord&rsquo;s rate limit and will leave you unable to sync when you
            genuinely need to.
          </p>
        </Callout>
      </Section>

      <Section title="Where configuration lives">
        <DefinitionTable
          rows={[
            {
              name: ".env",
              type: "secrets, never committed",
              description:
                "Discord token, Firebase credentials, the Gemini key, and the API signing secret. Read once at import time into a singleton every module shares.",
            },
            {
              name: "settings.py",
              type: "gameplay balance",
              description:
                "XP rates, cooldowns, prices, reward curves, channel and role IDs. Holds no secrets, so it is safe to commit and review like any other gameplay change. Cogs read these constants rather than hard-coding their own, so one edit rebalances the whole economy consistently.",
            },
            {
              name: "i18n.py",
              type: "strings",
              description:
                "Two-tier localisation: one lookup for public messages keyed by server, another for private replies keyed by the individual. Currently English only, but the lookup is what makes adding a language a data change rather than a code change, so new strings should still go through it.",
            },
          ]}
        />
      </Section>

      <Section title="The settings that actually matter before you expose it">
        <DefinitionTable
          rows={[
            {
              name: "API_SECRET_KEY",
              type: "required",
              description:
                "Signs every session token. A known or placeholder value lets anyone forge a login for any user, so the bot refuses to start with one. Generate a long random value and treat it like a database password.",
            },
            {
              name: "KSP_2FA_ENABLED",
              type: "default true",
              description:
                "The Discord approval step during linking. Off is for testing; leaving it off in production means a leaked 6-digit code is a full account takeover.",
            },
            {
              name: "KSP_DEVICE_BINDING_ENABLED",
              type: "default true",
              description:
                "Binds each install's random device id to the account and blocks any other. Note that the moderation report it enables collects information that your privacy policy has to disclose.",
            },
            {
              name: "KSP_VERSION_CHECK_ENABLED",
              type: "default true",
              description:
                "Blocks outdated game clients until they update, based on a published version and hash. With nothing published yet it blocks nobody regardless.",
            },
            {
              name: "API_DOCS_ENABLED",
              type: "default false",
              description:
                "Interactive API docs. Off by default so the endpoint list is not public. Local development only.",
            },
            {
              name: "DEBUG_ENDPOINTS_ENABLED",
              type: "default false",
              description:
                "Debug and test-only routes, which return 404 when off. Development servers only, never production.",
            },
            {
              name: "COMMAND_GROUP",
              type: "default empty",
              description:
                "Nests every slash command under one group. Empty means bare top-level commands. See the commands page.",
            },
          ]}
        />
      </Section>

      <Section title="Exposing it safely">
        <p>
          The recommended shape is a TLS-terminating reverse proxy in front of
          the API, with the API itself bound to localhost so only the proxy can
          reach it, and the proxy&rsquo;s address listed as a trusted proxy so
          the real client address is read from the forwarded header for rate
          limiting.
        </p>
        <p>
          Serving HTTPS directly is also supported by pointing at a certificate
          and key. Leaving both blank serves plain HTTP, which is correct for
          localhost and correct behind a proxy that terminates TLS, and wrong
          everywhere else.
        </p>
        <p>
          Browser CORS should stay empty. The game client is not a browser and
          needs none of it.
        </p>
      </Section>

      <Section title="Cost controls">
        <p>
          Gemini and Firebase both bill by usage, and the bot ships with a
          monthly budget for each plus a brake that trips before the bill does.
          The defaults are conservative and every value is adjustable at runtime,
          which matters because the failure worth planning for is a{" "}
          <em>false</em> stop from a wrong price constant. See{" "}
          <Link
            href="/docs/how-does-it-work/architecture"
            className="text-primary hover:underline"
          >
            Architecture
          </Link>
          .
        </p>
      </Section>

      <Section title="Structure">
        <p>
          Every feature is a discord.py cog under{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            cogs/
          </code>
          , loaded at startup. Shared state goes through the store, the settings
          module and the localisation module. A few cogs do import each other
          directly where one genuinely owns a helper another needs, but prefer
          the shared modules for new work.
        </p>
        <p>
          The API surface lives in a single module alongside them, and the
          Firestore layer under{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            data/
          </code>
          .
        </p>
      </Section>

      <DocPager
        prev={{ title: "Privacy & Your Data", href: "/docs/how-does-it-work/privacy" }}
        next={{ title: "Mod Build & Setup", href: "/docs/how-does-it-work/ksp-mod" }}
      />
    </article>
  );
}
