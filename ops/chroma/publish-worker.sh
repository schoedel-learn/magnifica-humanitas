#!/usr/bin/env bash
#
# Rebuild and deploy https://magnifica.catholic.work when content has changed.
#
# Invoked from /etc/cron.d/magnifica-publish every 2 minutes, and by hand with --force.
# Exits 0 immediately and silently when nothing is pending, so a quiet log is the healthy
# state.
#
# Self-healing by design: `content_events` rows are marked synced ONLY after the deploy
# command exits 0. A failed build or a rejected upload therefore leaves the work queued and
# the next cron tick retries it — the failure mode is a retry, not a silently lost publish.
#
# Usage: publish-worker.sh [--force] [--dry-run]
set -euo pipefail

CONFIG=/opt/magnifica-humanitas/config.env
REPO=/opt/magnifica-humanitas/repo
DB_CONTAINER=postgresql-db-db-1
DB_NAME=magnifica_humanitas
SLOT=/opt/magnifica-humanitas/.publish.lock
SITE_IMAGE=magnifica-site-build

FORCE=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --force)   FORCE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# cron gives a minimal environment; git and ssh need a HOME to find known_hosts.
export HOME=/root

# set -a so the file's variables are exported into the `docker run` calls below.
if [ -f "$CONFIG" ]; then
  set -a
  # shellcheck disable=SC1090  # path is fixed and checked above
  . "$CONFIG"
  set +a
fi

# Only one publish at a time: a build takes 1-3 minutes and cron ticks every 2.
exec 9>"$SLOT"
if ! flock -n 9; then
  echo "another publish is already running"
  exit 0
fi

PENDING=$(docker exec "$DB_CONTAINER" psql -U myadmin -d "$DB_NAME" -t -A \
  -c "select count(*) from content_events where synced_at is null" 2>/dev/null || echo 0)
PENDING=${PENDING:-0}

if [ "$PENDING" -eq 0 ] && [ "$FORCE" -ne 1 ]; then
  exit 0
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $PENDING pending change(s) — publishing"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] would: git pull --ff-only in $REPO"
  echo "[dry-run] would: docker build -t $SITE_IMAGE -f ops/chroma/site.Dockerfile site"
  echo "[dry-run] would: docker run $SITE_IMAGE (build + wrangler pages deploy)"
  echo "[dry-run] would: mark $PENDING event(s) synced"
  exit 0
fi

cd "$REPO"
git pull --ff-only --quiet

if [ ! -f "$CONFIG" ]; then
  echo "FATAL: $CONFIG is missing; refusing to deploy without credentials" >&2
  exit 1
fi
: "${DATABASE_URI_READONLY:?DATABASE_URI_READONLY is not set in $CONFIG}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is not set in $CONFIG}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is not set in $CONFIG}"

# Rebuild the site image (a cache hit when only content changed) and run the build+deploy
# inside it: chroma-server has no Node installed, deliberately.
docker build -q -t "$SITE_IMAGE" -f ops/chroma/site.Dockerfile site >/dev/null

# The build reads through the READ-ONLY role, so a publish can never write to the database.
# /srv/magnifica/media is bind-mounted read-only and copied into the deployed output.
docker run --rm \
  --network postgresql-db_default \
  -e DATABASE_URI="$DATABASE_URI_READONLY" \
  -e CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
  -e CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
  -v /srv/magnifica/media:/media:ro \
  "$SITE_IMAGE"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] deploy finished — marking events synced"
docker exec "$DB_CONTAINER" psql -U myadmin -d "$DB_NAME" \
  -c "update content_events set synced_at = now() where synced_at is null" >/dev/null
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] OK"
