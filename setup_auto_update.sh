#!/bin/bash

# Make updater executable
chmod +x auto_updater.py

# Add to crontab (runs at 3:00 AM daily)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/python3 $(pwd)/auto_updater.py >> $(pwd)/update.log 2>&1") | crontab -

echo "Auto-update scheduled for 3:00 AM daily"
echo "To manually check for updates, run: python3 auto_updater.py"
