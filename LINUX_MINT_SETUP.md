# Linux Mint Production Setup Guide

Complete guide for running Construction ERP 24/7 on Linux Mint with automated backups and health monitoring.

## Quick Start Summary

```bash
# 1. Install dependencies
sudo apt update && sudo apt install postgresql-client redis-tools
curl https://rclone.org/install.sh | sudo bash

# 2. Configure Google Drive backups
rclone config  # Setup 'gdrive' remote

# 3. Setup automated backups
chmod +x scripts/backup/*.sh scripts/health-check.sh
# Edit ~/erp-backup.env with your credentials
crontab -e  # Add backup schedule

# 4. Install systemd services
sudo cp scripts/systemd/*.service /etc/systemd/system/
sudo sed -i "s/YOUR_USERNAME/$(whoami)/g" /etc/systemd/system/construction-erp-*.service
sudo systemctl daemon-reload
sudo systemctl enable --now construction-erp-api construction-erp-web

# 5. Verify
./scripts/health-check.sh
```

## Detailed Instructions

See `DEPLOYMENT.md` for complete step-by-step instructions including:
- Google Drive backup configuration
- Automated service management with systemd
- Health monitoring and auto-restart
- Disaster recovery procedures
- Troubleshooting guide
