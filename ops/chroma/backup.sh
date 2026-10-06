#!/usr/bin/env bash
# Nightly logical backup of the Magnifica Humanitas publication database and its
# media library. Invoked from /etc/cron.d/magnifica-backup.
#
# Why a logical dump rather than a file copy: the data lives in the
# postgresql-db-db-1 container, and pg_dump -Fc produces a single restorable
# artifact that survives a Postgres upgrade (pg_restore, not a version-locked
# data directory).
#
# Retention is 30 days on dumps and media archives. A dump you have not restored
# is a rumour, so the restore path is exercised in ops/sql/README notes.
set -euo pipefail

DB_CONTAINER=postgresql-db-db-1
DB_NAME=magnifica_humanitas
DEST=/srv/magnifica/backup
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RETENTION_DAYS=30

mkdir -p "$DEST"

# 1. Logical dump. Written inside the container (it has pg_dump), then copied out.
docker exec "$DB_CONTAINER" pg_dump -U myadmin -d "$DB_NAME" -Fc -f /tmp/mh.dump
docker cp "$DB_CONTAINER:/tmp/mh.dump" "$DEST/magnifica_humanitas-$STAMP.dump"
docker exec "$DB_CONTAINER" rm -f /tmp/mh.dump

# 2. Media library. Host bind mount at /srv/magnifica/media; small enough daily.
tar czf "$DEST/media-$STAMP.tgz" -C /srv/magnifica media

# 3. Retention.
find "$DEST" -maxdepth 1 -type f -name 'magnifica_humanitas-*.dump' -mtime "+$RETENTION_DAYS" -delete
find "$DEST" -maxdepth 1 -type f -name 'media-*.tgz' -mtime "+$RETENTION_DAYS" -delete

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] backup ok — $(du -sh "$DEST" | cut -f1) total in $DEST ($(ls -1 "$DEST" | wc -l) files)"
