#!/usr/bin/env bash
# ==============================================================================
# FabricOps Textile OS — MongoDB Database Backup Script
# Usage: ./scripts/backup-db.sh [MONGODB_URI] [BACKUP_DIR]
# ==============================================================================

set -euo pipefail

MONGODB_URI="${1:-${MONGODB_URI:-mongodb://127.0.0.1:27017/fabricops}}"
BACKUP_DIR="${2:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/fabricops_backup_${TIMESTAMP}.archive.gz"

echo "=== FabricOps Database Backup Initiated ==="
echo "Target URI: ${MONGODB_URI}"
echo "Output Directory: ${BACKUP_DIR}"

mkdir -p "${BACKUP_DIR}"

if command -v mongodump >/dev/null 2>&1; then
    echo "Running native mongodump..."
    mongodump --uri="${MONGODB_URI}" --archive="${BACKUP_FILE}" --gzip
elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "fabricops-mongo"; then
    echo "Running mongodump via Docker container fabricops-mongo..."
    docker exec fabricops-mongo mongodump --uri="mongodb://localhost:27017/fabricops" --archive --gzip > "${BACKUP_FILE}"
else
    echo "Error: Neither local mongodump nor running fabricops-mongo Docker container was found."
    exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "=== Backup Completed Successfully ==="
echo "File: ${BACKUP_FILE} (${FILE_SIZE})"

