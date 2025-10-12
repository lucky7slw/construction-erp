#!/usr/bin/env python3
import json
import sys

def bump_version(bump_type="patch"):
    with open("version.json") as f:
        data = json.load(f)
    
    major, minor, patch = map(int, data["version"].split("."))
    
    if bump_type == "major":
        major += 1
        minor = patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    else:
        patch += 1
    
    data["version"] = f"{major}.{minor}.{patch}"
    
    with open("version.json", "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"Version bumped to {data['version']}")

if __name__ == "__main__":
    bump_type = sys.argv[1] if len(sys.argv) > 1 else "patch"
    bump_version(bump_type)
