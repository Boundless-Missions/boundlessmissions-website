import type { Metadata } from "next";
import Link from "next/link";

import {
  DocHeader,
  Section,
  Callout,
  EndpointTable,
  DefinitionTable,
} from "@/components/docs-ui";
import { DocPager } from "@/components/doc-pager";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "REST API",
  description:
    "The signed REST API the KSP add-on and this website both talk to: its auth model, its three surfaces, and a representative endpoint list.",
};

export default function ApiPage() {
  return (
    <article>
      <DocHeader
        eyebrow="Under the Hood"
        title="REST API"
        description="A FastAPI application running in the bot's own process, serving versioned routes under /api/v1. Authentication is a signed session token, and no secret is ever sent to a client."
      />

      <Section title="Base URL">
        <p>
          The server listens on port{" "}
          <code className="font-mono text-xs">5022</code> by default. The add-on
          builds its base URL from its protocol, host and port settings, which
          are stored as three separate keys for reasons covered on the{" "}
          <Link
            href="/docs/how-does-it-work/ksp-mod/settings"
            className="text-primary hover:underline"
          >
            settings page
          </Link>
          .
        </p>
        <CodeBlock code={`{protocol}://{host}:{port}/api/v1`} />
      </Section>

      <Section title="Three surfaces, one auth model">
        <DefinitionTable
          rows={[
            {
              name: "/api/v1/...",
              type: "the game client",
              description:
                "Everything the KSP add-on needs: linking, profile, missions, contracts, submissions, craft transfer, notifications and marketplace listing.",
            },
            {
              name: "/api/v1/web/...",
              type: "this website",
              description:
                "The browsing and buying half of the marketplace, contract management, and the profile. Called from the site's own server-side routes, never from page JavaScript.",
            },
            {
              name: "/api/v1/web/admin/...",
              type: "the owner console",
              description:
                "Listing moderation, user accounts, announcements, publishing add-on versions and runtime controls. Restricted to a single owner account, and it answers 404 rather than 403 to everyone else, so the surface is invisible rather than merely locked.",
            },
          ]}
        />
      </Section>

      <Section title="Authentication">
        <p>
          Every route except the linking pair requires a session token in the
          standard authorization header. Requests from the game additionally
          carry the install&rsquo;s device id in its own header, which is checked
          against the account&rsquo;s trusted devices.
        </p>
        <CodeBlock
          title="An authenticated request"
          code={`GET /api/v1/user/profile
Authorization: Bearer <session-token>
X-Device-Id: <random-per-install>`}
        />
        <p>
          Tokens are HMAC-SHA256 signed and carry a version number that is
          checked against the account&rsquo;s current version on each request,
          which is how logging out everywhere invalidates them all at once
          without storing the tokens themselves.
        </p>
        <Callout variant="info" title="Suspension is a gate, not a revocation">
          <p>
            A suspended account gets a structured 403 that the client renders as
            a notice, rather than having its token revoked. A revoked token would
            drop the add-on to a link screen whose only offer, linking again,
            would work and explain nothing.
          </p>
        </Callout>
      </Section>

      <Section title="Representative endpoints">
        <p>
          The real surface is around a hundred routes. What follows is enough to
          show the conventions; the definitive contract is the server source.
        </p>
        <EndpointTable
          rows={[
            {
              method: "POST",
              path: "/api/v1/auth/link",
              description: "Exchange a 6-digit code for a pending approval.",
              auth: false,
            },
            {
              method: "POST",
              path: "/api/v1/auth/link/poll",
              description:
                "Poll that approval until it is answered; returns the signed token.",
              auth: false,
            },
            {
              method: "GET",
              path: "/api/v1/auth/verify",
              description: "Validate a token and return the profile behind it.",
              auth: true,
            },
            {
              method: "GET",
              path: "/api/v1/version/check",
              description:
                "Report the client's version and hash; also returns the required policy version.",
              auth: true,
            },
            {
              method: "GET",
              path: "/api/v1/user/profile",
              description: "Balance, XP, level and unlocked levels.",
              auth: true,
            },
            {
              method: "GET",
              path: "/api/v1/missions/weekly",
              description: "The current week's missions and their classifications.",
              auth: true,
            },
            {
              method: "GET",
              path: "/api/v1/contracts/active",
              description: "Contracts currently on the player's plate.",
              auth: true,
            },
            {
              method: "POST",
              path: "/api/v1/contracts/create",
              description: "Write a new contract from inside the game.",
              auth: true,
            },
            {
              method: "POST",
              path: "/api/v1/contracts/create_rescue",
              description:
                "Create a rescue, snapshotting and removing the issuer's vessel.",
              auth: true,
            },
            {
              method: "POST",
              path: "/api/v1/auctions/create",
              description: "Open a reverse auction, escrowing the starting price.",
              auth: true,
            },
            {
              method: "POST",
              path: "/api/v1/contracts/{id}/submit",
              description:
                "Submit work: telemetry, screenshots and the craft file where one is asked for.",
              auth: true,
            },
            {
              method: "POST",
              path: "/api/v1/parts/catalog",
              description:
                "Upload the install's part catalogue, which the compatibility check reads.",
              auth: true,
            },
            {
              method: "POST",
              path: "/api/v1/marketplace/list",
              description: "List the craft currently in the editor for sale.",
              auth: true,
            },
            {
              method: "GET",
              path: "/api/v1/web/marketplace/listings",
              description: "The paged, filtered, sorted listing feed.",
              auth: false,
            },
            {
              method: "GET",
              path: "/api/v1/web/marketplace/{id}/compatibility",
              description:
                "Check one listing's parts against the caller's uploaded catalogue.",
              auth: true,
            },
            {
              method: "POST",
              path: "/api/v1/web/marketplace/{id}/buy",
              description: "Purchase a listing and receive the craft file.",
              auth: true,
            },
            {
              method: "POST",
              path: "/api/v1/bugreport",
              description:
                "File a bug report, optionally with a trimmed KSP.log, as a ticket.",
              auth: true,
            },
            {
              method: "GET",
              path: "/api/v1/health",
              description: "Liveness check.",
              auth: false,
            },
          ]}
        />
      </Section>

      <Section title="Things worth knowing before you write a client">
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            Interactive API documentation is available but off by default, so
            the endpoint list is not public on a production server.
          </li>
          <li>
            Rate limiting is applied per client address, which behind a reverse
            proxy means the proxy has to be listed as trusted or every request
            will look like it came from one machine.
          </li>
          <li>
            There is flood detection on the authenticated endpoints that cost
            money or pay rewards, set far above any human play rate.
          </li>
          <li>
            Craft and image downloads are served from signed storage URLs rather
            than proxied through the API.
          </li>
          <li>
            The notification stream uses a short-lived ticket rather than the
            session token, because the game&rsquo;s HTTP client cannot set an
            authorization header on a websocket handshake.
          </li>
        </ul>
      </Section>

      <DocPager
        prev={{ title: "Mod Build & Setup", href: "/docs/how-does-it-work/ksp-mod" }}
      />
    </article>
  );
}
