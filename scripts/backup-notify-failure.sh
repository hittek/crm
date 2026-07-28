#!/usr/bin/env bash
# Called by systemd OnFailure= for hittek-crm-backup.service
# Sends a Telegram alert with the last journal lines for context.

set -euo pipefail

# Load credentials from .env (same file used by the Docker stack)
ENV_FILE="/srv/stacks/hittek-chatbot/.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN not set in .env}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID not set in .env}"

HOSTNAME=$(hostname -s)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

LAST_LINES=$(journalctl -u hittek-crm-backup.service --no-pager -n 10 --output=cat 2>/dev/null || echo "(no logs)")

MESSAGE=$(printf '❌ *DB Backup Failed* — %s\n`%s`\n\n```\n%s\n```' "$HOSTNAME" "$TIMESTAMP" "$LAST_LINES")

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MESSAGE}" \
  --data-urlencode "parse_mode=Markdown" \
  > /dev/null
