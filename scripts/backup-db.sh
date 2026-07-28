#!/usr/bin/env bash
# Daily PostgreSQL backup for hittek-crm and hittek-chatwoot
# Dumps both databases via docker exec, compresses, retains 14 days.
# Designed to run as a systemd timer (hittek-crm-backup.timer).

set -euo pipefail

BACKUP_DIR="/srv/media/backups/hittek-crm"
CONTAINER="hittek-crm-postgres"
DB_USER="crm"
RETAIN_DAYS=14
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")

DATABASES=(crm_db chatwoot_production)

mkdir -p "$BACKUP_DIR"

FAILED=0

for DB_NAME in "${DATABASES[@]}"; do
  FILENAME="${DB_NAME}_${TIMESTAMP}.dump.gz"
  echo "[backup] Starting ${DB_NAME} → ${BACKUP_DIR}/${FILENAME}"

  if docker exec "$CONTAINER" \
      pg_dump -U "$DB_USER" -d "$DB_NAME" --no-password -Fc \
      | gzip > "${BACKUP_DIR}/${FILENAME}"; then
    SIZE=$(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1)
    echo "[backup] Done: ${FILENAME} (${SIZE})"
  else
    echo "[backup] ERROR: failed to dump ${DB_NAME}" >&2
    rm -f "${BACKUP_DIR}/${FILENAME}"
    FAILED=$((FAILED + 1))
  fi
done

# Prune backups older than RETAIN_DAYS for each DB pattern
for DB_NAME in "${DATABASES[@]}"; do
  PRUNED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.dump.gz" -mtime +${RETAIN_DAYS} -print -delete | wc -l)
  echo "[backup] Pruned ${PRUNED} ${DB_NAME} backup(s) older than ${RETAIN_DAYS} days"
done

# Summary listing
echo "[backup] Current backups:"
ls -lh "$BACKUP_DIR"/*.dump.gz 2>/dev/null || echo "  (none)"

if [ "$FAILED" -gt 0 ]; then
  echo "[backup] COMPLETED WITH ${FAILED} ERROR(S)" >&2
  exit 1
fi

echo "[backup] All backups completed successfully"
