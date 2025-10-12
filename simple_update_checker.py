#!/usr/bin/env python3
import urllib.request

CURRENT_VERSION = "1.0.0"
VERSION_URL = "https://raw.githubusercontent.com/your-username/your-repo/main/version.txt"

def check_update():
    try:
        with urllib.request.urlopen(VERSION_URL) as response:
            latest = response.read().decode().strip()
            if latest != CURRENT_VERSION:
                print(f"Update available: {latest}")
                return True
            print("Up to date")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    check_update()
