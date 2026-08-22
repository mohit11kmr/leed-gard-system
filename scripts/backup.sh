#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/leadguard-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --file="$file" "$DATABASE_URL"
find "$BACKUP_DIR" -type f -name '*.dump' -mtime +14 -delete
echo "Created $file"