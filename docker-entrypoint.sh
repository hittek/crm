#!/bin/sh
set -e

echo "[entrypoint] Applying Prisma schema to database..."
# Use db push for a fresh PostgreSQL database.
# This applies the current schema directly without replaying migration history
# (which was originally written for SQLite and is not PostgreSQL-compatible).
# For incremental deploys after the initial setup, this is a no-op when schema is current.
NODE_PATH="/prisma-cli/node_modules" \
  node /prisma-cli/node_modules/.bin/prisma db push --accept-data-loss

echo "[entrypoint] Starting Next.js..."
exec node server.js
