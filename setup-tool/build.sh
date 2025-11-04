#!/bin/bash

# Build script for HHHomes ERP Setup Tool
# Builds executables for Windows, Linux, and macOS

echo "Building HHHomes ERP Setup Tool..."
echo ""

# Windows (64-bit)
echo "Building for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -o ../hhhomes-setup-windows.exe main.go
if [ $? -eq 0 ]; then
    echo "✓ Windows build complete: hhhomes-setup-windows.exe"
else
    echo "✗ Windows build failed"
fi

# Linux (64-bit)
echo "Building for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -o ../hhhomes-setup-linux main.go
if [ $? -eq 0 ]; then
    chmod +x ../hhhomes-setup-linux
    echo "✓ Linux build complete: hhhomes-setup-linux"
else
    echo "✗ Linux build failed"
fi

# macOS (Intel)
echo "Building for macOS (amd64)..."
GOOS=darwin GOARCH=amd64 go build -o ../hhhomes-setup-macos-intel main.go
if [ $? -eq 0 ]; then
    chmod +x ../hhhomes-setup-macos-intel
    echo "✓ macOS Intel build complete: hhhomes-setup-macos-intel"
else
    echo "✗ macOS Intel build failed"
fi

# macOS (Apple Silicon)
echo "Building for macOS (arm64)..."
GOOS=darwin GOARCH=arm64 go build -o ../hhhomes-setup-macos-arm main.go
if [ $? -eq 0 ]; then
    chmod +x ../hhhomes-setup-macos-arm
    echo "✓ macOS ARM build complete: hhhomes-setup-macos-arm"
else
    echo "✗ macOS ARM build failed"
fi

echo ""
echo "Build complete!"
echo ""
echo "Executables created:"
echo "  - hhhomes-setup-windows.exe (Windows)"
echo "  - hhhomes-setup-linux (Linux)"
echo "  - hhhomes-setup-macos-intel (macOS Intel)"
echo "  - hhhomes-setup-macos-arm (macOS Apple Silicon)"
