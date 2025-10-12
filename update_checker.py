#!/usr/bin/env python3
import urllib.request
import json
import sys

CURRENT_VERSION = "1.0.0"
REPO_OWNER = "your-username"
REPO_NAME = "your-repo"

def check_update():
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/latest"
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read())
            latest = data['tag_name'].lstrip('v')
            
            if latest != CURRENT_VERSION:
                print(f"Update available: {latest} (current: {CURRENT_VERSION})")
                print(f"Download: {data['html_url']}")
                return True
            else:
                print("Already up to date")
                return False
    except Exception as e:
        print(f"Error checking for updates: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if not check_update() else 1)
