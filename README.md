# Boundless Missions: Website

The web front end for **Boundless Missions**, a Kerbal Space Program community
platform built from three parts:

| Repo | What it is |
|---|---|
| [boundlessmissions-server](https://github.com/Boundless-Missions/boundlessmissions-server) | The Discord bot and the FastAPI server that backs everything |
| [boundlessmissions-modside](https://github.com/Boundless-Missions/boundlessmissions-modside) | The in-game KSP mod that links a save to a Discord account |
| **this repo** | [boundlessmissions.com](https://boundlessmissions.com): the marketplace, contracts, auctions, account pages, docs and admin console |

Next.js 15 (App Router) with Tailwind, deployed to Firebase Hosting using the
Next.js frameworks backend.

---

## What's on the site

### Marketplace

Browse and buy shared craft. Every listing carries its mod list, its
life-support provisioning, the part count and a blueprint rendered inside the
game by the mod.

- **Compatibility pre-flight.** Before you buy, a listing's exact part names are
  checked against the part catalogue your own install uploaded. Parts the mod
  will substitute on arrival are reported separately from blocking ones and do
  not count against compatibility, because warning about a problem that fixes
  itself is a false alarm. "No catalogue uploaded yet" is shown as its own
  state, never as a green light.
- **Votes and reports.** Like, dislike or report a listing. All three require
  signing in. What the card shows is the *net score*, likes minus dislikes, as
  one signed number; the separate tallies are storage detail and appear only in
  the owner console. A listing at or below the rating floor is delisted
  automatically, and the seller is told.
- **Sorting**, including "Highest rated" (net score, all time) and
  "Recommended", which is net likes per day over a recent window so a good craft
  from this week is not buried under a year-old one.
- **Mod filtering**, including importing a `.ckan` file to select every mod in it
  at once.
- **My uploads and purchases**: delist, relist, delete your own listings, and
  re-download anything you have bought.

Selling happens **in the game, not here**. Only the mod can read the ship on the
build stage, resolve its mods and render the blueprint.

### Contracts

The contract inbox and the full lifecycle: accept, cancel, give up, review,
dispute, extension requests and settlement responses.

- **Flag contracts can be completed here**, and they are the only kind that can.
  Every other submission is judged on the craft, its mod list and live
  telemetry, none of which a browser can read. A flag design's whole deliverable
  is an image, so the contractor uploads it here and the issuer reviews it here.
  Until they accept, the issuer sees only a watermarked, downscaled preview.
- **Reporting a counterparty** is separate from suing over the contract. Suing
  asks a moderator to decide the deal; reporting asks about a person, and is
  offered in every status because an abusive mission text is still abusive after
  the deal is finished.

Writing a contract works from the game as well, which is where the craft, mod
list and orbital margins can actually be read.

### Auctions

Bidding and closing. Auctions are created in KSP, and the Discord side still
runs the bidding channels.

### Account

- Sign in, and link a KSP client to your account with a 6-digit code. A
  Boundless account can exist with no Discord at all.
- Balance, XP, purchase history, and any **outstanding fine debt** with the rate
  it is being collected at.
- **Username, display name and avatar.**
- **Two-factor authentication** (TOTP) with recovery codes, and a "sign out
  everywhere" control that stays available even while an account is suspended,
  because a punishment must not take away a privacy control.
- **Friends.** Mutual and explicit: send a request, the other person accepts.
  Friendship is independent of any Discord server, and a friend is who you may
  hand a craft to in game. The site adds friends by Boundless username, since a
  browser has no server roster to pick from.
- **Support tickets**: read and reply to your own tickets.
- A small control that asks your own running KSP to raise its submit window.

### Docs

Three tracks (*what does it do*, *how to use it*, *how does it work*) covering
linking, contracts, rescues, craft sharing, the marketplace, auctions, the
economy, weekly missions, life support, the mod's settings and browser UI, the
API and the AI integration, plus the privacy policy and terms.

### Admin console (`/admin`)

Listings moderation, user accounts, announcements and DMs, channel locks, craft
hash bans, mod DLL publishing, the cost dashboard and the runtime gates. It is
invisible rather than forbidden: everyone it does not recognise gets **404, not
403**. Two tiers, with the owner holding everything bot-wide and a mapped
guild-admin role reaching only guild-scoped moderation for the guilds they
actually administer.

## Architecture

The browser **never talks to the bot API directly**. Every call goes to a
same-origin Next.js Route Handler under `src/app/api/…`, a BFF, which reads the
httpOnly session cookie and forwards it as a Bearer token to the bot's FastAPI
server. The bot session token never reaches client JS.

```
browser ──▶ /api/* (Route Handler, server-side)  ──▶  bot FastAPI (BOT_API_URL)
             reads __session cookie                    Authorization: Bearer …
```

Four details worth knowing before changing any of it:

- **The session cookie must be named `__session`.** Firebase Hosting's CDN
  strips every cookie except that exact name on its way to a Hosting-fronted
  backend, so any other name silently fails to stick and nobody stays logged in.
  See `src/lib/server-api.ts`.
- **App Check** (reCAPTCHA Enterprise) attests that a request came from the real
  web app. The route handlers verify the token server-side with `firebase-admin`
  (`src/lib/app-check.ts`).
- **The CSP in `next.config.mjs` ships as `Content-Security-Policy-Report-Only`
  on purpose.** App Check enforcement is live, and one wrong origin in an
  *enforced* `connect-src` would 403 every authenticated route. Clickjacking is
  enforced separately via `X-Frame-Options: DENY`, so nothing is unguarded
  meanwhile. See `CSP-ENFORCE-REMINDER.md` for the flip.
- **Policy lives in the bot, not in the BFF.** Several route handlers are
  deliberately thin pipes whose allow-lists are checked server-side, because a
  rule enforced in two places is a rule that drifts.

## Layout

```
src/
  app/
    page.tsx              landing
    marketplace/          browse, buy, compatibility, votes, reports
    contracts/            contract inbox, lifecycle, flag submission
    auctions/             bidding
    account/              linking, balance, 2FA, friends, tickets
    admin/                owner + guild-admin console
    docs/                 documentation (sidebar layout)
    github/               source repositories
    tos/ pp/              terms, privacy policy
    api/                  BFF route handlers (the only thing that talks to the bot)
  components/
    ui/                   shadcn-style primitives
    marketplace/          listing cards, dialogs, votes, reports
    report-dialog.tsx     shared report dialog (the marketplace one wraps it)
  lib/
    server-api.ts         server-only BFF helpers, session cookie
    firebase.ts           client Firebase app + App Check
    app-check.ts          server-side App Check verification
    admin.ts              admin console data layer
    marketplace.ts contracts.ts auctions.ts
  config/nav.ts           site + docs navigation
```

## Running locally

Requires Node.js 18.18+ and a local copy of the bot running its API server.

```bash
npm install
cp .env.local.example .env.local   # then edit
npm run dev                        # http://localhost:3000
```

`BOT_API_URL` defaults to `http://localhost:5022` if unset, which is where the
bot's in-process FastAPI server listens. App Check is dormant locally unless a
site key is configured, so the BFF routes accept unattested requests.

Production build:

```bash
npm run build && npm run start
```

## Deploying

```bash
./deploy.sh
```

`deploy.sh` writes a temporary `.env.production.local` pointing `BOT_API_URL` at
the production VPS, enables the Firebase `webframeworks` experiment and runs
`firebase deploy --only hosting`. The temp env file is removed by a trap even if
the build fails, so local dev keeps falling back to localhost. Override the
target with `PROD_BOT_API_URL=… ./deploy.sh`.

Firestore and Storage rules live in `firestore.rules` and `storage.rules`, and
are deployed separately.

Note that `public/GeneKerman.version` is the KSP-AVC file the mod's update check
reads. It is generated by the mod's `build.sh` and goes live on a *site* deploy
rather than on a mod release, so a mod release without a site deploy leaves that
URL stale or missing.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `BOT_API_URL` | `.env.local` (dev), Cloud Function config (prod) | The bot's FastAPI server |
| `GOOGLE_APPLICATION_CREDENTIALS` | `.env.local` (dev only) | ADC for `firebase-admin`; on Cloud Functions this comes from the runtime service account |

The Firebase web config and the reCAPTCHA site key in `src/lib/firebase.ts` are
**not** secrets. Both are public by design, and the site key is domain-restricted
at Google's edge. No credential belongs in this repo, and `.env*.local` is
ignored.

## License

GPL-3.0. See [LICENSE](LICENSE).
