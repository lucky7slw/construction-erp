#!/bin/bash

# HHHomes ERP - Complete Reset and Fresh Deployment
# This script completely resets the environment and does a fresh deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🔄 HHHomes ERP - Complete Reset and Fresh Deployment"
echo "====================================================="
echo ""

print_warning "This will completely reset your deployment!"
print_warning "All data will be lost. Press Ctrl+C to cancel."
echo ""
read -p "Continue? (type 'yes' to continue): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_error "Aborted by user"
    exit 1
fi

# Check for Docker Compose
COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    print_error "Docker Compose is not installed"
    exit 1
fi

print_info "Stopping all containers..."
$COMPOSE_CMD down -v 2>/dev/null || true

print_success "Containers stopped and volumes removed"

print_info "Removing old environment files..."
rm -f .env apps/api/.env apps/web/.env.production

print_success "Environment files removed"

print_info "Cleaning Docker system (removing unused images)..."
docker system prune -f

print_success "Docker system cleaned"

echo ""
print_success "Reset complete! Ready for fresh deployment."
echo ""
print_info "Next steps:"
echo "  1. Run: ./setup.sh"
echo "  2. Follow the prompts to configure your deployment"
echo ""
