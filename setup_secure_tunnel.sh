#!/bin/bash

# Setup SSH tunnel to MacBook (more secure than exposing port)
# Run this on the client machine

MACBOOK_IP="your-macbook-ip"
MACBOOK_USER="your-username"

# Create persistent SSH tunnel
ssh -f -N -L 8080:localhost:8080 $MACBOOK_USER@$MACBOOK_IP

echo "Secure tunnel established"
echo "Update server accessible at: http://localhost:8080/version"
