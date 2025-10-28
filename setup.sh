#!/bin/bash

# HHHomes ERP - Docker Setup Script
# This script sets up everything you need to run the application

set -e  # Exit on any error

echo "🏗️  HHHomes ERP - Docker Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check for Docker Compose (v2 plugin or v1 standalone)
COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    print_success "Docker Compose v2 (plugin) is installed"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    print_success "Docker Compose v1 is installed"
else
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    print_info "Run: sudo apt install docker-compose-plugin -y"
    exit 1
fi

# Get domain name
echo ""
print_info "Enter your domain name (e.g., yourdomain.com):"
read -p "Domain: " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

# Get email for SSL certificates
echo ""
print_info "Enter your email for SSL certificates:"
read -p "Email: " EMAIL

if [ -z "$EMAIL" ]; then
    print_error "Email is required"
    exit 1
fi

# Generate secure random passwords
print_info "Generating secure passwords..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)

# Create .env file
print_info "Creating environment configuration..."
cat > .env << EOF
# Domain Configuration
DOMAIN=$DOMAIN

# Database Configuration
DB_PASSWORD=$DB_PASSWORD

# JWT Secrets
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

# Email for SSL
CERTBOT_EMAIL=$EMAIL
EOF

print_success "Environment file created"

# Create API .env file
mkdir -p apps/api
cat > apps/api/.env << EOF
NODE_ENV=production
PORT=3001

DATABASE_URL=postgresql://erpuser:$DB_PASSWORD@postgres:5432/erp_production

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

UPLOAD_DIR=/app/uploads
EOF

print_success "API environment file created"

# Create Web .env file
mkdir -p apps/web
cat > apps/web/.env.production << EOF
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.$DOMAIN
EOF

print_success "Web environment file created"

# Update nginx configuration with domain
print_info "Configuring nginx..."
sed -i.bak "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx/conf.d/default.conf
rm -f nginx/conf.d/default.conf.bak

print_success "Nginx configured"

# Create necessary directories
print_info "Creating directories..."
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p uploads

print_success "Directories created"

# Build and start containers (without SSL first)
print_info "Building Docker containers (this may take 5-10 minutes)..."
$COMPOSE_CMD build

print_success "Containers built successfully"

# Create temporary nginx config without SSL
print_info "Starting containers for initial setup..."
cp nginx/conf.d/default.conf nginx/conf.d/default.conf.ssl
cat > nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name api.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name app.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Start services
$COMPOSE_CMD up -d postgres

# Wait for postgres to be healthy
print_info "Waiting for database to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if $COMPOSE_CMD exec postgres pg_isready -U erpuser -d erp_production > /dev/null 2>&1; then
        break
    fi
    attempt=$((attempt + 1))
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Database failed to become ready"
    exit 1
fi

print_success "Database started"

# Run database migrations
print_info "Running database migrations..."
$COMPOSE_CMD run --rm -e DATABASE_URL="postgresql://erpuser:${DB_PASSWORD}@postgres:5432/erp_production" api sh -c "cd apps/api && npx prisma migrate deploy && npx prisma generate"

print_success "Database migrations completed"

# Start all services
$COMPOSE_CMD up -d

print_success "All services started"

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 15

# Get SSL certificates
print_info "Obtaining SSL certificates..."
$COMPOSE_CMD run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d api.$DOMAIN \
    -d app.$DOMAIN

if [ $? -eq 0 ]; then
    print_success "SSL certificates obtained"
    
    # Restore SSL nginx config
    mv nginx/conf.d/default.conf.ssl nginx/conf.d/default.conf
    
    # Reload nginx
    $COMPOSE_CMD restart nginx
    
    print_success "Nginx restarted with SSL"
else
    print_warning "SSL certificate generation failed. You can run this later:"
    print_warning "$COMPOSE_CMD run --rm certbot certonly --webroot -w /var/www/certbot -d api.$DOMAIN -d app.$DOMAIN"
fi

echo ""
echo "================================"
print_success "Setup Complete! 🎉"
echo "================================"
echo ""
print_info "Your application is now running at:"
echo "  Web App: https://app.$DOMAIN"
echo "  API: https://api.$DOMAIN"
echo ""
print_info "Useful commands:"
echo "  View logs:        $COMPOSE_CMD logs -f"
echo "  Stop services:    $COMPOSE_CMD down"
echo "  Start services:   $COMPOSE_CMD up -d"
echo "  Restart services: $COMPOSE_CMD restart"
echo "  View status:      $COMPOSE_CMD ps"
echo ""
print_warning "Important: Make sure your DNS records point to this server!"
print_warning "Add A records for api.$DOMAIN and app.$DOMAIN to your server's IP"
echo ""
print_info "Credentials saved in .env file (keep this secure!)"
echo ""
