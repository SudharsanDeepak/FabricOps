# ==============================================================================
# FabricOps Textile OS — Windows PowerShell Database Backup Script
# Usage: .\scripts\backup-db.ps1 [-MongoUri "mongodb://127.0.0.1:27017/fabricops"] [-BackupDir ".\backups"]
# ==============================================================================

param(
    [string]$MongoUri = $(if ($env:MONGODB_URI) { $env:MONGODB_URI } else { "mongodb://127.0.0.1:27017/fabricops" }),
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$BackupFile = Join-Path $BackupDir "fabricops_backup_$Timestamp.archive.gz"

Write-Host "=== FabricOps Database Backup Initiated ===" -ForegroundColor Cyan
Write-Host "Target URI: $MongoUri" -ForegroundColor Gray
Write-Host "Output File: $BackupFile" -ForegroundColor Gray

if (Get-Command mongodump -ErrorAction SilentlyContinue) {
    Write-Host "Running native mongodump..." -ForegroundColor Green
    & mongodump --uri="$MongoUri" --archive="$BackupFile" --gzip
} elseif (Get-Command docker -ErrorAction SilentlyContinue -and (docker ps --format '{{.Names}}' | Select-String "fabricops-mongo")) {
    Write-Host "Running mongodump via Docker container fabricops-mongo..." -ForegroundColor Green
    & docker exec fabricops-mongo mongodump --uri="mongodb://localhost:27017/fabricops" --archive --gzip > "$BackupFile"
} else {
    Write-Error "Neither local mongodump nor running fabricops-mongo Docker container was found."
}

if (Test-Path $BackupFile) {
    $Size = (Get-Item $BackupFile).Length / 1MB
    Write-Host "=== Backup Completed Successfully ($([math]::Round($Size, 2)) MB) ===" -ForegroundColor Green
}

