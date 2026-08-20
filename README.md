# Boundless Missions — Website

The web front end for **Boundless Missions**, a Kerbal Space Program community
platform built from three parts:

| Repo | What it is |
|---|---|
| [boundlessmissions-server](https://github.com/Boundless-Missions/boundlessmissions-server) | The Discord bot and the FastAPI server that backs everything |
| [boundlessmissions-modside](https://github.com/Boundless-Missions/boundlessmissions-modside) | The in-game KSP mod that links a save to a Discord account |
| **this repo** | [boundlessmissions.com](https://boundlessmissions.com) — the marketplace, contracts, auctions, account pages, docs and admin console |

Next.js 15 (App Router) + Tailwind, deployed to Firebase Hosting with the
Next.js frameworks backend.

---

## What's on the site

- **Marketplace** — browse and buy shared craft. Listings carry their mod list,
  life-support provisioning and a rendered blueprint; a pre-flight
  *compatibility check* compares a listing's part names against the parts you
  actually have installed before you buy. Selling happens **in game**, not here:
  only the mod can read the ship on the build stage and render it.
- **Contracts** — the contract inbox and the full lifecycle (accept, cancel,
  give up, review, dispute, extension and settlement responses). Writing a
  contract also works from the game.
- **Auctions** — bidding and closing. Auctions are created in KSP; the Discord
  side still runs the bidding channels.
- **Account** — link a KSP client to a Discord account with a 6-digit code,
  balance, XP and purchase history.
- **Docs** — *what does it do*, *how to use it* and *how does it work*, plus the
  privacy policy and terms.
- **Admin console** (`/admin`) — listings moderation, user accounts,
  announcements and DMs, channel locks, mod DLL publishing, cost dashboard and
  runtime gates. Invisible (404, not 403) to anyone the API doesn't recognise.

## Architecture

The browser **never talks to the bot API directly**. Every call goes to a
same-origin Next.js Route Handler under `src/app/api/…` — a BFF — which reads
the httpOnly session cookie and forwards it as a Bearer token to the bot's
FastAPI server. The bot session token never reaches client JS.

```
browser ──▶ /api/* (Route Handler, server-side)  ──▶  bot FastAPI (BOT_API_URL)
             reads __session cookie                    Authorization: Bearer …
```

Three details worth knowing before changing any of it:

- **The session cookie must be named `__session`.** Firebase Hosting's CDN
  strips every cookie except that exact name on its way to a Hosting-fronted
  backend, so any other name silently fails to stick and nobody stays logged in.
  See `src/lib/server-api.ts`.
- **App Check** (reCAPTCHA Enterprise) attests that a request came from the real
  web app; the route handlers verify the token server-side with `firebase-admin`
  (`src/lib/app-check.ts`).
- **The CSP in `next.config.mjs` ships as `Content-Security-Policy-Report-Only`
  on purpose** — App Check enforcement is live, and one wrong origin in an
  *enforced* `connect-src` would 403 every authed route. Clickjacking is
  enforced separately via `X-Frame-Options: DENY`, so nothing is unguarded
  meanwhile. See `CSP-ENFORCE-REMINDER.md` for the flip.

## Layout

```
src/
  app/
    page.tsx              landing
    marketplace/          browse, buy, compatibility
    contracts/            contract inbox and lifecycle
    auctions/             bidding
    account/              linking, balance, purchases
    admin/                owner + guild-admin console
    docs/                 documentation (sidebar layout)
    tos/ pp/              terms, privacy policy
    api/                  BFF route handlers (the only thing that talks to the bot)
  components/
    ui/                   shadcn-style primitives
    marketplace/          listing cards, dialogs, votes, reports
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

Firestore and Storage rules live in `firestore.rules` / `storage.rules` and are
deployed separately.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `BOT_API_URL` | `.env.local` (dev), Cloud Function config (prod) | The bot's FastAPI server |
| `GOOGLE_APPLICATION_CREDENTIALS` | `.env.local` (dev only) | ADC for `firebase-admin`; on Cloud Functions this comes from the runtime service account |

The Firebase web config and the reCAPTCHA site key in `src/lib/firebase.ts` are
**not** secrets — both are public by design and the site key is domain-restricted
at Google's edge. No credential belongs in this repo; `.env*.local` is ignored.

## License

GPL-3.0. See [LICENSE](LICENSE).
