#!/usr/bin/env bash
set -euo pipefail

# Production URL of the Boundless Missions bot API (VPS, behind Caddy TLS).
# Override on the fly with:  PROD_BOT_API_URL=... ./deploy.sh
PROD_BOT_API_URL="${PROD_BOT_API_URL:-https://mainserver.boundlessmissions.com}"

# Next.js only loads `.env.production.local` when NODE_ENV=production (i.e. the
# `next build` Firebase runs), never during `next dev`. We write it just for the
# deploy and delete it afterwards, so local dev keeps falling back to the
# localhost:5022 default baked into src/lib/server-api.ts. The trap guarantees
# cleanup even if the build/deploy fails partway through.
ENV_FILE="$(dirname "$0")/.env.production.local"
cleanup() { rm -f "$ENV_FILE"; }
trap cleanup EXIT

printf 'BOT_API_URL=%s\n' "$PROD_BOT_API_URL" > "$ENV_FILE"
echo "Wrote $ENV_FILE → BOT_API_URL=$PROD_BOT_API_URL"

# Enable the experimental Web Frameworks support in Firebase CLI.
# This allows Firebase to automatically detect Next.js, build it, and deploy it.
firebase experiments:enable webframeworks

# Deploy the Next.js app to Firebase Hosting.
# This will automatically run `next build` under the hood.
# --force: run non-interactively and auto-create the Artifact Registry cleanup
# policy for the SSR function's container images (otherwise the deploy aborts
# before finalizing the hosting release, and old images pile up = small bill).
firebase deploy --only hosting --force
