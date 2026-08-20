# UPoK — Documentation & Showcase Panel

A Next.js + Tailwind site (shadcn-style components) that documents and showcases
the **Unified Players of KSP (UPoK)** Discord bot and KSP mod. Dark theme,
accent colour `#6ad26a`.

## Stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS 3 with shadcn-style UI primitives (`src/components/ui`)
- lucide-react icons
- No runtime UI dependencies beyond the above — Slot, mobile nav and code/table
  components are hand-written.

## Prerequisites

Node.js is required and is **not currently installed on this machine**. Install
it first (CachyOS / Arch):

```bash
sudo pacman -S nodejs npm
```

## Run

```bash
cd "/home/ayd/Desktop/GK-DW/Website"
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## Structure

```
src/
  app/
    page.tsx                 # Landing / showcase
    docs/                    # Documentation (sidebar layout)
      page.tsx               # Introduction
      architecture/
      linking/
      discord-bot/           # overview, commands, economy, contracts, ai
      ksp-mod/               # overview, features, settings
      api/                   # REST API reference
  components/
    ui/                      # shadcn-style primitives (button, card, badge, ...)
    *.tsx                    # header, footer, sidebar, feature cards, etc.
  config/nav.ts              # Site + docs navigation
  lib/utils.ts               # cn() helper
```

## Theming

The single dark theme and the `#6ad26a` accent are defined as HSL CSS variables
in `src/app/globals.css` (`--primary: 120 54% 62%`). Adjust there to retune.

## Images

Every visual is an explicit, labelled `ImagePlaceholder`. Search the project for
`ImagePlaceholder` to find and replace each one with a real screenshot or render.
