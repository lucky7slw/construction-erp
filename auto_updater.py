#!/usr/bin/env python3
import json
import subprocess
import sys
import os
import shutil

CURRENT_VERSION = "1.0.0"
USB_MOUNT_PATH = "/media/usb"  # Linux default, adjust if needed
UPDATE_FILE = "update.tar.gz"
VERSION_FILE = "version.json"
SERVICE_NAME = "your-service-name"

def check_and_update():
    print("Checking for updates on USB drive...")
    
    # Check if USB is mounted
    if not os.path.exists(USB_MOUNT_PATH):
        print(f"USB drive not found at {USB_MOUNT_PATH}")
        return False
    
    version_path = os.path.join(USB_MOUNT_PATH, VERSION_FILE)
    update_path = os.path.join(USB_MOUNT_PATH, UPDATE_FILE)
    
    # Check if version file exists
    if not os.path.exists(version_path):
        print("No version.json found on USB drive")
        return False
    
    try:
        with open(version_path, 'r') as f:
            data = json.load(f)
            latest = data.get('version', '')
            
            if latest != CURRENT_VERSION:
                print(f"Update found: {CURRENT_VERSION} → {latest}")
                
                if not os.path.exists(update_path):
                    print(f"Update file {UPDATE_FILE} not found on USB")
                    return False
                
                print("Stopping service...")
                subprocess.run(["sudo", "systemctl", "stop", SERVICE_NAME])
                
                print("Installing update...")
                shutil.copy(update_path, "/tmp/update.tar.gz")
                subprocess.run(["tar", "-xzf", "/tmp/update.tar.gz", "-C", "/opt/your-app/"])
                
                print("Starting service...")
                subprocess.run(["sudo", "systemctl", "start", SERVICE_NAME])
                
                print("Update complete!")
                return True
            else:
                print("Already up to date")
                return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    check_and_update()
