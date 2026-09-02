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
# Absolute, and we work from it: `firebase deploy` resolves firebase.json from the
# *invoker's* cwd, so running this from the repo root aborted while running it from
# a subdirectory happened to work.
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
ENV_FILE="$HERE/.env.production.local"

# `.env.local` must NOT reach the deploy. It is gitignored, which is exactly the
# assurance that turned out to be worthless: `firebase deploy` does not consult
# git — the webframeworks integration copies every `.env*` in the project into
# `.firebase/<project>/functions/`, and Next loads `.env.local` in production too
# (every environment except `test`). That is how the dev file's
# ENFORCE_APP_CHECK=false ended up switching App Check off on the live site, and
# how a GOOGLE_APPLICATION_CREDENTIALS pointing at a laptop path ended up in a
# container that has no such file. `firebase.json`'s `ignore` list does not help:
# it filters the *hosting* upload, not the function source the framework builds.
# So the reliable move is to make the file not exist while the deploy runs.
#
# The stash has to live OUTSIDE the project directory. Renaming the file in place
# does not hide it: the builder copies every `.env*`, and `.env.local.deploy-stash`
# matches that glob just as well as `.env.local` does — so the first version of
# this script shipped the dev file into the bundle under its stashed name. Next
# does not load that filename, so it was inert, but "inert" was luck rather than
# design and the whole point was for the file not to be there.
LOCAL_ENV="$HERE/.env.local"
STASH_DIR="$(mktemp -d "${TMPDIR:-/tmp}/bm-deploy-stash.XXXXXX")"
LOCAL_ENV_STASH="$STASH_DIR/.env.local"

# One trap for both files, so an interrupted or failed deploy still puts the dev
# environment back exactly as it was.
cleanup() {
  rm -f "$ENV_FILE"
  if [ -f "$LOCAL_ENV_STASH" ]; then
    mv -f "$LOCAL_ENV_STASH" "$LOCAL_ENV"
    echo "Restored $LOCAL_ENV"
  fi
  rmdir "$STASH_DIR" 2>/dev/null || true
}
trap cleanup EXIT

if [ -f "$LOCAL_ENV" ]; then
  mv -f "$LOCAL_ENV" "$LOCAL_ENV_STASH"
  echo "Moved $LOCAL_ENV aside for the deploy (restored on exit)"
fi

# Clear any dev env file a previous CLI run left staged. This has to happen
# *before* the deploy, not in the trap: a leftover in the staging directory is
# uploaded by the run that finds it, so cleaning up afterwards would be one
# deploy too late.
# `.env.local.deploy-stash` is listed because an earlier version of this script
# stashed in place and shipped it; a leftover from that is cleared here too.
rm -f "$HERE"/.firebase/*/functions/.env.local \
      "$HERE"/.firebase/*/functions/.env.local.deploy-stash

printf 'BOT_API_URL=%s\n' "$PROD_BOT_API_URL" > "$ENV_FILE"
echo "Wrote $ENV_FILE → BOT_API_URL=$PROD_BOT_API_URL"

# Enable the experimental Web Frameworks support in Firebase CLI.
# This allows Firebase to automatically detect Next.js, build it, and deploy it.
firebase experiments:enable webframeworks

# The Firestore and Storage security rules.
#
# These ship FIRST, and they ship from here rather than by hand, because for most
# of this project's life nothing deployed them at all: `firebase.json` wires both
# files, README pointed at this script, and this script said `--only hosting` —
# which touches neither ruleset. The only record of the command was an *unticked*
# checklist item in `1808_security_test_checklist.md`. Wiring a rules file is not
# deploying it, and a rule that is never pushed is a document, not a control.
#
# Both files are unconditional default-deny (`allow read, write: if false`), which
# is correct here: nothing in `src/` uses the client Firestore/Storage SDK at all
# (only firebase/app, /auth and /app-check), the bot reaches Firestore through
# firebase-admin, which bypasses rules entirely, and public preview imagery is
# served by per-object ACLs from `make_public()`, which are enforced independently
# of Security Rules. So this can only ever close the direct-from-browser path.
#
# It matters because the console's creation-time default is
# `allow read, write: if request.auth != null` and this site hands out real
# Firebase identities to the public (Google popup, email/password self-signup) —
# so under that default any stranger with an account could read and overwrite the
# paywalled marketplace crafts, avatars and submissions straight out of the bucket.
#
# Idempotent: re-running with unchanged files is a no-op that reports as much.
firebase deploy --only firestore:rules,storage --force

# Deploy the Next.js app to Firebase Hosting.
# This will automatically run `next build` under the hood.
# --force: run non-interactively and auto-create the Artifact Registry cleanup
# policy for the SSR function's container images (otherwise the deploy aborts
# before finalizing the hosting release, and old images pile up = small bill).
firebase deploy --only hosting --force
