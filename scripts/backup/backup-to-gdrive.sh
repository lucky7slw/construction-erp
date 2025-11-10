#!/bin/bash
# PostgreSQL Database Backup Script for Construction ERP
# Backs up database to Google Drive using rclone

set -e  # Exit on error

# Configuration
DB_NAME="${DB_NAME:-erp_production}"
DB_USER="${DB_USER:-erpuser}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/erp-backups}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_PATH="${RCLONE_PATH:-construction-erp-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/erp_backup_$TIMESTAMP.sql.gz"

echo "=== Construction ERP Database Backup ==="
echo "Started at: $(date)"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Perform database backup
echo "Dumping database..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

# Check if backup was created successfully
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file was not created!"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup created successfully: $BACKUP_SIZE"

# Upload to Google Drive using rclone
echo "Uploading to Google Drive..."
if command -v rclone &> /dev/null; then
  rclone copy "$BACKUP_FILE" "$RCLONE_REMOTE:$RCLONE_PATH" \
    --progress \
    --log-level INFO

  if [ $? -eq 0 ]; then
    echo "Upload successful!"

    # Clean up old backups from Google Drive
    echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    rclone delete "$RCLONE_REMOTE:$RCLONE_PATH" \
      --min-age "${RETENTION_DAYS}d" \
      --log-level INFO
  else
    echo "WARNING: Upload to Google Drive failed!"
    exit 1
  fi
else
  echo "WARNING: rclone not found. Backup created locally but not uploaded."
  echo "Install rclone: curl https://rclone.org/install.sh | sudo bash"
fi

# Clean up local backups older than 7 days
echo "Cleaning up local backups older than 7 days..."
find "$BACKUP_DIR" -name "erp_backup_*.sql.gz" -mtime +7 -delete

# Backup uploads directory (if exists)
UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
if [ -d "$UPLOADS_DIR" ]; then
  echo "Syncing uploads directory to Google Drive..."
  rclone sync "$UPLOADS_DIR" "$RCLONE_REMOTE:$RCLONE_PATH/uploads" \
    --progress \
    --log-level INFO
fi

echo "=== Backup Complete ==="
echo "Finished at: $(date)"
echo ""
echo "Backup saved to:"
echo "  Local: $BACKUP_FILE"
echo "  Cloud: $RCLONE_REMOTE:$RCLONE_PATH/$(basename $BACKUP_FILE)"
