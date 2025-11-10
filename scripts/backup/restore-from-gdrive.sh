#!/bin/bash
# PostgreSQL Database Restore Script
# Restores database from Google Drive backup

set -e

# Configuration
DB_NAME="${DB_NAME:-erp_production}"
DB_USER="${DB_USER:-erpuser}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_PATH="${RCLONE_PATH:-construction-erp-backups}"
RESTORE_DIR="/tmp/erp-restore"

echo "=== Construction ERP Database Restore ==="

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
  echo "ERROR: rclone is not installed!"
  echo "Install with: curl https://rclone.org/install.sh | sudo bash"
  exit 1
fi

# Create restore directory
mkdir -p "$RESTORE_DIR"

# List available backups
echo ""
echo "Available backups:"
rclone ls "$RCLONE_REMOTE:$RCLONE_PATH" | grep "erp_backup_.*\.sql\.gz" | sort -r | head -10

echo ""
read -p "Enter backup filename to restore (or press Enter for latest): " BACKUP_FILE

# If no filename provided, get the latest
if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE=$(rclone ls "$RCLONE_REMOTE:$RCLONE_PATH" | grep "erp_backup_.*\.sql\.gz" | sort -r | head -1 | awk '{print $2}')
  echo "Using latest backup: $BACKUP_FILE"
fi

# Download backup from Google Drive
LOCAL_BACKUP="$RESTORE_DIR/$BACKUP_FILE"
echo "Downloading backup from Google Drive..."
rclone copy "$RCLONE_REMOTE:$RCLONE_PATH/$BACKUP_FILE" "$RESTORE_DIR" --progress

# Verify download
if [ ! -f "$LOCAL_BACKUP" ]; then
  echo "ERROR: Failed to download backup file!"
  exit 1
fi

# Warning before restore
echo ""
echo "WARNING: This will DROP and RECREATE the database '$DB_NAME'!"
echo "All current data will be LOST!"
read -p "Are you sure you want to continue? (type 'yes' to proceed): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Drop existing database and recreate
echo "Dropping existing database..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating new database..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d postgres \
  -c "CREATE DATABASE $DB_NAME;"

# Restore database
echo "Restoring database from backup..."
gunzip -c "$LOCAL_BACKUP" | PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME"

# Clean up
rm -f "$LOCAL_BACKUP"

echo ""
echo "=== Restore Complete ==="
echo "Database '$DB_NAME' has been restored from $BACKUP_FILE"
echo ""
echo "IMPORTANT: You may need to:"
echo "  1. Run database migrations: cd apps/api && npx prisma migrate deploy"
echo "  2. Restart the application services"
