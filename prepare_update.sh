#!/bin/bash

# Script to prepare update package for USB transfer
# Run this on your dev computer

VERSION=$1
USB_PATH="/media/usb"  # Adjust to your USB mount point

if [ -z "$VERSION" ]; then
    echo "Usage: ./prepare_update.sh <version>"
    echo "Example: ./prepare_update.sh 1.0.1"
    exit 1
fi

echo "Preparing update package version $VERSION..."

# Create version.json
cat > version.json << EOF
{
  "version": "$VERSION"
}
EOF

# Package your application
echo "Creating update package..."
tar -czf update.tar.gz -C /path/to/your/app .

# Check if USB is mounted
if [ ! -d "$USB_PATH" ]; then
    echo "USB drive not found at $USB_PATH"
    echo "Please mount your USB drive and try again"
    exit 1
fi

# Copy files to USB
echo "Copying to USB drive..."
cp version.json "$USB_PATH/"
cp update.tar.gz "$USB_PATH/"

echo "Update package ready on USB drive!"
echo "Files copied:"
echo "  - version.json (version: $VERSION)"
echo "  - update.tar.gz"
echo ""
echo "Now plug the USB into your server and run the update check."
