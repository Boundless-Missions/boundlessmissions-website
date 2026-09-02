import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PlainLegalLinks } from "@/components/plain-legal-links";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/nav";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${siteConfig.name}. Learn what data we collect, why, and how you can control it.`,
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* First in the DOM on purpose: the plain-HTML copies of both documents,
          reached before the header by a screen reader or a Tab press. */}
      <PlainLegalLinks />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pointer-events-none absolute inset-0 glow-grid opacity-40" />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[22rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="container relative py-16 sm:py-20">
            <div className="mx-auto max-w-3xl">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="mb-6 -ml-3 text-muted-foreground"
              >
                <Link href="/">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back to home
                </Link>
              </Button>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Privacy Policy
              </h1>
              <p className="mt-3 text-muted-foreground">
                Last updated · <time dateTime="2026-08-24">24 August 2026</time>
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container py-14 sm:py-20">
          <article className="prose-tos mx-auto max-w-3xl space-y-12 text-[15px] leading-relaxed text-muted-foreground">
            {/* 1. Introduction */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                1. Introduction
              </h2>
              <p>
                This Privacy Policy explains how {siteConfig.name} collects,
                uses, stores and protects your personal information when you
                use the KSP add-on, the Discord bot, or this website
                (collectively, the &ldquo;Service&rdquo;). It is written in
                accordance with the{" "}
                <a
                  href="https://forum.kerbalspaceprogram.com/topic/154851-add-on-posting-rules-april-13-2021/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  KSP Forum Add-on Posting Rules
                </a>{" "}
                (Rule 8) which require transparency about data collection in
                KSP add-ons.
              </p>
              <p className="mt-3">
                By using the Service and providing your consent through the
                in-game consent window, you acknowledge that you have read and
                understood this Privacy Policy. This policy should be read
                alongside our{" "}
                <Link
                  href="/tos"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  Terms of Service
                </Link>
                .
              </p>
            </div>

            {/* 2. Definitions */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                2. Definitions
              </h2>
              <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong className="text-foreground">Service:</strong> The Kerbal Space Program (KSP) add-on, the Discord bot, and this website collectively.
                </li>
                <li>
                  <strong className="text-foreground">Device identifier:</strong> A random identifier (GUID) the add-on generates once on first run and stores in its <code className="rounded bg-card px-1.5 py-0.5 text-xs text-primary">PluginData</code> folder. It contains no personal or hardware information: it is <em>not</em> derived from your MAC address, serial numbers or any other property of your computer. The add-on does not read any of those at all.
                </li>
                <li>
                  <strong className="text-foreground">Device report:</strong> When someone tries to use your account from a device you have not approved, you receive a Discord prompt asking whether it was you. Pressing &ldquo;report&rdquo; opens a moderation ticket, and the <em>reported</em> device uploads its diagnostics (KSP.log) to that ticket.
                </li>
                <li>
                  <strong className="text-foreground">KSP.log:</strong> The standard diagnostic log file generated by Kerbal Space Program, used to identify software errors and verify game integrity during a report.
                </li>
              </ul>
            </div>

            {/* 3. Data We Collect */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                3. Data We Collect
              </h2>
              <p>
                We collect only the data necessary to provide the Service. The
                table below lists every category of personal data we process,
                why we need it, and when it is collected:
              </p>

              <div className="mt-5 rounded-xl border border-border/80 bg-card/40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-foreground">
                      <th className="px-5 py-3 font-semibold">Data</th>
                      <th className="px-5 py-3 font-semibold">Purpose</th>
                      <th className="px-5 py-3 font-semibold">When collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Email address
                      </td>
                      <td className="px-5 py-3">
                        Only when you create a Boundless Missions account on this
                        website. It is your sign-in identity and how an account can
                        be recovered. You can also use the add-on with a Discord
                        account alone and never give us an email address at all.
                      </td>
                      <td className="px-5 py-3">
                        On website sign-up (from Google, or from an email and
                        password)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Boundless username and display name
                      </td>
                      <td className="px-5 py-3">
                        The public handle other players see, and the name a friend
                        request is addressed to. The username is reserved to you
                        for as long as the account exists, so that two accounts
                        cannot share one.
                      </td>
                      <td className="px-5 py-3">When you choose one</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Profile picture you upload
                      </td>
                      <td className="px-5 py-3">
                        Shown to other players in the same places a Discord avatar
                        would be. Only if you upload one.
                      </td>
                      <td className="px-5 py-3">On upload</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Two-factor enrolment
                      </td>
                      <td className="px-5 py-3">
                        If you turn on two-factor authentication, the shared secret
                        your authenticator app uses and the hashes of your recovery
                        codes. Used only to check the codes you enter when signing
                        in.
                      </td>
                      <td className="px-5 py-3">
                        When you enable two-factor authentication
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Discord account link
                      </td>
                      <td className="px-5 py-3">
                        Ties contracts, balance and missions to your identity
                      </td>
                      <td className="px-5 py-3">On linking</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Discord profile information
                      </td>
                      <td className="px-5 py-3">
                        Your Discord display name (the nickname you use in the
                        community server, or your account name if you have
                        none), your profile picture and your corporation name
                        and level. Stored so they can be shown to other players
                        inside the add-on (in the player selectors used
                        to send a craft, offer a contract or issue a rescue)
                        and next to the contracts, marketplace listings
                        and auctions you take part in, so people can tell who
                        they are dealing with
                      </td>
                      <td className="px-5 py-3">
                        On linking, and refreshed whenever a list you appear in
                        is drawn
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Device identifier
                      </td>
                      <td className="px-5 py-3">
                        A random GUID (no hardware data; see Section 2) that
                        binds your install to your account, so an unapproved
                        device cannot use it
                      </td>
                      <td className="px-5 py-3">
                        On linking and with each request
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        IP address
                      </td>
                      <td className="px-5 py-3">
                        Connection routing, rate-limiting and abuse prevention
                      </td>
                      <td className="px-5 py-3">Each server request</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Gameplay data
                      </td>
                      <td className="px-5 py-3">
                        Vessel telemetry, craft files, part lists and
                        screenshots submitted to contracts or shared
                      </td>
                      <td className="px-5 py-3">When you submit</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        KSP.log
                      </td>
                      <td className="px-5 py-3">
                        Debugging bug reports and investigating device reports
                      </td>
                      <td className="px-5 py-3">
                        When you file a bug report (your own log, trimmed on
                        your machine before upload), or from the reported
                        device during a device report
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Website &amp; community activity
                      </td>
                      <td className="px-5 py-3">
                        Marketplace listings and purchases, likes/dislikes,
                        reports you file, auction bids, contracts you create
                        or accept
                      </td>
                      <td className="px-5 py-3">When you use those features</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-foreground/90">
                        Moderation records
                      </td>
                      <td className="px-5 py-3">
                        The reason and duration of a service suspension, and
                        the outcome of reports, so enforcement is accountable
                      </td>
                      <td className="px-5 py-3">
                        When a moderation action is taken
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Consent */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                4. Consent and Legal Basis
              </h2>
              <p>
                Per KSP Add-on Posting Rule 8.1, we require clear, informed
                consent before collecting any information.{" "}
                <strong className="text-foreground">
                  No data is collected until you explicitly opt in.
                </strong>
              </p>
              <p className="mt-3">
                On first launch the add-on presents a consent window that asks
                you to:
              </p>
              <ol className="mt-3 list-inside list-decimal space-y-1.5 pl-1">
                <li>Read and agree to this Privacy Policy.</li>
                <li>
                  Read and agree to the{" "}
                  <Link
                    href="/tos"
                    className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                  >
                    Terms of Service
                  </Link>
                  .
                </li>
                <li>
                  Expressly consent to your account, device and gameplay data
                  being collected and transmitted to the {siteConfig.name}{" "}
                  servers.
                </li>
              </ol>
              <p className="mt-3">
                All three acknowledgments must be checked before any data
                leaves your game. Your consent is recorded locally and can be
                revoked at any time (see Section 7).
              </p>
            </div>

            {/* 5. How We Use Your Data */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                5. How We Use Your Data
              </h2>
              <p>We use the data we collect to:</p>
              <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  Operate the Service: link your game to Discord, track
                  contract progress, manage economy and missions.
                </li>
                <li>
                  Show you to other players: display your Discord name, profile
                  picture, corporation name and level in the add-on&rsquo;s
                  in-game player selectors and beside the contracts, listings
                  and auctions you take part in, so that players choosing who to
                  send a craft or a mission to know who they are picking.
                </li>
                <li>
                  Protect the community: detect cheating, abuse, and
                  multi-accounting through device and IP identifiers.
                </li>
                <li>
                  Investigate reports: review KSP.log data when moderation
                  reports are filed or suspicion flags are raised.
                </li>
                <li>
                  Review submissions automatically: screenshots, mission text
                  and vessel telemetry you submit to a contract or mission may
                  be assessed by an AI model (see Section 6) to classify the
                  mission and review the submission. Review outcomes can be
                  raised with the moderation team through a ticket if you
                  believe one is wrong.
                </li>
                <li>
                  Promote the Service: crafts you share (the file, the
                  blueprint and thumbnail renders made from it, and the
                  screenshots submitted with it) may be shown in material
                  promoting {siteConfig.name}, credited to your display name, as
                  described in Section 7 of the{" "}
                  <Link
                    href="/tos"
                    className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                  >
                    Terms of Service
                  </Link>
                  .
                </li>
                <li>
                  Improve the Service: diagnose bugs and improve reliability
                  using aggregated, anonymized data.
                </li>
              </ul>
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
                <p className="text-sm text-foreground">
                  <strong>What other players can see.</strong> Boundless
                  Missions is a community service, so part of your Discord
                  profile is visible to other players by design: your display
                  name, your profile picture, your corporation name and your
                  level. If you linked from Discord, your account identifier{" "}
                  <em>is</em> your Discord ID, and it is visible to other players
                  wherever you appear &mdash; on a marketplace listing, in a player
                  selector, on a friend request &mdash; because it is the identifier
                  those features address you by. Your device identifier, your IP
                  address and your KSP.log are never shown to another player, and
                  neither is anything you have not published. What is shown is the same public profile Discord
                  already displays in the community server, and it is shown only
                  to other linked players. If you would rather not appear at
                  all, turning off data sharing (Section 7) or deleting your
                  data (Section 8) removes you from these lists. Separately, and
                  for the opposite case, the add-on can hide <em>other</em>{" "}
                  people&rsquo;s profile pictures and corporation names from{" "}
                  <em>your</em> screen (useful when you are streaming or
                  recording) under <em>Settings</em> &rarr;{" "}
                  <em>Privacy</em>; while that is on, their pictures are never
                  downloaded rather than merely not drawn.
                </p>
              </div>
              <p className="mt-3">
                <strong className="text-foreground">
                  We do not sell, rent, or share your personal data with third
                  parties for their own use.
                </strong>{" "}
                Your data is never used to profile you, and never used to
                advertise anyone else&rsquo;s product: the one promotional use
                we make is showing crafts you have shared, credited to you, in
                material about {siteConfig.name} itself (see above and Section 7
                of the{" "}
                <Link
                  href="/tos"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  Terms of Service
                </Link>
                ). The service providers that process data on our behalf are
                listed in Section 6.
              </p>
            </div>

            {/* 6. Service Providers */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                6. Service Providers
              </h2>
              <p>
                Running the Service relies on a small number of providers that
                process data on our behalf, under their own published privacy
                terms:
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong className="text-foreground">Google Firebase</strong>{" "}
                  (Cloud Firestore and Cloud Storage, part of Google Cloud):
                  all Service data described in Section 3 is stored here.
                </li>
                <li>
                  <strong className="text-foreground">
                    Google Gemini API
                  </strong>
                  : screenshots, mission text, and craft/vessel telemetry you
                  submit may be sent to Google&apos;s Gemini models for the
                  automated review and classification described in Section 5.
                  We do not use this data to train models or for advertising.
                </li>
                <li>
                  <strong className="text-foreground">
                    Google reCAPTCHA Enterprise
                  </strong>{" "}
                  (via Firebase App Check): runs on this website to verify
                  that signed-in requests come from the genuine web app, as an
                  abuse-prevention measure.
                </li>
                <li>
                  <strong className="text-foreground">Discord</strong>: the
                  bot and community features run on Discord, whose own privacy
                  policy governs your Discord account.
                </li>
              </ul>
            </div>

            {/* 7. Opt-Out */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                7. Your Right to Opt Out
              </h2>
              <p>
                In accordance with KSP Add-on Posting Rule 8.2, the add-on
                provides a built-in way to{" "}
                <strong className="text-foreground">
                  stop all data collection at any time
                </strong>
                :
              </p>
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
                <p className="text-sm text-foreground">
                  <strong>How to opt out:</strong> Open the mod toolbar →{" "}
                  <em>Settings</em> → <em>Data sharing</em> → toggle off. The
                  add-on will immediately stop sending any information to our
                  servers.
                </p>
              </div>
              <p className="mt-4">
                Opting out means community features that require server
                communication (contracts, missions, economy) will become
                unavailable, but you can continue to use KSP normally.
              </p>
            </div>

            {/* 8. Data Deletion and Your Rights */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                8. Data Deletion and Your Rights
              </h2>
              <p>
                Per GDPR and KSP Add-on Posting Rule 8.3, you have the Right to Access, Right to Rectification, Right to Restrict Processing, and Right to Erasure regarding your personal data. To exercise these rights or request full deletion of your data at any time:
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  Use the{" "}
                  <code className="rounded bg-card px-1.5 py-0.5 text-xs text-primary">
                    /b deletemydata
                  </code>{" "}
                  command in Discord, or
                </li>
                <li>
                  Contact us directly through the community Discord server, or
                </li>
                <li>
                  Email{" "}
                  <a
                    className="text-primary underline underline-offset-2"
                    href="mailto:legal@boundlessmissions.com"
                  >
                    legal@boundlessmissions.com
                  </a>{" "}
                  &mdash; the route to use if you signed up on this website and
                  have no Discord account, since the command above needs one.
                </li>
              </ul>
              <p className="mt-3">
                Upon receiving a valid request we permanently delete, within a
                reasonable timeframe: your profile (XP, balance, levels,
                preferences); your account record, including your email address,
                display name, username and profile picture; your sign-in
                credential itself; your two-factor enrolment and recovery codes;
                your session and device bindings, and the device identifiers and
                IP addresses held with them; your friend list, and your entry in
                other players&rsquo; lists; your installed-parts catalog; your
                achievement progress and marketplace votes; your notification
                history and pending craft deliveries; and your corporation
                record. Your marketplace listings are delisted, so nothing
                further is sold.
              </p>
              <p className="mt-3">
                <strong className="text-foreground">
                  Some records are kept, because they are also somebody
                  else&rsquo;s.
                </strong>{" "}
                Contracts and auctions you were party to, and support tickets you
                opened, remain so that the other person&rsquo;s history stays
                intact and moderation stays accountable. Craft files another
                player has already bought stay available to that buyer &mdash;
                deleting your data stops further distribution, but it cannot
                recall a copy already delivered. Anonymized, aggregated statistics
                that cannot identify you may also be retained. Ask us if you need
                any of these looked at individually.
              </p>
              <p className="mt-3">
                You can also{" "}
                <strong className="text-foreground">
                  log out every device
                </strong>{" "}
                at any time from the add-on, which immediately revokes every
                session token issued for your account. Both this control and
                data deletion remain available even while your account is
                under a service suspension: a moderation action never takes
                away your privacy rights.
              </p>
            </div>

            {/* 9. Data Proportionality */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                9. Data Minimisation
              </h2>
              <p>
                In line with KSP Add-on Posting Rule 8.4, we only collect the
                minimum data necessary to provide the Service:
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  Everyday device identification uses a random identifier that
                  contains no hardware or personal information (see Section
                  2). We do not read your MAC address or any other hardware
                  identifier, in this flow or any other.
                </li>
                <li>
                  Your KSP.log is read only in two user-initiated flows: a bug
                  report you file yourself (your own log only), or a device
                  report (the reported device&apos;s log). It is never read in
                  the background.
                </li>
                <li>
                  A bug report&apos;s KSP.log is trimmed on your own machine
                  before upload (the first 2&nbsp;MB and last 7&nbsp;MB), so a
                  large modded log is never transmitted whole.
                </li>
                <li>
                  IP addresses are logged only for connection integrity, rate
                  limiting and abuse prevention.
                </li>
              </ul>
            </div>

            {/* 10. Data Storage & Security */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                10. Data Storage and Security
              </h2>
              <p>
                Your data is stored in Google Firebase (Cloud Firestore and
                Cloud Storage, running on Google Cloud infrastructure) in
                projects administered by the {siteConfig.name} team. We take
                reasonable measures to protect your information from
                unauthorised access, loss or misuse. However, no system is
                completely secure and we cannot guarantee absolute security.
              </p>
              <p className="mt-3">
                Internal access is limited: full account data is accessible
                only to the project owner, and Discord-server moderators can
                see only the moderation surface of their own server (listings
                originating there, reports and tickets filed there). A
                moderation role in one server grants no visibility into any
                other.
              </p>
              <p className="mt-3">
                We retain your data only for as long as it is needed to provide
                the Service or as required to fulfil the purposes described in
                this policy. When data is no longer needed, it is deleted or
                anonymized.
              </p>
            </div>

            {/* 11. Local Browser Interface */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                11. The Local Browser Interface
              </h2>
              <p>
                The add-on includes an optional interface that opens in your own
                web browser instead of drawing windows inside the game. It is{" "}
                <strong className="text-foreground">off by default</strong> and
                can be enabled or disabled at any time from the mod toolbar
                under <em>Settings</em> &rarr; <em>Interface</em>.
              </p>
              <p className="mt-3">
                When you enable it, the add-on runs a small web server{" "}
                <strong className="text-foreground">
                  inside your own computer, on the loopback address 127.0.0.1
                </strong>
                , and opens your default browser to it. This is worth being
                precise about:
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  The server accepts connections only from your own machine. It
                  is never reachable from the internet or from other devices on
                  your network, and there is no setting that would make it so.
                </li>
                <li>
                  It listens on a different, randomly chosen port each time you
                  start the game, and stops when you close the game or switch
                  back to the classic in-game windows.
                </li>
                <li>
                  It collects nothing additional. The interface displays the
                  same account and gameplay data described in Section 3, and
                  requests still travel to our servers through the add-on
                  itself, under the same consent and opt-out controls.
                </li>
                <li>
                  Your session token stays inside the add-on and is never given
                  to the browser page.
                </li>
              </ul>
              <p className="mt-3">
                <strong className="text-foreground">Cookies.</strong> The
                interface sets one cookie, named{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">
                  gk
                </code>
                , scoped to 127.0.0.1. It exists only so the page can prove to
                your own running copy of KSP that it is the page the game just
                opened. It is marked <code>HttpOnly</code> and{" "}
                <code>SameSite=Strict</code>, holds a random value with no
                personal information in it, is not sent to us or to any website,
                and disappears when you close your browser. It is not used for
                analytics, advertising or tracking of any kind.
              </p>
              <p className="mt-3">
                <strong className="text-foreground">Stored locally.</strong>{" "}
                Some preferences the interface uses are saved on your computer
                in the add-on&apos;s <code>PluginData</code> folder rather than
                in the browser, for example the players you mark as
                favourites. These files never leave your machine, and deleting
                the add-on removes them.
              </p>
            </div>

            {/* 12. Cookies on This Website */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                12. Cookies on This Website
              </h2>
              <p>
                This website (as opposed to the local browser interface above)
                sets exactly two cookies, both strictly functional:
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">
                    __session
                  </code>
                  : your sign-in session, set when you link the website to
                  your account. It is <code>HttpOnly</code> (unreadable by
                  page scripts) and is what authenticates your requests.
                </li>
                <li>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">
                    bm_signed_in
                  </code>
                  : a companion flag holding no secret and no personal data;
                  it only tells the page whether to draw the signed-in
                  navigation.
                </li>
              </ul>
              <p className="mt-3">
                We use no analytics, advertising or tracking cookies. Google
                reCAPTCHA Enterprise (see Section 6) runs on signed-in pages
                for abuse prevention and operates under Google&apos;s own
                privacy policy.
              </p>
            </div>

            {/* 13. Children's Privacy */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                13. Children&apos;s Privacy
              </h2>
              <p>
                The Service is not directed at children under the age of 13.
                Some countries set a{" "}
                <strong className="text-foreground">
                  higher minimum age of digital consent
                </strong>
                , for example up to 16 in parts of the European Economic Area
                under the GDPR, and where that is the case, the higher age
                applies to you. We do not knowingly collect personal data from
                anyone below the age that applies in their country. If you
                believe a child has provided us with personal data, please
                contact us through the Discord server or at either email
                address in Section 16 and we will promptly delete it.
              </p>
            </div>

            {/* 14. Open Source */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                14. Open Source and Transparency
              </h2>
              <p>
                All source code for {siteConfig.name} is publicly available
                under the{" "}
                <strong className="text-foreground">
                  GNU General Public License v3.0 (GPL-3.0)
                </strong>
                . You are free to inspect the code to verify exactly what data
                is collected and how it is transmitted. You can also modify and
                redistribute the code in accordance with that licence.
              </p>
            </div>

            {/* 15. Changes */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                15. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. When we
                do, we will update the &ldquo;Last updated&rdquo; date at the
                top of this page and, for material changes, notify users
                through the Discord server, this website and/or an in-game
                prompt. For material
                changes the add-on additionally{" "}
                <strong className="text-foreground">
                  stops transmitting any data and re-presents the consent
                  window
                </strong>
                : nothing further leaves your game until you have read and
                accepted the updated policy. Continued use of the Service
                after changes constitutes acceptance.
              </p>
            </div>

            {/* 16. Contact */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                16. Contact
              </h2>
              <p>
                Questions about this Privacy Policy? Reach out to us via email at{" "}
                <a href="mailto:legal@boundlessmissions.com" className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80">
                  legal@boundlessmissions.com
                </a>
                . For account help, bug reports and anything else, email{" "}
                <a href="mailto:support@boundlessmissions.com" className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80">
                  support@boundlessmissions.com
                </a>
                , ask in the {siteConfig.name} Discord server, or open an issue on our{" "}
                <Link
                  href="/github"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  GitHub repositories
                </Link>
                .
              </p>
            </div>
          </article>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
