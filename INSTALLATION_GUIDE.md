# HHHomes ERP - Complete Installation Guide
## Docker Deployment on MacBook A2141 Server

---

## Table of Contents

1. [Overview](#overview)
2. [What You Need](#what-you-need)
3. [Part 1: Install Ubuntu Server](#part-1-install-ubuntu-server)
4. [Part 2: Install Docker](#part-2-install-docker)
5. [Part 3: Deploy Application](#part-3-deploy-application)
6. [Part 4: Configure Domain & SSL](#part-4-configure-domain--ssl)
7. [Part 5: Daily Operations](#part-5-daily-operations)
8. [Troubleshooting](#troubleshooting)
9. [Backup & Maintenance](#backup--maintenance)

---

## Overview

This guide will help you deploy the HHHomes ERP application on a MacBook A2141 (16-inch 2019) running as a 24/7 server. The entire process takes about 1 hour.

### What Gets Installed

- **Ubuntu Server 22.04 LTS** - Operating system
- **Docker & Docker Compose** - Container platform
- **PostgreSQL** - Database
- **Node.js API** - Backend server
- **Next.js Web App** - Frontend application
- **Nginx** - Web server & reverse proxy
- **Certbot** - SSL certificate management

### Key Features

✅ One-command automated setup  
✅ HTTPS/SSL encryption  
✅ Auto-restart on crash  
✅ Health monitoring  
✅ Automatic backups  
✅ Secure password generation  

---

## What You Need

### Hardware
- MacBook A2141 (16-inch 2019)
- USB drive (8GB or larger)
- Ethernet cable (recommended)
- Another computer for initial setup

### Software & Accounts
- Ubuntu Server 22.04 LTS ISO
- balenaEtcher (USB creator)
- Domain name (e.g., yourdomain.com)
- GoDaddy account (for DNS)
- Email address (for SSL certificates)

### Network Requirements
- Home router with port forwarding capability
- Static or dynamic DNS
- Internet connection

---

## Part 1: Install Ubuntu Server

### Step 1.1: Create Ubuntu USB Installer

**On your working computer:**

1. **Download Ubuntu Server**
   - Go to: https://ubuntu.com/download/server
   - Download: Ubuntu Server 22.04.3 LTS
   - File size: ~2GB

2. **Download balenaEtcher**
   - Go to: https://www.balena.io/etcher/
   - Download for your OS (Windows/Mac/Linux)
   - Install the application

3. **Create Bootable USB**
   - Insert USB drive (will be erased!)
   - Open balenaEtcher
   - Click "Flash from file" → Select Ubuntu ISO
   - Click "Select target" → Choose your USB drive
   - Click "Flash!" 
   - Wait 5-10 minutes

### Step 1.2: Boot MacBook from USB

1. **Prepare MacBook**
   - Shut down completely
   - Plug in USB drive
   - Connect Ethernet cable (recommended)
   - Connect power adapter

2. **Boot from USB**
   - Press power button
   - **Immediately hold Option (⌥) key**
   - Keep holding until boot menu appears
   - Select "EFI Boot" or "USB"
   - Press Enter

### Step 1.3: Install Ubuntu

**Follow the installation wizard:**

1. **Language Selection**
   - Choose: English
   - Press Enter

2. **Keyboard Configuration**
   - Layout: English (US)
   - Press Enter

3. **Installation Type**
   - Select: "Ubuntu Server"
   - Press Enter

4. **Network Configuration**
   - If Ethernet: Auto-configures (recommended)
   - If WiFi: Select network, enter password
   - Press Enter

5. **Proxy Configuration**
   - Leave blank
   - Press Enter

6. **Mirror Configuration**
   - Use default mirror
   - Press Enter

7. **Storage Configuration**
   - Select: "Use entire disk"
   - ⚠️ This will erase macOS!
   - Select internal drive (usually 500GB+)
   - Confirm: "Continue"

8. **Profile Setup**
   ```
   Your name: admin
   Server name: hhhomes-server
   Username: admin
   Password: [Choose strong password - WRITE IT DOWN!]
   Confirm password: [Same password]
   ```

9. **SSH Setup**
   - ✅ Check "Install OpenSSH server"
   - Press Enter

10. **Featured Server Snaps**
    - Skip all (press Done)

11. **Installation Progress**
    - Wait 10-15 minutes
    - Do not interrupt!

12. **Reboot**
    - Remove USB when prompted
    - Press Enter
    - Wait for system to boot

### Step 1.4: First Login

1. **Login**
   ```
   hhhomes-server login: admin
   Password: [your password]
   ```

2. **Verify Network**
   ```bash
   ip addr show
   ```
   Note your IP address (e.g., 192.168.1.100)

3. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
   Wait 5-10 minutes

---

## Part 2: Install Docker

### Step 2.1: Install Docker Engine

Run these commands one at a time:

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run installation
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose

# Install Git
sudo apt install -y git

# Add your user to docker group (no sudo needed)
sudo usermod -aG docker $USER

# Reboot to apply changes
sudo reboot
```

### Step 2.2: Verify Installation

After reboot, login again and verify:

```bash
# Check Docker version
docker --version
# Should show: Docker version 24.x.x

# Check Docker Compose version
docker-compose --version
# Should show: docker-compose version 1.29.x

# Check Git version
git --version
# Should show: git version 2.x.x
```

---

## Part 3: Deploy Application

### Step 3.1: Clone Repository

```bash
# Go to home directory
cd ~

# Clone the repository
git clone https://github.com/lucky7slw/construction-erp.git

# Enter directory
cd construction-erp

# Verify files
ls -la
# Should see: docker-compose.yml, setup.sh, Makefile, etc.
```

### Step 3.2: Run Automated Setup

**This one command does everything:**

```bash
# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

**You will be asked:**

1. **Domain name**
   ```
   Enter your domain name (e.g., yourdomain.com):
   Domain: yourdomain.com
   ```
   ⚠️ Enter WITHOUT http:// or www

2. **Email address**
   ```
   Enter your email for SSL certificates:
   Email: your@email.com
   ```
   Used for SSL certificate notifications

**What happens next (automatic):**

1. ✅ Generates secure passwords
2. ✅ Creates environment files
3. ✅ Configures Nginx
4. ✅ Builds Docker containers (5-10 minutes)
5. ✅ Starts PostgreSQL database
6. ✅ Runs database migrations
7. ✅ Starts API and Web services
8. ✅ Obtains SSL certificates
9. ✅ Configures HTTPS

**Total time: 10-15 minutes**

### Step 3.3: Verify Deployment

```bash
# Check if all containers are running
docker-compose ps
```

**You should see 5 containers with status "Up":**
- hhhomes-db (postgres)
- hhhomes-api
- hhhomes-web
- hhhomes-nginx
- hhhomes-certbot

```bash
# Check logs
docker-compose logs -f
```

Press `Ctrl+C` to stop viewing logs.

---

## Part 4: Configure Domain & SSL

### Step 4.1: Get Your Server's IP Address

```bash
# Get public IP
curl ifconfig.me
```

Write down this IP address (e.g., 123.45.67.89)

### Step 4.2: Configure DNS in GoDaddy

1. **Login to GoDaddy**
   - Go to: https://godaddy.com
   - Login to your account

2. **Navigate to DNS**
   - Click "My Products"
   - Find your domain
   - Click "DNS" or "Manage DNS"

3. **Add A Records**

   Click "Add" and create these two records:

   **Record 1:**
   ```
   Type: A
   Name: app
   Value: [Your Server IP from Step 4.1]
   TTL: 600 seconds
   ```

   **Record 2:**
   ```
   Type: A
   Name: api
   Value: [Your Server IP from Step 4.1]
   TTL: 600 seconds
   ```

4. **Save Changes**
   - Click "Save"
   - Wait 10-60 minutes for DNS propagation

5. **Verify DNS**
   ```bash
   # Check if DNS is working
   nslookup app.yourdomain.com
   nslookup api.yourdomain.com
   ```
   Both should show your server's IP

### Step 4.3: Configure Router Port Forwarding

**On your home router:**

1. **Access Router Admin**
   - Open browser
   - Go to: 192.168.1.1 or 192.168.0.1
   - Login (check router label for password)

2. **Find Port Forwarding**
   - Look for: "Port Forwarding", "Virtual Server", or "NAT"
   - Usually under "Advanced" or "Security"

3. **Add Port Forwarding Rules**

   **Rule 1 - HTTP:**
   ```
   Service Name: HTTP
   External Port: 80
   Internal IP: [MacBook IP from Step 1.4]
   Internal Port: 80
   Protocol: TCP
   Enable: Yes
   ```

   **Rule 2 - HTTPS:**
   ```
   Service Name: HTTPS
   External Port: 443
   Internal IP: [MacBook IP from Step 1.4]
   Internal Port: 443
   Protocol: TCP
   Enable: Yes
   ```

4. **Save and Apply**
   - Click "Save" or "Apply"
   - Router may restart

### Step 4.4: Test Your Application

**Open a web browser and visit:**

- Web App: https://app.yourdomain.com
- API Health: https://api.yourdomain.com/health
- API Docs: https://api.yourdomain.com/docs

**You should see:**
- ✅ Secure connection (padlock icon)
- ✅ Login page for web app
- ✅ Health check response for API

---

## Part 5: Daily Operations

### Using Make Commands (Easiest)

```bash
# View all available commands
make help

# Check status
make status

# View logs
make logs

# View specific service logs
make logs-api
make logs-web
make logs-db

# Restart all services
make restart

# Stop all services
make stop

# Start all services
make start

# Backup database
make backup

# Update application
make update
```

### Using Docker Compose Commands

```bash
# Check status
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api
docker-compose restart web
docker-compose restart nginx

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# View resource usage
docker stats
```

### Updating Your Application

When you make code changes:

```bash
# Navigate to app directory
cd ~/construction-erp

# Pull latest code
git pull

# Rebuild and restart
make update
```

Or manually:

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

---

## Troubleshooting

### Problem: Can't Access Website

**Check DNS:**
```bash
nslookup app.yourdomain.com
```
Should show your server's IP. If not, wait longer or check GoDaddy settings.

**Check Services:**
```bash
docker-compose ps
```
All should say "Up". If not:
```bash
docker-compose restart
```

**Check Logs:**
```bash
docker-compose logs nginx
docker-compose logs api
docker-compose logs web
```

**Check Router:**
- Verify port forwarding is enabled
- Verify MacBook IP hasn't changed

### Problem: SSL Certificate Failed

**Try obtaining certificates manually:**
```bash
docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email your@email.com \
  -d api.yourdomain.com \
  -d app.yourdomain.com
```

**Then restart nginx:**
```bash
docker-compose restart nginx
```

### Problem: Database Connection Failed

**Restart database:**
```bash
docker-compose restart postgres
sleep 10
docker-compose restart api
```

**Check database logs:**
```bash
docker-compose logs postgres
```

### Problem: Container Won't Start

**Check logs:**
```bash
docker-compose logs [container-name]
```

**Rebuild container:**
```bash
docker-compose down
docker-compose build [container-name]
docker-compose up -d
```

### Problem: Out of Disk Space

**Check disk usage:**
```bash
df -h
```

**Clean up Docker:**
```bash
make prune
```

Or:
```bash
docker system prune -a
```

**Remove old backups:**
```bash
cd ~/construction-erp/backups
ls -lh
rm backup_old_date.sql
```

### Problem: Forgot Admin Password

**Reset via database:**
```bash
docker-compose exec postgres psql -U erpuser -d erp_production
```

Then in PostgreSQL:
```sql
-- View users
SELECT id, email, "firstName", "lastName" FROM "User";

-- Reset password (will be hashed automatically by app)
-- You'll need to use the app's password reset feature
\q
```

### Problem: MacBook IP Changed

**Find new IP:**
```bash
hostname -I
```

**Update router port forwarding** with new IP

---

## Backup & Maintenance

### Automatic Daily Backups

**Create backup script:**
```bash
nano ~/backup.sh
```

**Paste this:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/admin/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f /home/admin/construction-erp/docker-compose.yml \
  exec -T postgres pg_dump -U erpuser erp_production \
  > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
docker cp hhhomes-api:/app/uploads $BACKUP_DIR/uploads_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable:**
```bash
chmod +x ~/backup.sh
```

**Schedule daily at 2 AM:**
```bash
crontab -e
```

Add this line:
```
0 2 * * * /home/admin/backup.sh
```

### Manual Backup

```bash
# Using make
make backup

# Or manually
mkdir -p ~/backups
docker-compose exec -T postgres pg_dump -U erpuser erp_production \
  > ~/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
# Using make
make restore FILE=backups/backup_20231012_140530.sql

# Or manually
docker-compose exec -T postgres psql -U erpuser -d erp_production \
  < backups/backup_20231012_140530.sql
```

### System Updates

**Update Ubuntu:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Update Docker:**
```bash
sudo apt update && sudo apt install docker-ce docker-ce-cli containerd.io
```

**Update Application:**
```bash
cd ~/construction-erp
git pull
make update
```

### Monitor Resources

**Check disk space:**
```bash
df -h
```

**Check memory:**
```bash
free -h
```

**Check Docker stats:**
```bash
docker stats --no-stream
```

**Check system load:**
```bash
htop
```
(Press `q` to quit)

### Security Maintenance

**Check for failed login attempts:**
```bash
sudo grep "Failed password" /var/log/auth.log | tail -20
```

**Update SSL certificates (automatic, but can force):**
```bash
docker-compose run --rm certbot renew
docker-compose restart nginx
```

**Check firewall status:**
```bash
sudo ufw status
```

---

## Quick Reference Card

### Essential Commands

```bash
# Check status
make status

# View logs
make logs

# Restart services
make restart

# Backup database
make backup

# Update application
make update

# Stop everything
make stop

# Start everything
make start
```

### Important Files

```
~/construction-erp/
├── docker-compose.yml          # Main configuration
├── .env                        # Environment variables
├── setup.sh                    # Setup script
├── Makefile                    # Easy commands
├── apps/api/.env               # API configuration
├── apps/web/.env.production    # Web configuration
└── backups/                    # Database backups
```

### Important URLs

- Web App: https://app.yourdomain.com
- API: https://api.yourdomain.com
- API Health: https://api.yourdomain.com/health
- API Docs: https://api.yourdomain.com/docs

### Support Resources

- Docker Documentation: https://docs.docker.com
- Ubuntu Server Guide: https://ubuntu.com/server/docs
- Nginx Documentation: https://nginx.org/en/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs

---

## Summary

You now have a production-ready server running:

✅ Ubuntu Server 22.04 LTS  
✅ Docker containerized application  
✅ PostgreSQL database  
✅ Node.js API backend  
✅ Next.js web frontend  
✅ Nginx reverse proxy  
✅ SSL/HTTPS encryption  
✅ Automatic restarts  
✅ Health monitoring  
✅ Automatic backups  

**Total setup time: ~1 hour**  
**Maintenance: ~5 minutes per week**

---

**Document Version:** 1.0  
**Last Updated:** October 12, 2025  
**Repository:** https://github.com/lucky7slw/construction-erp
