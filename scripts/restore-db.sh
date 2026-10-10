#!/usr/bin/env bash
# ==============================================================================
# FabricOps Textile OS — MongoDB Database Restore Script
# Usage: ./scripts/restore-db.sh <PATH_TO_BACKUP_ARCHIVE> [MONGODB_URI]
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <path-to-archive.gz> [MONGODB_URI]"
    exit 1
fi

BACKUP_FILE="$1"
MONGODB_URI="${2:-${MONGODB_URI:-mongodb://127.0.0.1:27017/fabricops}}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' does not exist."
    exit 1
fi

echo "=== FabricOps Database Restore Initiated ==="
echo "Source Archive: ${BACKUP_FILE}"
echo "Target URI: ${MONGODB_URI}"
echo "WARNING: Existing data in target database collections will be dropped and restored!"

if command -v mongorestore >/dev/null 2>&1; then
    echo "Running native mongorestore..."
    mongorestore --uri="${MONGODB_URI}" --archive="${BACKUP_FILE}" --gzip --drop
elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "fabricops-mongo"; then
    echo "Running mongorestore via Docker container fabricops-mongo..."
    cat "${BACKUP_FILE}" | docker exec -i fabricops-mongo mongorestore --uri="mongodb://localhost:27017/fabricops" --archive --gzip --drop
else
    echo "Error: Neither local mongorestore nor running fabricops-mongo Docker container was found."
    exit 1
fi

echo "=== Database Restore Completed Successfully ==="

