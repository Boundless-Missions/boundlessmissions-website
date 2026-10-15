import type { Metadata } from "next";

import {
  DocHeader,
  Section,
  Steps,
  Step,
  Callout,
  DefinitionTable,
  Screenshot,
} from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Linking Your Game",
  description:
    "Connect a Kerbal Space Program install to your Boundless Missions account with a one time 6-digit code, an approval you give yourself, and a bound device.",
};

export default function LinkingPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Start Here"
        title="Linking Your Game"
        description="You connect KSP to your account once. It takes a code, one approval, and about twenty seconds. No password is involved, and none is ever asked for."
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

      <Section title="Two places to get a code">
        <p>
          The code can come from this website or from Discord, and the two are
          the same flow with the approval in a different place. Pick whichever
          you already have open.
        </p>
        <p>
          <strong className="text-foreground">From the website.</strong> Sign in
          at <code className="font-mono text-xs">/account</code> with Google or
          an email address. You do not need Discord for this, and an account made
          this way is a full one: a wallet, contracts, listings and a username of
          its own.
        </p>
        <Screenshot
          src="/docs/linking/website-sign-in.png"
          width={1251}
          height={509}
          alt="The signed-out My Account page, with a Sign in card offering Google or email and a card for linking a Discord account"
          caption="Signed out, the account page offers both doors: sign in with Google or email on the left, or come in as your Discord account with a code from /b linkcode on the right."
        />
        <p>
          <strong className="text-foreground">From Discord.</strong> Run{" "}
          <code className="font-mono text-xs">/b linkcode</code> in any server
          the bot is in. It answers privately with the same kind of 6-digit code.
        </p>
        <Screenshot
          src="/docs/linking/discord-linkcode-command.png"
          width={334}
          height={177}
          alt="Discord's command picker showing /b linkcode, described as generating a 6-digit code to link your KSP game"
          maxWidth="360px"
          caption={
            <>
              The command is grouped under <code className="font-mono text-xs">/b</code>{" "}
              on the official server. On a server that has set no command group it
              sits at the top level as <code className="font-mono text-xs">/linkcode</code>.
            </>
          }
        />
      </Section>

      <Section title="The flow">
        <Steps>
          <Step n={1} title="Ask for a code">
            <p>
              Press <strong className="text-foreground">Get a link code</strong>{" "}
              on the account page, or run the Discord command. Either way you get
              a 6-digit code stored server side with a three minute lifetime.
              Asking for a new one invalidates any code you already had.
            </p>
            <Screenshot
              src="/docs/linking/website-link-code.png"
              width={585}
              height={250}
              alt="The Link your KSP install card showing a six digit code, a countdown and the text waiting for KSP"
              caption="The card holds the code and counts down. It is also polling: the moment a KSP client uses the code, this card turns into the approval below."
            />
          </Step>

          <Step n={2} title="Type it into the add-on">
            <p>
              Open the link window in game and enter the code. A valid code does
              not immediately produce a token: it creates a pending approval
              instead.
            </p>
            <Screenshot
              src="/docs/linking/mod-link-window.png"
              width={411}
              height={422}
              alt="The in-game Link KSP window with the six digit code entered and a Link Account button"
              maxWidth="420px"
              caption="The window carries the same two routes in its own instructions, and a Settings fold for choosing which server to link to."
            />
          </Step>

          <Step n={3} title="Approve it">
            <p>
              The approval goes back to wherever the code came from. A code taken
              from this website is approved{" "}
              <strong className="text-foreground">on this website</strong>: the
              card turns into a prompt naming the IP and device asking to sign
              in, with Yes and Refuse.
            </p>
            <Screenshot
              src="/docs/linking/website-approve-login.png"
              width={594}
              height={323}
              alt="The account page prompt saying a KSP client just entered your code and wants to sign in as you, showing the client IP and device id, with Yes that's me and Refuse buttons"
              caption="The client's IP and the first characters of its device id are shown, because the point of the step is approving a named thing rather than approving in general."
            />
            <p>
              A code from <code className="font-mono text-xs">/b linkcode</code>{" "}
              is approved in Discord instead: the bot sends you a direct message
              with a <strong className="text-foreground">Log in</strong> button
              and a <strong className="text-foreground">Not me</strong> button.
              The game polls until you answer one of them.
            </p>
            <p>
              Nothing secret travels through either channel. The button only
              flips the state of a challenge the game is already holding an id
              for, and a challenge can only be answered by the account it was
              raised against.
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
            <Screenshot
              src="/docs/linking/account-linked.png"
              width={1196}
              height={845}
              alt="The signed-in account page showing the profile, a linked Discord account, the Link your KSP install card and two-factor authentication"
              caption="Linked. The account page is where the rest of it lives afterwards: your username and display name, the Discord link, two-factor, and a fresh code whenever you install KSP somewhere else."
            />
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
              name: "The approval",
              type: "one tap, 3 minutes",
              description:
                "Proves a person holding the account agreed to this specific login. The code is typed into KSP, so the confirmation deliberately lands somewhere else, a code read out on stream or over chat gets nobody anywhere, because they cannot press the button.",
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
     approved on the website, or in a Discord DM
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
        <Screenshot
          src="/docs/linking/mod-server-switch.png"
          width={547}
          height={496}
          alt="The add-on's Settings panel showing a choice between the official server and a custom one, with the current address and the account it is linked as"
          maxWidth="560px"
          caption="The Settings panel in the sidebar. The line underneath names the server in use and the account this install is linked as there, which is the quickest check that you are talking to the one you meant."
        />
      </Section>

      <DocPager
        prev={{ title: "What It Does", href: "/docs/what-does-it-do" }}
        next={{ title: "Contracts", href: "/docs/how-to-use-it/contracts" }}
      />
    </article>
  );
}
