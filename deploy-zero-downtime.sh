#!/bin/bash

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

# Determine which color is currently active
CURRENT_COLOR=$(docker ps --filter "name=api-blue" --filter "status=running" -q)
if [ -n "$CURRENT_COLOR" ]; then
    ACTIVE="blue"
    INACTIVE="green"
else
    ACTIVE="green"
    INACTIVE="blue"
fi

print_info "Current active deployment: $ACTIVE"
print_info "Deploying to: $INACTIVE"

# Pull latest code
print_info "Pulling latest code..."
git pull

# Build new images
print_info "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Start inactive environment
print_info "Starting $INACTIVE environment..."
docker-compose -f docker-compose.prod.yml --profile deployment up -d api-$INACTIVE web-$INACTIVE

# Wait for services to be healthy
print_info "Waiting for $INACTIVE environment to be healthy..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    api_healthy=$(docker inspect --format='{{.State.Health.Status}}' hhhomes-api-$INACTIVE 2>/dev/null || echo "starting")
    web_healthy=$(docker inspect --format='{{.State.Health.Status}}' hhhomes-web-$INACTIVE 2>/dev/null || echo "starting")
    
    if [ "$api_healthy" = "healthy" ] && [ "$web_healthy" = "healthy" ]; then
        print_success "$INACTIVE environment is healthy"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "Waiting for health checks... ($attempt/$max_attempts)"
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    print_error "$INACTIVE environment failed to become healthy"
    print_error "Rolling back..."
    docker-compose -f docker-compose.prod.yml stop api-$INACTIVE web-$INACTIVE
    exit 1
fi

# Run database migrations (if any)
print_info "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec api-$INACTIVE sh -c "cd apps/api && npx prisma migrate deploy"

# Switch traffic to new deployment
print_info "Switching traffic to $INACTIVE deployment..."

# Update nginx upstream configuration
# This requires nginx to be configured with both upstreams
# Traffic will automatically failover to the green instance

# Reload nginx without downtime
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Give it a moment to complete the switch
sleep 5

# Stop old deployment
print_info "Stopping $ACTIVE deployment..."
docker-compose -f docker-compose.prod.yml stop api-$ACTIVE web-$ACTIVE

# Clean up old containers
print_info "Cleaning up..."
docker-compose -f docker-compose.prod.yml rm -f api-$ACTIVE web-$ACTIVE

print_success "Deployment complete! Active deployment: $INACTIVE"
print_info "To rollback, run: docker-compose -f docker-compose.prod.yml up -d api-$ACTIVE web-$ACTIVE"
