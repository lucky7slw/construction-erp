# 🐳 Docker Deployment Guide for 10-Year-Olds

This guide will help you deploy your HHHomes ERP application using Docker. It's like magic - one command does everything!

---

## 📋 What You Need

1. **MacBook A2141** with Ubuntu Server installed (follow the Ubuntu installation from the previous guide)
2. **Your domain name** (e.g., `yourdomain.com`)
3. **Email address** (for SSL certificates)
4. **30 minutes** of your time

---

## 🚀 Part 1: Install Ubuntu on MacBook

Follow **Steps 1-2** from the manual guide to:
1. Create Ubuntu Server USB installer
2. Install Ubuntu Server 22.04 LTS on your MacBook
3. Boot into Ubuntu and login

---

## 🐳 Part 2: Install Docker (Super Easy!)

Once you're logged into Ubuntu, run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (one command does it all!)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose

# Let you use Docker without typing 'sudo' every time
sudo usermod -aG docker $USER

# Install Git
sudo apt install -y git

# Reboot to apply changes
sudo reboot
```

**Wait 2 minutes for reboot, then SSH back in.**

---

## 📦 Part 3: Get Your Code

```bash
# Go to home directory
cd ~

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/hhhomespm.git

# Go into the folder
cd hhhomespm
```

---

## 🎯 Part 4: Run the Magic Setup Script

This ONE command does EVERYTHING:
- Creates secure passwords
- Sets up the database
- Builds your app
- Gets SSL certificates
- Starts everything

```bash
# Make the script executable
chmod +x setup.sh

# Run it!
./setup.sh
```

**What it will ask you:**
1. **Domain name**: Enter `yourdomain.com` (without http:// or www)
2. **Email**: Your email for SSL certificate notifications

**Then sit back and watch!** ☕

The script will:
- ✅ Generate secure passwords
- ✅ Build Docker containers (5-10 minutes)
- ✅ Set up PostgreSQL database
- ✅ Run database migrations
- ✅ Start all services
- ✅ Get SSL certificates (HTTPS)
- ✅ Configure Nginx

---

## 🌐 Part 5: Setup Your Domain (GoDaddy)

While Docker is building, set up your domain:

### **In GoDaddy:**

1. Log into GoDaddy
2. Go to **My Products** → Click your domain
3. Click **DNS** → **Manage Zones**
4. Add **2 A Records**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `app` | Your Server IP | 600 |
| A | `api` | Your Server IP | 600 |

**Get your server IP:**
```bash
curl ifconfig.me
```

**Save the DNS records** (takes 10-60 minutes to work)

---

## 🏠 Part 6: Setup Router Port Forwarding

**On your home router:**

1. Find your router's admin page (usually `192.168.1.1` or `192.168.0.1`)
2. Login (check router label for password)
3. Find **Port Forwarding** or **Virtual Server** section
4. Add these rules:

| External Port | Internal IP | Internal Port | Protocol |
|---------------|-------------|---------------|----------|
| 80 | 192.168.1.XXX | 80 | TCP |
| 443 | 192.168.1.XXX | 443 | TCP |

**Find your MacBook's local IP:**
```bash
hostname -I
```
(Use the first IP shown, like `192.168.1.100`)

---

## ✅ Part 7: Verify Everything Works

### **Check if containers are running:**
```bash
docker-compose ps
```

You should see:
- ✅ hhhomes-db (postgres)
- ✅ hhhomes-api
- ✅ hhhomes-web
- ✅ hhhomes-nginx
- ✅ hhhomes-certbot

### **Check logs:**
```bash
# All logs
docker-compose logs -f

# Just API logs
docker-compose logs -f api

# Just Web logs
docker-compose logs -f web
```

Press `Ctrl+C` to stop viewing logs.

### **Test your sites:**
- Web App: `https://app.yourdomain.com`
- API: `https://api.yourdomain.com/health`

---

## 🎮 Useful Commands (Your Control Panel)

### **View Status:**
```bash
docker-compose ps
```

### **View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

### **Stop Everything:**
```bash
docker-compose down
```

### **Start Everything:**
```bash
docker-compose up -d
```

### **Restart Everything:**
```bash
docker-compose restart
```

### **Restart One Service:**
```bash
docker-compose restart api
docker-compose restart web
docker-compose restart nginx
```

### **Update Your Code:**
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### **View Database:**
```bash
docker-compose exec postgres psql -U erpuser -d erp_production
```

### **Backup Database:**
```bash
docker-compose exec postgres pg_dump -U erpuser erp_production > backup_$(date +%Y%m%d).sql
```

### **Restore Database:**
```bash
docker-compose exec -T postgres psql -U erpuser -d erp_production < backup_20231012.sql
```

---

## 🔒 Security Features (Already Built-In!)

✅ **SSL/HTTPS** - All traffic is encrypted
✅ **Secure passwords** - Auto-generated strong passwords
✅ **Isolated containers** - Each service runs in its own sandbox
✅ **Auto-restart** - If something crashes, Docker restarts it
✅ **Health checks** - Docker monitors if services are healthy

---

## 🆘 Troubleshooting

### **Problem: Can't access website**

**Check DNS:**
```bash
nslookup app.yourdomain.com
```
Should show your server's IP.

**Check if services are running:**
```bash
docker-compose ps
```
All should say "Up".

**Check logs for errors:**
```bash
docker-compose logs api
docker-compose logs web
```

### **Problem: SSL certificate failed**

**Try again manually:**
```bash
docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email your@email.com \
  -d api.yourdomain.com \
  -d app.yourdomain.com
```

Then restart nginx:
```bash
docker-compose restart nginx
```

### **Problem: Database connection failed**

**Check if postgres is running:**
```bash
docker-compose ps postgres
```

**Restart database:**
```bash
docker-compose restart postgres
sleep 10
docker-compose restart api
```

### **Problem: Out of disk space**

**Clean up old Docker images:**
```bash
docker system prune -a
```

**Check disk usage:**
```bash
df -h
```

---

## 🔄 Automatic Backups

Create a backup script:

```bash
nano ~/backup.sh
```

Paste this:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/admin/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U erpuser erp_production > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
docker cp hhhomes-api:/app/uploads $BACKUP_DIR/uploads_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable:
```bash
chmod +x ~/backup.sh
```

Run daily at 2 AM:
```bash
crontab -e
```

Add this line:
```
0 2 * * * /home/admin/backup.sh
```

---

## 📊 Monitoring

### **Check resource usage:**
```bash
docker stats
```

### **Check disk space:**
```bash
df -h
```

### **Check memory:**
```bash
free -h
```

---

## 🎉 You're Done!

Your app is now:
- ✅ Running 24/7
- ✅ Secured with HTTPS
- ✅ Auto-restarting if it crashes
- ✅ Backed up daily
- ✅ Accessible from anywhere

**Access your app at:**
- 🌐 Web: `https://app.yourdomain.com`
- 🔌 API: `https://api.yourdomain.com`

---

## 💡 Pro Tips

1. **Always check logs first** when something doesn't work
2. **Restart services** before panicking - fixes 90% of issues
3. **Keep backups** - run `~/backup.sh` manually before big changes
4. **Update regularly** - `git pull && docker-compose up -d --build`
5. **Monitor disk space** - Docker images can fill up disk

---

## 📞 Quick Reference Card

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Status
docker-compose ps

# Update code
git pull && docker-compose up -d --build

# Backup
~/backup.sh
```

---

**That's it! Docker handles everything else automatically!** 🚀
