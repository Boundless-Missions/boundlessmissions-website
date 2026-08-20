import type { Metadata } from "next";

import {
  DocHeader,
  Section,
  Steps,
  Step,
  Callout,
  DefinitionTable,
} from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Linking Your Game",
  description:
    "Connect a Kerbal Space Program install to your Discord account with a one time 6-digit code, an approval tap and a bound device.",
};

export default function LinkingPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Start Here"
        title="Linking Your Game"
        description="You connect KSP to your Discord account once. It takes a code, a tap on a Discord button, and about twenty seconds. No password is involved, and none is ever asked for."
      />

      <Section title="Before anything is sent">
        <p>
          The very first time the add-on loads it shows a consent screen covering
          the privacy policy and terms. Until you accept it, the add-on transmits
          nothing at all, not even a version check. That is a hard gate in the
          code rather than a preference.
        </p>
        <p>
          Your acceptance is written to{" "}
          <code className="font-mono text-xs">PluginData/consent.cfg</code>,
          separately from the settings file, and the file is re-read when it
          changes on disk so an edit takes effect without a restart. If the
          policy is updated later, the server says so and the add-on asks again
          before sending anything further.
        </p>
      </Section>

      <Section title="The flow">
        <Steps>
          <Step n={1} title="Ask the bot for a code">
            <p>
              Run the link code command in Discord. You get a 6-digit code stored
              server side with a three minute lifetime. Asking for a new one
              invalidates any code you already had.
            </p>
          </Step>
          <Step n={2} title="Type it into the add-on">
            <p>
              The link screen in game takes the code and posts it to the API. A
              valid code does not immediately produce a token: it creates a
              pending approval instead.
            </p>
          </Step>
          <Step n={3} title="Approve the login in Discord">
            <p>
              The bot sends you a direct message with a Log in button and a Not
              me button. The game polls until you answer one of them. Nothing
              secret travels through Discord here; the button only flips the
              state of a challenge the game is already holding an id for.
            </p>
          </Step>
          <Step n={4} title="A session token comes back">
            <p>
              On approval the server issues a session token signed with
              HMAC-SHA256, valid for thirty days, and the add-on writes it to{" "}
              <code className="font-mono text-xs">PluginData/session.token</code>
              . The 6-digit code is deleted at that point and cannot be reused.
            </p>
          </Step>
          <Step n={5} title="The install is bound to your account">
            <p>
              Each KSP install writes a random id once and sends it with every
              request. The install that completed this flow is trusted
              automatically. If a different one ever appears on your account, it
              is blocked outright until you approve it from a Discord message, or
              report it.
            </p>
          </Step>
        </Steps>
      </Section>

      <Section title="Why it is built this way">
        <p>
          Three separate things have to be true before a request is accepted, and
          each one closes a hole the others leave open.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "The signed token",
              type: "HMAC-SHA256, 30 days",
              description:
                "Proves the request came from something the server issued a token to. The signing secret never leaves the server, so a client can present a token but cannot mint one.",
            },
            {
              name: "The Discord approval",
              type: "one tap, 3 minutes",
              description:
                "Proves a person with access to your Discord account agreed to this specific login. A code shoulder-surfed off a stream is worth nothing without it.",
            },
            {
              name: "The device id",
              type: "random per install",
              description:
                "Proves the request came from the install that was approved. A copied session token from a different machine is hard-blocked rather than silently accepted.",
            },
          ]}
        />
        <Callout variant="info" title="The device id is not your hardware">
          <p>
            It is a random identifier generated once and stored beside the
            add-on. It is not a MAC address and carries no personal data, so it
            survives a network card change and tells the server nothing about
            your machine.
          </p>
        </Callout>
      </Section>

      <Section title="What the game client actually holds">
        <p>
          Briefly a 6-digit code, and then a signed token. That is the whole
          list. It never receives an API key, the bot&rsquo;s Discord token or
          any database credential, because it has no use for one: every request
          it makes is authorised by the token alone and every read is scoped to
          your own account on the server.
        </p>
        <CodeBlock
          code={`6-digit code    stored server side, 3 minute lifetime, single use
     approved in Discord
session token   HMAC-SHA256 signed, 30 day lifetime
     stored at
PluginData/session.token        local to this install
PluginData/device.id            random id, bound to your account`}
        />
      </Section>

      <Section title="Unlinking, and starting over">
        <p>
          Deleting{" "}
          <code className="font-mono text-xs">PluginData/session.token</code>{" "}
          returns the add-on to its unlinked state, ready for a new code. That
          only affects this install.
        </p>
        <p>
          To cut off every install at once, including one you no longer have
          access to, use the log out everywhere action. It bumps a version number
          on the server that every existing token is checked against, so all of
          them stop working immediately. Your balance, XP, contracts and listings
          are untouched.
        </p>
        <Callout variant="warning" title="Switching between servers">
          <p>
            The add-on remembers a token per server address, so moving between
            the official server and one you run yourself does not mean linking
            again each time. Those are stored in{" "}
            <code className="font-mono text-xs">PluginData/sessions.cfg</code>,
            which never ships with a release and so is never overwritten by an
            update.
          </p>
        </Callout>
      </Section>

      <DocPager
        prev={{ title: "What It Does", href: "/docs/what-does-it-do" }}
        next={{ title: "Contracts", href: "/docs/how-to-use-it/contracts" }}
      />
    </article>
  );
}
