#!/bin/bash

# HHHomes ERP - Interactive Setup Script
# A user-friendly setup tool with prompts and validation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   HHHomes ERP - Setup Tool v1.0       ║"
    echo "║   Construction Management System       ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

generate_secret() {
    local length=$1
    openssl rand -base64 64 | tr -d "=+/\n" | cut -c1-${length}
}

prompt_or_generate() {
    local prompt=$1
    local var_name=$2

    echo ""
    read -p "${prompt} (press Enter to auto-generate): " input
    if [ -z "$input" ]; then
        input=$(generate_secret 50)
        print_info "Generated: ${input:0:4}****${input: -4}"
    fi
    eval "$var_name='$input'"
}

prompt_required() {
    local prompt=$1
    local var_name=$2
    local input

    while true; do
        echo ""
        read -p "${prompt}: " input
        if [ -n "$input" ]; then
            eval "$var_name='$input'"
            break
        fi
        print_warning "This field is required"
    done
}

prompt_optional() {
    local prompt=$1
    local var_name=$2

    echo ""
    read -p "${prompt} (optional, press Enter to skip): " input
    eval "$var_name='$input'"
}

confirm() {
    local prompt=$1
    echo ""
    read -p "${prompt} (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

mask_string() {
    local str=$1
    if [ ${#str} -le 8 ]; then
        echo "****"
    else
        echo "${str:0:4}****${str: -4}"
    fi
}

# Check Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        echo "Please install Docker and try again"
        exit 1
    fi

    if ! docker ps &> /dev/null; then
        print_error "Docker is not running"
        echo "Please start Docker and try again"
        exit 1
    fi

    print_success "Docker is installed and running"
}

# Main script
main() {
    print_banner

    # Check prerequisites
    check_docker

    # Check if in correct directory
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found!"
        echo "Please run this script from the construction-erp directory"
        exit 1
    fi

    print_info "=== Configuration ==="

    # Collect configuration
    prompt_or_generate "Database Password" DB_PASSWORD
    prompt_or_generate "JWT Secret" JWT_SECRET
    prompt_or_generate "JWT Refresh Secret" JWT_REFRESH_SECRET
    prompt_optional "Gemini API Key" GEMINI_API_KEY
    prompt_required "Domain name (e.g., example.com)" DOMAIN
    prompt_required "Email for SSL certificates" EMAIL

    # Show summary
    echo ""
    print_info "=== Configuration Summary ==="
    echo "Database Password: $(mask_string "$DB_PASSWORD")"
    echo "JWT Secret: $(mask_string "$JWT_SECRET")"
    echo "JWT Refresh Secret: $(mask_string "$JWT_REFRESH_SECRET")"
    if [ -n "$GEMINI_API_KEY" ]; then
        echo "Gemini API Key: $(mask_string "$GEMINI_API_KEY")"
    else
        echo "Gemini API Key: (not provided)"
    fi
    echo "Domain: $DOMAIN"
    echo "Email: $EMAIL"

    # Confirm
    if ! confirm "Continue with this configuration?"; then
        print_info "Setup cancelled"
        exit 0
    fi

    # Create environment files
    print_info "Creating environment files..."

    # Main .env
    cat > .env << EOF
# Database Configuration
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://erpuser:${DB_PASSWORD}@postgres:5432/erp_production

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# SSL Configuration
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}

# Optional AI Configuration
GEMINI_API_KEY=${GEMINI_API_KEY}
EOF

    chmod 600 .env

    # API .env
    mkdir -p apps/api
    cat > apps/api/.env << EOF
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://erpuser:${DB_PASSWORD}@postgres:5432/erp_production

# JWT Secrets
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Google Gemini API
GEMINI_API_KEY=${GEMINI_API_KEY}

# Uploads
UPLOAD_DIR=/app/uploads
EOF

    chmod 600 apps/api/.env

    # Web .env.production
    mkdir -p apps/web
    cat > apps/web/.env.production << EOF
NEXT_PUBLIC_API_URL=https://api.${DOMAIN}
EOF

    chmod 600 apps/web/.env.production

    print_success "Environment files created"

    # Ask about deployment
    if confirm "Start deployment now?"; then
        deploy
    else
        print_info "Setup complete!"
        echo ""
        echo "To start the application manually, run:"
        echo "  docker compose up -d postgres"
        echo "  sleep 15"
        echo "  docker compose run --rm api sh -c 'cd apps/api && npx prisma migrate deploy && npx prisma generate'"
        echo "  docker compose up -d"
    fi
}

deploy() {
    print_info "Starting deployment..."

    # Determine compose command
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose not found"
        exit 1
    fi

    # Start postgres
    print_info "Starting database..."
    $COMPOSE_CMD up -d postgres

    # Wait for postgres
    print_info "Waiting for database to be ready (15 seconds)..."
    for i in {15..1}; do
        echo -ne "\r$i... "
        sleep 1
    done
    echo ""

    # Run migrations
    print_info "Running database migrations..."
    $COMPOSE_CMD run --rm api sh -c "cd apps/api && npx prisma migrate deploy && npx prisma generate"

    # Start all services
    print_info "Starting all services..."
    $COMPOSE_CMD up -d

    print_success "Deployment complete!"
    echo ""
    print_info "Check status with:"
    echo "  $COMPOSE_CMD ps"
    echo "  $COMPOSE_CMD logs -f"
    echo ""
    print_info "Access your application at:"
    echo "  API: http://localhost:3001"
    echo "  Web: http://localhost:3000"
}

# Run main function
main
