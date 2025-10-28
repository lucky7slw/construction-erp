#!/bin/bash

# HHHomes ERP - Database Restore Script
# This script restores a PostgreSQL database from backup

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Configuration
BACKUP_DIR="/backups"

echo "🔄 HHHomes ERP - Database Restore"
echo "=================================="
echo ""

# Check if backup directory exists
if [ ! -d "${BACKUP_DIR}" ]; then
    print_error "Backup directory not found: ${BACKUP_DIR}"
    exit 1
fi

# List available backups
print_info "Available backups:"
echo ""
backups=($(ls -1 ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | sort -r))

if [ ${#backups[@]} -eq 0 ]; then
    print_error "No backups found in ${BACKUP_DIR}"
    exit 1
fi

# Display backups with numbers
for i in "${!backups[@]}"; do
    backup_file="${backups[$i]}"
    backup_size=$(du -h "${backup_file}" | cut -f1)
    backup_date=$(stat -c %y "${backup_file}" 2>/dev/null || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "${backup_file}")
    echo "  $((i+1)). $(basename ${backup_file}) (${backup_size}) - ${backup_date}"
done

echo ""
read -p "Select backup to restore (1-${#backups[@]}): " selection

# Validate selection
if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
    print_error "Invalid selection"
    exit 1
fi

BACKUP_FILE="${backups[$((selection-1))]}"

echo ""
print_warning "This will REPLACE the current database with the backup!"
print_warning "Database: ${POSTGRES_DB}"
print_warning "Backup: $(basename ${BACKUP_FILE})"
echo ""
read -p "Continue? (type 'yes' to continue): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_error "Restore cancelled"
    exit 1
fi

print_info "Verifying backup file..."
if ! gunzip -t ${BACKUP_FILE}; then
    print_error "Backup file is corrupted!"
    exit 1
fi
print_success "Backup file verified"

print_info "Stopping API services..."
# Add commands to stop API services if needed
# docker-compose stop api-blue api-green

print_info "Dropping existing database..."
PGPASSWORD=${POSTGRES_PASSWORD} dropdb -h ${POSTGRES_HOST} -U ${POSTGRES_USER} ${POSTGRES_DB} --if-exists

print_info "Creating fresh database..."
PGPASSWORD=${POSTGRES_PASSWORD} createdb -h ${POSTGRES_HOST} -U ${POSTGRES_USER} ${POSTGRES_DB}

print_info "Restoring backup..."
if gunzip -c ${BACKUP_FILE} | PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -U ${POSTGRES_USER} -d ${POSTGRES_DB}; then
    print_success "Database restored successfully!"
else
    print_error "Restore failed!"
    exit 1
fi

print_info "Starting API services..."
# Add commands to start API services if needed
# docker-compose start api-blue

print_success "Restore complete!"
echo ""
print_info "Next steps:"
echo "  1. Verify application is working correctly"
echo "  2. Check logs for any errors"
echo "  3. Test critical functionality"
echo ""
