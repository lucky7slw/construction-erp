#!/bin/bash
# Health Check Script for Construction ERP
# Checks API, database, Redis, and web services

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-erp_production}"
DB_USER="${DB_USER:-erpuser}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Status tracking
ERRORS=0

echo "=== Construction ERP Health Check ==="
echo "Started at: $(date)"
echo ""

# Function to check service
check_service() {
  local service_name=$1
  local check_command=$2

  echo -n "Checking $service_name... "
  if eval "$check_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    ERRORS=$((ERRORS + 1))
    return 1
  fi
}

# Check API Health
echo "--- API Service ---"
check_service "API Health Endpoint" \
  "curl -sf $API_URL/api/v1/health"

check_service "API Response Time" \
  "curl -sf -w '%{time_total}' -o /dev/null $API_URL/api/v1/health | awk '{exit (\$1 > 2)}'"

# Check Database
echo ""
echo "--- Database ---"
check_service "PostgreSQL Connection" \
  "PGPASSWORD=\"$DB_PASSWORD\" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'SELECT 1' -t -q"

if [ $? -eq 0 ]; then
  # Check database size
  DB_SIZE=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
  echo "  Database size: $DB_SIZE"

  # Check connection count
  CONN_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='$DB_NAME';" | xargs)
  echo "  Active connections: $CONN_COUNT"
fi

# Check Redis
echo ""
echo "--- Redis ---"
check_service "Redis Connection" \
  "redis-cli -h $REDIS_HOST -p $REDIS_PORT ping"

if [ $? -eq 0 ]; then
  # Check Redis memory
  REDIS_MEM=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
  echo "  Memory used: $REDIS_MEM"

  # Check key count
  KEY_COUNT=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT DBSIZE | cut -d: -f2)
  echo "  Keys: $KEY_COUNT"
fi

# Check Web Service (optional)
echo ""
echo "--- Web Service ---"
if curl -sf "$WEB_URL" > /dev/null 2>&1; then
  echo -e "Web app: ${GREEN}✓ OK${NC}"
else
  echo -e "Web app: ${YELLOW}⚠ Not accessible${NC} (may not be running locally)"
fi

# Check Disk Space
echo ""
echo "--- System Resources ---"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
echo -n "Disk Usage: $DISK_USAGE% "
if [ "$DISK_USAGE" -gt 90 ]; then
  echo -e "${RED}✗ CRITICAL${NC}"
  ERRORS=$((ERRORS + 1))
elif [ "$DISK_USAGE" -gt 80 ]; then
  echo -e "${YELLOW}⚠ WARNING${NC}"
else
  echo -e "${GREEN}✓ OK${NC}"
fi

# Check Memory
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')
echo -n "Memory Usage: $MEM_USAGE% "
if [ "$MEM_USAGE" -gt 90 ]; then
  echo -e "${YELLOW}⚠ HIGH${NC}"
else
  echo -e "${GREEN}✓ OK${NC}"
fi

# Check Load Average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
echo "Load Average: $LOAD_AVG"

# Summary
echo ""
echo "=== Health Check Summary ==="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}$ERRORS check(s) failed!${NC}"
  exit 1
fi
