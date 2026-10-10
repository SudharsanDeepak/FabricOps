# ==============================================================================
# FabricOps Textile OS — Windows PowerShell Database Restore Script
# Usage: .\scripts\restore-db.ps1 -BackupFile ".\backups\fabricops_backup_20261010_120000.archive.gz" [-MongoUri "mongodb://127.0.0.1:27017/fabricops"]
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$MongoUri = $(if ($env:MONGODB_URI) { $env:MONGODB_URI } else { "mongodb://127.0.0.1:27017/fabricops" })
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup archive file '$BackupFile' does not exist."
}

Write-Host "=== FabricOps Database Restore Initiated ===" -ForegroundColor Cyan
Write-Host "Source Archive: $BackupFile" -ForegroundColor Gray
Write-Host "Target URI: $MongoUri" -ForegroundColor Gray
Write-Host "WARNING: Existing data in target database collections will be dropped and restored!" -ForegroundColor Yellow

if (Get-Command mongorestore -ErrorAction SilentlyContinue) {
    Write-Host "Running native mongorestore..." -ForegroundColor Green
    & mongorestore --uri="$MongoUri" --archive="$BackupFile" --gzip --drop
} elseif (Get-Command docker -ErrorAction SilentlyContinue -and (docker ps --format '{{.Names}}' | Select-String "fabricops-mongo")) {
    Write-Host "Running mongorestore via Docker container fabricops-mongo..." -ForegroundColor Green
    Get-Content $BackupFile -Raw | docker exec -i fabricops-mongo mongorestore --uri="mongodb://localhost:27017/fabricops" --archive --gzip --drop
} else {
    Write-Error "Neither local mongorestore nor running fabricops-mongo Docker container was found."
}

Write-Host "=== Database Restore Completed Successfully ===" -ForegroundColor Green

