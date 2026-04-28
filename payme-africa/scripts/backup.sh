#!/bin/sh
# Backup PostgreSQL quotidien — garde 7 jours
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups
BACKUP_FILE="${BACKUP_DIR}/payme_${DATE}.sql.gz"

echo "[BACKUP] Démarrage à $(date)"

# Dump + compression
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${DB_HOST:-postgres}" \
  -U "${POSTGRES_USER}" \
  "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"

echo "[BACKUP] Fichier créé: ${BACKUP_FILE} ($(du -sh ${BACKUP_FILE} | cut -f1))"

# Supprimer les backups de plus de 7 jours
find "${BACKUP_DIR}" -name "payme_*.sql.gz" -mtime +7 -delete
echo "[BACKUP] Anciens backups nettoyés"

echo "[BACKUP] Terminé à $(date)"
