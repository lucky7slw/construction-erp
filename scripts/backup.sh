#!/bin/bash

# HHHomes ERP - Automated Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ✓ $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ✗ $1"
}

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

print_info "Starting database backup..."

# Create backup
if pg_dump -h ${POSTGRES_HOST} -U ${POSTGRES_USER} -d ${POSTGRES_DB} | gzip > ${BACKUP_FILE}; then
    BACKUP_SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
    print_success "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    print_error "Backup failed!"
    exit 1
fi

# Verify backup integrity
print_info "Verifying backup integrity..."
if gunzip -t ${BACKUP_FILE}; then
    print_success "Backup integrity verified"
else
    print_error "Backup verification failed!"
    rm -f ${BACKUP_FILE}
    exit 1
fi

# Clean up old backups
print_info "Cleaning up old backups (keeping last ${RETENTION_DAYS} days)..."
find ${BACKUP_DIR} -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
REMAINING_BACKUPS=$(ls -1 ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | wc -l)
print_success "Cleanup complete. ${REMAINING_BACKUPS} backups remaining."

# Optional: Upload to cloud storage (AWS S3, Azure Blob, etc.)
# Uncomment and configure if you want cloud backups
# if [ ! -z "${AWS_S3_BUCKET}" ]; then
#     print_info "Uploading to S3..."
#     aws s3 cp ${BACKUP_FILE} s3://${AWS_S3_BUCKET}/backups/
#     print_success "Uploaded to S3"
# fi

print_success "Backup process complete!"
