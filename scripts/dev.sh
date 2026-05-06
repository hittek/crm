#!/usr/bin/env bash
# scripts/dev.sh — Start ngrok + Next.js dev server with live NEXT_PUBLIC_APP_URL
#
# Usage: pnpm dev:tunnel
#
# What it does:
#   1. Kills any existing ngrok on port 3000
#   2. Starts ngrok tunnel → localhost:3000
#   3. Waits for ngrok API, reads the public HTTPS URL
#   4. Writes NEXT_PUBLIC_APP_URL to .env.local (gitignored)
#   5. Starts Next.js dev server (respects .env.local)
#   6. On exit (Ctrl+C), kills ngrok

set -euo pipefail

PORT=3000
NGROK_API="http://localhost:4040/api/tunnels"
ENV_LOCAL=".env.local"

cleanup() {
  echo ""
  echo "→ Stopping ngrok…"
  pkill -f "ngrok http ${PORT}" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Kill stale ngrok
pkill -f "ngrok http ${PORT}" 2>/dev/null || true
sleep 0.5

# Start ngrok in background
echo "→ Starting ngrok on port ${PORT}…"
ngrok http "${PORT}" --log=stdout > /tmp/ngrok-crm.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok API (up to 15s)
echo -n "→ Waiting for ngrok tunnel"
for i in $(seq 1 30); do
  sleep 0.5
  TUNNEL_URL=$(curl -s "${NGROK_API}" 2>/dev/null \
    | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(next((x['public_url'] for x in t if x['public_url'].startswith('https')), ''))" 2>/dev/null || true)
  if [[ -n "${TUNNEL_URL}" ]]; then
    echo ""
    break
  fi
  echo -n "."
done

if [[ -z "${TUNNEL_URL:-}" ]]; then
  echo ""
  echo "✗ ngrok failed to start. Check /tmp/ngrok-crm.log"
  kill "${NGROK_PID}" 2>/dev/null || true
  exit 1
fi

echo "✓ Tunnel: ${TUNNEL_URL}"

# Write NEXT_PUBLIC_APP_URL into .env.local (overwrite if exists)
if [[ -f "${ENV_LOCAL}" ]]; then
  # Remove existing line if present
  grep -v "^NEXT_PUBLIC_APP_URL=" "${ENV_LOCAL}" > "${ENV_LOCAL}.tmp" && mv "${ENV_LOCAL}.tmp" "${ENV_LOCAL}"
fi
echo "NEXT_PUBLIC_APP_URL=${TUNNEL_URL}" >> "${ENV_LOCAL}"
echo "✓ Written to ${ENV_LOCAL}: NEXT_PUBLIC_APP_URL=${TUNNEL_URL}"

# Re-register any pending Telegram webhooks (isActive=false)
echo "→ Checking for pending Telegram webhooks…"
# Give Next.js a moment to boot before hitting the API
# (done after server starts below)

# Start Next.js dev server (inherits .env.local)
echo "→ Starting Next.js…"
echo ""
pnpm dev &
NEXT_PID=$!

# Wait for Next.js to be ready, then re-register pending webhooks
sleep 6
echo "→ Auto-registering pending Telegram webhooks…"
curl -s -X PATCH \
  "http://localhost:${PORT}/api/internal/register-webhooks" \
  -H "Content-Type: application/json" \
  -o /tmp/webhook-register.log 2>&1 || true

wait "${NEXT_PID}"
