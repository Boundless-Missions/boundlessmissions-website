import type { Metadata } from "next";
import Link from "next/link";

import {
  DocHeader,
  Section,
  Callout,
  Steps,
  Step,
  DefinitionTable,
} from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";

export const metadata: Metadata = {
  title: "Browser Interface",
  description:
    "The optional browser interface: how to turn it on, how it stays local to your machine, and what to do when it does not open.",
};

export default function BrowserUiPage() {
  return (
    <article>
      <DocHeader
        eyebrow="In the Game"
        title="Browser Interface"
        description="An optional second-screen interface that opens in your own browser instead of the sidebar drawn over the game. Off by default. The sidebar is not deprecated and is not going away."
      />

      <Section title="Turning it on">
        <Steps>
          <Step n={1} title="Open the sidebar from the KSP toolbar">
            Go to the Settings panel.
          </Step>
          <Step n={2} title="Switch on the browser interface">
            The setting is saved immediately and persists across restarts.
          </Step>
          <Step n={3} title="Click the toolbar button again">
            Your default browser opens on the interface. A small in-game panel
            also appears showing the address, with buttons to reopen it, copy the
            URL, or switch back to the sidebar.
          </Step>
        </Steps>
        <Callout variant="info" title="Which one should you use?">
          <p>
            On a single monitor the sidebar is genuinely better: alt-tabbing out
            of KSP to read a contract is worse than a panel drawn over the game.
            The browser interface is built for people with a second screen, and
            that is the only case where it wins.
          </p>
        </Callout>
      </Section>

      <Section title="How it works">
        <p>
          The add-on runs a small HTTP server inside the KSP process, bound to{" "}
          <code className="font-mono text-xs">127.0.0.1</code> on a port chosen
          at random each session, serving a static page from the add-on&rsquo;s
          own folder. The page talks to that server, which relays requests
          upstream on its behalf.
        </p>
        <p>
          That relay is the point of the design. The add-on attaches your session
          token in C# before forwarding, so the token never exists in the browser
          page at all. There is nothing in the page worth stealing.
        </p>
        <DefinitionTable
          rows={[
            {
              name: "Bound to loopback only",
              type: "127.0.0.1",
              description:
                "Always. There is no setting that would expose it to your network or the internet.",
            },
            {
              name: "Random port per session",
              type: "defence in depth only",
              description:
                "A new ephemeral port each time KSP starts. Treated as obscurity rather than security, because a local process can scan every port in under a second.",
            },
            {
              name: "One-time launch link",
              type: "15 second lifetime",
              description:
                "The URL handed to your browser carries a nonce that is single use and expires in fifteen seconds. A bookmarked or shared URL does not work, which is deliberate.",
            },
            {
              name: "Session cookie",
              type: "HttpOnly, SameSite=Strict",
              description:
                "A random value proving the page is the one KSP just opened, paired with a CSRF token in a custom header. Never sent to any website, and gone when the browser closes.",
            },
            {
              name: "Host and origin checks",
              type: "DNS rebinding defence",
              description:
                "Exact host match, plus origin and fetch-site checks, so a page on another site cannot reach the bridge even from your own machine.",
            },
          ]}
        />
        <Callout variant="warning" title="One residual risk, documented rather than hidden">
          <p>
            Opening a URL hands it to your operating system, which on Linux means
            it is briefly visible in the process list, nonce included. The
            fifteen second lifetime, the single use and the browser consuming it
            in a fraction of a second make that window narrow, and a hostile
            local user with access to your account could already read the session
            token off disk.
          </p>
        </Callout>
      </Section>

      <Section title="What stays in the game">
        <p>
          Most of the interface is there: your profile, notifications, weekly
          missions, the contract inbox with its actions, contract and auction
          creation, rescue contracts, craft installs, quicksend, flag import and
          settings.
        </p>
        <p>
          Some things stay in the game permanently, because a browser tab is the
          wrong place for them:
        </p>
        <DefinitionTable
          rows={[
            {
              name: "Submitting a contract",
              type: "in game",
              description:
                "It waits for physics to settle, measures live distance between vessels and captures the scene with the game's UI hidden, all of which need KSP focused. The browser's submit button raises the real window in game instead.",
            },
            {
              name: "Notification popups",
              type: "in game",
              description:
                "They have to appear over the game while you are flying, not on another monitor.",
            },
            {
              name: "Milestone photo prompts",
              type: "in game",
              description: "A short, one-tap capture that fires mid-flight.",
            },
            {
              name: "Linking and consent",
              type: "in game",
              description:
                "Linking needs a code typed in KSP and an approval in Discord. Consent is the gate everything else waits on, and the recovery path if the browser never opens.",
            },
            {
              name: "Device verification",
              type: "in game",
              description:
                "A security prompt about this machine. Answering it in a background tab would defeat its purpose.",
            },
            {
              name: "Filing a bug report",
              type: "in game",
              description:
                "The attachment that makes a KSP bug diagnosable is your KSP.log, which can only be read from inside the running game.",
            },
          ]}
        />
      </Section>

      <Section title="When the browser does not open">
        <p>
          Handing a URL to your operating system can fail quietly. That is why
          the in-game panel always appears too: it shows the address and has a
          copy button, so you can always paste it into a browser yourself.
        </p>
        <Callout variant="warning" title="Known causes">
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              <strong>Steam overlay.</strong> It may capture the link and open it
              in Steam&rsquo;s own built-in browser, which is too old to run the
              interface. Copy the URL into a real browser instead.
            </li>
            <li>
              <strong>Flatpak, Snap or Proton on Linux.</strong>{" "}
              <code className="font-mono text-xs">xdg-open</code> may not be
              reachable from inside the sandbox. Copy the URL.
            </li>
            <li>
              <strong>Exclusive fullscreen.</strong> Alt-tabbing out of exclusive
              fullscreen has a long history of black screens in KSP, especially
              on Linux and older NVIDIA drivers. Switch KSP to borderless
              windowed if you plan to use a second screen.
            </li>
          </ul>
        </Callout>
        <p>
          If the interface loads but says the session expired, open it again from
          the toolbar. The launch link is single use and short lived, so an old
          one will never work.
        </p>
      </Section>

      <Section title="Antivirus and firewall prompts">
        <p>
          A game that opens a listening socket and launches a browser is a mild
          heuristic trigger for some endpoint security products, and Windows may
          show a firewall prompt. The socket is loopback only, so you can decline
          any request to allow it through the firewall and the interface will
          still work. Nothing here needs to cross your network.
        </p>
      </Section>

      <Section title="Two KSP installs at once">
        <p>
          Each running copy of KSP binds its own port, so two installs give you
          two independent interfaces at two addresses. They do not share a
          session and cannot interfere with each other.
        </p>
        <p>
          For what the sidebar itself does, see{" "}
          <Link
            href="/docs/how-to-use-it/features"
            className="text-primary hover:underline"
          >
            The Sidebar
          </Link>
          .
        </p>
      </Section>

      <DocPager
        prev={{
          title: "Mod Settings File",
          href: "/docs/how-does-it-work/ksp-mod/settings",
        }}
        next={{ title: "Architecture", href: "/docs/how-does-it-work/architecture" }}
      />
    </article>
  );
}
