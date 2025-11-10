# HHHomes ERP - Production Deployment Guide

This guide covers setting up and maintaining a production deployment with zero-downtime capabilities.

## Table of Contents

1. [Linux Mint Bare-Metal Deployment](#linux-mint-bare-metal-deployment)
2. [Docker Deployment (Initial Setup)](#docker-deployment-initial-setup)
3. [Zero-Downtime Deployment](#zero-downtime-deployment)
4. [Backup and Restore](#backup-and-restore)
5. [Monitoring and Alerts](#monitoring-and-alerts)
6. [Troubleshooting](#troubleshooting)
7. [Disaster Recovery](#disaster-recovery)

## Linux Mint Bare-Metal Deployment

This section covers deploying the ERP system directly on Linux Mint without Docker, ideal for dedicated servers with 24/7 uptime requirements.

### Prerequisites

- Linux Mint 20+ (or Ubuntu 20.04+)
- Minimum 4GB RAM, 2 CPU cores, 20GB disk space
- Static IP address or dynamic DNS
- Root or sudo access

### Step 1: Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL 14
sudo apt install -y postgresql-14 postgresql-client-14

# Install Redis
sudo apt install -y redis-server

# Install Node.js 18+ and pnpm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm

# Install build tools
sudo apt install -y build-essential python3
```

### Step 2: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell, create database and user:
CREATE DATABASE erp_production;
CREATE USER erpuser WITH ENCRYPTED PASSWORD 'your-secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE erp_production TO erpuser;
\q

# Configure PostgreSQL to accept local connections
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line before other rules:
# local   erp_production   erpuser                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 3: Configure Redis

```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Recommended production settings:
# maxmemory 256mb
# maxmemory-policy allkeys-lru
# save 900 1
# save 300 10
# save 60 10000

# Restart Redis
sudo systemctl restart redis-server

# Enable Redis on boot
sudo systemctl enable redis-server
```

### Step 4: Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /opt/construction-erp
sudo chown $(whoami):$(whoami) /opt/construction-erp

# Clone repository
cd /opt/construction-erp
git clone <repository-url> .

# Install dependencies
pnpm install

# Create environment files for API
cd apps/api
cp .env.example .env

# Edit API environment
nano .env
```

**API Environment Variables** (`apps/api/.env`):
```bash
NODE_ENV=production
PORT=3001

DATABASE_URL=postgresql://erpuser:your-secure-password-here@localhost:5432/erp_production

JWT_SECRET=your-long-random-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-long-random-refresh-secret-minimum-32-characters

REDIS_URL=redis://localhost:6379

GEMINI_API_KEY=your-gemini-api-key-here

UPLOAD_DIR=/opt/construction-erp/uploads
```

**Web Environment Variables** (`apps/web/.env.local`):
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Step 5: Build Applications

```bash
# Build API
cd /opt/construction-erp/apps/api
pnpm prisma generate
pnpm prisma migrate deploy
pnpm build

# Build Web
cd /opt/construction-erp/apps/web
pnpm build
```

### Step 6: Configure Google Drive Backups

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone for Google Drive
rclone config

# Follow the prompts:
# n) New remote
# name: gdrive
# Storage: drive (Google Drive)
# client_id: (leave blank or use your own)
# client_secret: (leave blank or use your own)
# scope: drive (Full access)
# Follow browser authorization flow
# Configure as shared drive: No
# Quit config

# Test connection
rclone lsd gdrive:
```

### Step 7: Create Backup Environment File

```bash
# Create backup configuration
nano ~/erp-backup.env
```

**Backup Environment** (`~/erp-backup.env`):
```bash
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_production
DB_USER=erpuser
DB_PASSWORD=your-secure-password-here

# Backup settings
BACKUP_DIR=/opt/construction-erp/backups
RCLONE_REMOTE=gdrive
RCLONE_PATH=construction-erp-backups
RETENTION_DAYS=30
LOCAL_RETENTION_DAYS=7

# Optional: Upload directory backup
UPLOAD_DIR=/opt/construction-erp/uploads
```

```bash
# Secure the environment file
chmod 600 ~/erp-backup.env

# Make backup scripts executable
chmod +x /opt/construction-erp/scripts/backup/*.sh
chmod +x /opt/construction-erp/scripts/health-check.sh
```

### Step 8: Setup Automated Backups

```bash
# Open crontab editor
crontab -e

# Add backup schedule (daily at 2 AM)
0 2 * * * source ~/erp-backup.env && /opt/construction-erp/scripts/backup/backup-to-gdrive.sh >> /var/log/erp-backup.log 2>&1

# Add health check (every 5 minutes)
*/5 * * * * /opt/construction-erp/scripts/health-check.sh >> /var/log/erp-health.log 2>&1
```

### Step 9: Install systemd Services

```bash
# Copy service files
sudo cp /opt/construction-erp/scripts/systemd/construction-erp-api.service /etc/systemd/system/
sudo cp /opt/construction-erp/scripts/systemd/construction-erp-web.service /etc/systemd/system/

# Update username in service files
sudo sed -i "s/YOUR_USERNAME/$(whoami)/g" /etc/systemd/system/construction-erp-api.service
sudo sed -i "s/YOUR_USERNAME/$(whoami)/g" /etc/systemd/system/construction-erp-web.service

# Reload systemd
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable construction-erp-api.service
sudo systemctl enable construction-erp-web.service

# Start services
sudo systemctl start construction-erp-api.service
sudo systemctl start construction-erp-web.service
```

### Step 10: Verify Installation

```bash
# Check service status
sudo systemctl status construction-erp-api
sudo systemctl status construction-erp-web

# Check logs
sudo journalctl -u construction-erp-api -f
sudo journalctl -u construction-erp-web -f

# Run health check
/opt/construction-erp/scripts/health-check.sh

# Test API endpoint
curl http://localhost:3001/api/v1/health

# Test web application
curl http://localhost:3000
```

### Step 11: Configure Firewall (Optional)

```bash
# Install UFW if not already installed
sudo apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### Maintenance Commands

**Service Management:**
```bash
# Restart services
sudo systemctl restart construction-erp-api
sudo systemctl restart construction-erp-web

# Stop services
sudo systemctl stop construction-erp-api
sudo systemctl stop construction-erp-web

# View logs
sudo journalctl -u construction-erp-api --since "1 hour ago"
sudo journalctl -u construction-erp-web --since "1 hour ago"
```

**Manual Backups:**
```bash
# Create immediate backup
source ~/erp-backup.env && /opt/construction-erp/scripts/backup/backup-to-gdrive.sh

# List available backups
rclone ls gdrive:construction-erp-backups

# Restore from backup (interactive)
/opt/construction-erp/scripts/backup/restore-from-gdrive.sh
```

**Application Updates:**
```bash
# Stop services
sudo systemctl stop construction-erp-api construction-erp-web

# Pull latest code
cd /opt/construction-erp
git pull origin main

# Update dependencies
pnpm install

# Run migrations
cd apps/api
pnpm prisma migrate deploy
pnpm prisma generate

# Rebuild applications
pnpm build
cd ../web
pnpm build

# Start services
sudo systemctl start construction-erp-api construction-erp-web

# Verify
/opt/construction-erp/scripts/health-check.sh
```

**Database Management:**
```bash
# Access database
psql -h localhost -U erpuser -d erp_production

# Backup database manually
pg_dump -h localhost -U erpuser -d erp_production | gzip > erp_manual_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Check database size
psql -h localhost -U erpuser -d erp_production -c "SELECT pg_size_pretty(pg_database_size('erp_production'));"

# Vacuum database (run during low usage)
psql -h localhost -U erpuser -d erp_production -c "VACUUM ANALYZE;"
```

### Troubleshooting Linux Mint Deployment

**Services Won't Start:**
```bash
# Check service status for errors
sudo systemctl status construction-erp-api
sudo systemctl status construction-erp-web

# Check journal for detailed errors
sudo journalctl -xe -u construction-erp-api

# Verify environment files exist
ls -la /opt/construction-erp/apps/api/.env
ls -la /opt/construction-erp/apps/web/.env.local

# Check port availability
sudo netstat -tlnp | grep -E '(3000|3001)'
```

**Database Connection Issues:**
```bash
# Test PostgreSQL connection
psql -h localhost -U erpuser -d erp_production -c "SELECT 1;"

# Check PostgreSQL is running
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Check pg_hba.conf configuration
sudo cat /etc/postgresql/14/main/pg_hba.conf | grep erp
```

**Backup Failures:**
```bash
# Test rclone connection
rclone lsd gdrive:

# Verify backup directory permissions
ls -la /opt/construction-erp/backups

# Check backup log
tail -f /var/log/erp-backup.log

# Manually run backup script with verbose output
source ~/erp-backup.env && bash -x /opt/construction-erp/scripts/backup/backup-to-gdrive.sh
```

**High Memory Usage:**
```bash
# Check process memory
ps aux | grep -E '(node|postgres|redis)' | sort -k4 -r

# Monitor system resources
htop

# Check Node.js heap usage (if applicable)
node --expose-gc --max-old-space-size=512

# Restart services to free memory
sudo systemctl restart construction-erp-api construction-erp-web
```

**Permission Errors:**
```bash
# Fix application ownership
sudo chown -R $(whoami):$(whoami) /opt/construction-erp

# Fix upload directory permissions
sudo mkdir -p /opt/construction-erp/uploads
sudo chown -R $(whoami):$(whoami) /opt/construction-erp/uploads
chmod 755 /opt/construction-erp/uploads
```

### Security Hardening

**1. Secure PostgreSQL:**
```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf

# Recommended settings:
# listen_addresses = 'localhost'
# max_connections = 100
# shared_buffers = 256MB
# effective_cache_size = 1GB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**2. Secure Redis:**
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Add password protection:
# requirepass your-strong-redis-password

# Restart Redis
sudo systemctl restart redis-server

# Update API .env with Redis password
# REDIS_URL=redis://:your-strong-redis-password@localhost:6379
```

**3. Setup SSL/TLS (Optional with Nginx):**
```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/construction-erp

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/construction-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

**4. Automatic Security Updates:**
```bash
# Install unattended upgrades
sudo apt install -y unattended-upgrades

# Enable automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Performance Optimization

**Node.js Optimization:**
```bash
# Edit systemd service for production optimizations
sudo nano /etc/systemd/system/construction-erp-api.service

# Add to [Service] section:
# Environment="NODE_OPTIONS=--max-old-space-size=512"
# LimitNOFILE=65536

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart construction-erp-api
```

**PostgreSQL Tuning:**
```bash
# Use pgtune for recommendations
# Visit https://pgtune.leopard.in.ua/
# Input your system specs and usage (Web application)

# Apply recommended settings
sudo nano /etc/postgresql/14/main/postgresql.conf
sudo systemctl restart postgresql
```

### Monitoring Setup

**System Resource Monitoring:**
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor in real-time
htop                    # CPU and memory
sudo iotop             # Disk I/O
sudo nethogs           # Network usage
```

**Application Logging:**
```bash
# Create log directory
sudo mkdir -p /var/log/construction-erp
sudo chown $(whoami):$(whoami) /var/log/construction-erp

# Configure log rotation
sudo nano /etc/logrotate.d/construction-erp

# Add configuration:
/var/log/construction-erp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 $(whoami) $(whoami)
    sharedscripts
    postrotate
        systemctl reload construction-erp-api > /dev/null 2>&1 || true
        systemctl reload construction-erp-web > /dev/null 2>&1 || true
    endscript
}
```

### Disaster Recovery Plan

**Complete System Backup:**
```bash
# Create full system backup script
nano ~/full-system-backup.sh
```

```bash
#!/bin/bash
set -e

BACKUP_ROOT="/opt/construction-erp-full-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_ROOT/$TIMESTAMP"

# Backup database
echo "Backing up database..."
pg_dump -h localhost -U erpuser -d erp_production | gzip > "$BACKUP_ROOT/$TIMESTAMP/database.sql.gz"

# Backup application files
echo "Backing up application..."
tar -czf "$BACKUP_ROOT/$TIMESTAMP/application.tar.gz" /opt/construction-erp

# Backup uploads
echo "Backing up uploads..."
tar -czf "$BACKUP_ROOT/$TIMESTAMP/uploads.tar.gz" /opt/construction-erp/uploads

# Backup environment files
echo "Backing up configuration..."
cp ~/erp-backup.env "$BACKUP_ROOT/$TIMESTAMP/"
cp /opt/construction-erp/apps/api/.env "$BACKUP_ROOT/$TIMESTAMP/api.env"
cp /opt/construction-erp/apps/web/.env.local "$BACKUP_ROOT/$TIMESTAMP/web.env.local"

# Upload to Google Drive
echo "Uploading to Google Drive..."
rclone copy "$BACKUP_ROOT/$TIMESTAMP" gdrive:construction-erp-full-backups/$TIMESTAMP --progress

echo "Full backup complete: $TIMESTAMP"
```

```bash
chmod +x ~/full-system-backup.sh

# Run weekly full backup (Sunday at 3 AM)
# Add to crontab:
0 3 * * 0 ~/full-system-backup.sh >> /var/log/erp-full-backup.log 2>&1
```

**Recovery from Total Failure:**
```bash
# 1. Install fresh Linux Mint
# 2. Install dependencies (Steps 1-3 above)
# 3. Restore from Google Drive

# Download latest full backup
rclone copy gdrive:construction-erp-full-backups/LATEST /tmp/restore --progress

# Restore application
sudo tar -xzf /tmp/restore/application.tar.gz -C /

# Restore database
gunzip < /tmp/restore/database.sql.gz | psql -h localhost -U erpuser -d erp_production

# Restore uploads
sudo tar -xzf /tmp/restore/uploads.tar.gz -C /

# Restore configuration
cp /tmp/restore/api.env /opt/construction-erp/apps/api/.env
cp /tmp/restore/web.env.local /opt/construction-erp/apps/web/.env.local

# Install systemd services (Steps 9-10 above)
# Start services
sudo systemctl start construction-erp-api construction-erp-web

# Verify
/opt/construction-erp/scripts/health-check.sh
```

---

## Docker Deployment (Initial Setup)

### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name with DNS configured
- Minimum 4GB RAM, 2 CPU cores, 20GB disk space

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd construction-erp
```

### Step 2: Run Initial Setup

```bash
chmod +x setup.sh
./setup.sh
```

This script will:
- Generate secure random passwords
- Create environment files
- Configure SSL certificates
- Start all services
- Run database migrations

### Step 3: Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test endpoints
curl https://api.yourdomain.com/health
curl https://app.yourdomain.com
```

## Zero-Downtime Deployment

The system uses blue-green deployment for zero-downtime updates.

### Architecture

- **Blue Environment**: Currently serving traffic
- **Green Environment**: Standby for deployments
- **Nginx**: Routes traffic between blue and green

### Deployment Process

```bash
chmod +x deploy-zero-downtime.sh
./deploy-zero-downtime.sh
```

The script automatically:
1. Detects active environment (blue or green)
2. Pulls latest code
3. Builds new Docker images
4. Starts inactive environment
5. Waits for health checks
6. Runs database migrations
7. Switches traffic to new environment
8. Stops old environment

### Rollback

If issues are detected after deployment:

```bash
# Rollback by starting the old environment
docker-compose -f docker-compose.prod.yml up -d api-<old-color> web-<old-color>

# Reload nginx to switch traffic back
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Stop the problematic environment
docker-compose -f docker-compose.prod.yml stop api-<new-color> web-<new-color>
```

## Backup and Restore

### Automated Backups

Backups run automatically every day at 2 AM. Configuration in `docker-compose.prod.yml`:

```yaml
backup:
  environment:
    BACKUP_SCHEDULE: "0 2 * * *"  # Daily at 2 AM
```

Backups are stored in `./backups` directory with 7-day retention.

### Manual Backup

```bash
docker-compose -f docker-compose.prod.yml exec backup /backup.sh
```

### Restore from Backup

```bash
# Make restore script executable
chmod +x scripts/restore.sh

# Run in backup container
docker-compose -f docker-compose.prod.yml exec backup /restore.sh
```

The script will:
1. List available backups
2. Let you select which to restore
3. Verify backup integrity
4. Stop API services
5. Restore database
6. Restart services

### Cloud Backup (Optional)

To enable cloud backups, edit `scripts/backup.sh` and uncomment the S3 section:

```bash
# Uncomment and configure
if [ ! -z "${AWS_S3_BUCKET}" ]; then
    print_info "Uploading to S3..."
    aws s3 cp ${BACKUP_FILE} s3://${AWS_S3_BUCKET}/backups/
    print_success "Uploaded to S3"
fi
```

Add to environment:
```bash
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

## Monitoring and Alerts

### Access Monitoring Tools

- **Grafana**: https://yourdomain.com:3030 (default password in `.env`)
- **Prometheus**: https://yourdomain.com:9090

### Key Metrics to Monitor

1. **API Health**
   - Response times (95th percentile < 2s)
   - Error rates (< 5%)
   - Request throughput

2. **Database**
   - Connection count (< 80% of max)
   - Query performance
   - Replication lag (if configured)

3. **System Resources**
   - CPU usage (< 80%)
   - Memory usage (< 90%)
   - Disk space (> 10% free)

4. **Docker Containers**
   - Container health status
   - Restart count
   - Resource usage

### Alert Configuration

Alerts are defined in `monitoring/alerts/`:
- `api-alerts.yml` - API service alerts
- `database-alerts.yml` - Database and Redis alerts
- `infrastructure-alerts.yml` - System and container alerts

### Setting Up Notifications

To receive alert notifications:

1. Configure Alertmanager (optional):

```yaml
# alertmanager.yml
route:
  receiver: 'email'
receivers:
  - name: 'email'
    email_configs:
      - to: 'your-email@example.com'
        from: 'alerts@yourdomain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

2. Update `prometheus.yml` to enable alerting:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker logs
docker-compose -f docker-compose.prod.yml logs <service-name>

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart <service-name>
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U erpuser

# Check connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U erpuser -d erp_production -c "SELECT count(*) FROM pg_stat_activity;"

# View active queries
docker-compose -f docker-compose.prod.yml exec postgres psql -U erpuser -d erp_production -c "SELECT pid, query, state FROM pg_stat_activity WHERE state != 'idle';"
```

### High Memory Usage

```bash
# Check container memory usage
docker stats

# Restart high-memory containers
docker-compose -f docker-compose.prod.yml restart api-blue

# Check for memory leaks in logs
docker-compose -f docker-compose.prod.yml logs api-blue | grep -i "memory\|heap"
```

### SSL Certificate Issues

```bash
# Renew certificates manually
docker-compose -f docker-compose.prod.yml run --rm certbot renew

# Check certificate expiration
docker-compose -f docker-compose.prod.yml exec nginx openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -dates
```

### Deployment Failed

```bash
# Check health of inactive environment
docker inspect --format='{{.State.Health.Status}}' hhhomes-api-green

# View detailed health check logs
docker inspect hhhomes-api-green | grep -A 20 "Health"

# Manually test health endpoint
curl http://localhost:3001/health
```

## Disaster Recovery

### Complete System Failure

If the entire system fails, follow these steps:

1. **Assess the situation**
   ```bash
   # Check what's running
   docker ps -a

   # Check system resources
   df -h
   free -m
   top
   ```

2. **Stop everything**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

3. **Check for corruption**
   ```bash
   # Check Docker volumes
   docker volume ls

   # Inspect volume data
   docker run --rm -v hhhomes_postgres_data:/data alpine ls -la /data
   ```

4. **Restore from backup**
   ```bash
   # Use the restore script
   chmod +x scripts/restore.sh
   docker-compose -f docker-compose.prod.yml up -d postgres
   docker-compose -f docker-compose.prod.yml exec backup /restore.sh
   ```

5. **Restart services**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Database Corruption

```bash
# Stop all API services
docker-compose -f docker-compose.prod.yml stop api-blue api-green

# Restore from latest backup
docker-compose -f docker-compose.prod.yml exec backup /restore.sh

# Restart API services
docker-compose -f docker-compose.prod.yml start api-blue
```

### Complete Reset

If you need to start completely fresh:

```bash
chmod +x reset-and-deploy.sh
./reset-and-deploy.sh
```

This will:
- Stop all containers
- Remove all volumes
- Delete environment files
- Clean Docker system
- Prepare for fresh setup

Then run `./setup.sh` to redeploy.

## Maintenance Tasks

### Weekly Tasks

- [ ] Review monitoring dashboards for trends
- [ ] Check backup integrity
- [ ] Review error logs
- [ ] Check disk space usage

### Monthly Tasks

- [ ] Update Docker images
- [ ] Review and optimize database queries
- [ ] Review SSL certificate expiration
- [ ] Test disaster recovery process
- [ ] Update dependencies

### Quarterly Tasks

- [ ] Full system audit
- [ ] Performance testing
- [ ] Security review
- [ ] Capacity planning review

## Security Best Practices

1. **Keep secrets secure**
   - Never commit `.env` files
   - Rotate secrets regularly
   - Use strong passwords (handled by setup script)

2. **Regular updates**
   - Update base Docker images monthly
   - Apply security patches promptly
   - Keep dependencies up to date

3. **Access control**
   - Use SSH keys, not passwords
   - Implement firewall rules
   - Restrict database access to Docker network

4. **Monitoring**
   - Set up alerts for suspicious activity
   - Review logs regularly
   - Monitor failed login attempts

5. **Backups**
   - Test restore procedures regularly
   - Keep backups in multiple locations
   - Encrypt sensitive backups

## Performance Optimization

### Database Optimization

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Nginx Optimization

The production nginx configuration already includes:
- Gzip compression
- Connection keepalive
- Rate limiting
- Caching headers

### Docker Optimization

```bash
# Clean up unused images
docker system prune -a

# Remove unused volumes
docker volume prune

# Check image sizes
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}"
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review this documentation
3. Check monitoring dashboards
4. Contact system administrator

## Version History

- **1.0.0** - Initial production setup with zero-downtime deployment
