#!/usr/bin/env python3
import urllib.request
import json

CURRENT_VERSION = "1.0.0"
UPDATE_SERVER = "http://your-macbook-ip:8080/version"

def check_update():
    try:
        with urllib.request.urlopen(UPDATE_SERVER) as response:
            data = json.loads(response.read())
            if data['version'] != CURRENT_VERSION:
                print(f"Update available: {data['version']}")
                print(f"Download: {data['download_url']}")
                return True
            print("Up to date")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    check_update()
