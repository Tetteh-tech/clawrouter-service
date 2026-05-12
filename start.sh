#!/bin/bash

# Use the PORT environment variable Render provides, or default to 8402
# Force the server to listen on 0.0.0.0 by using socat to forward the port
# This works because ClawRouter binds to localhost/127.0.0.1, which is reachable inside the container.

# Check if socat is installed, if not, install it
if ! command -v socat &> /dev/null
then
    echo "socat could not be found, installing..."
    apt-get update && apt-get install -y socat
fi

# Start ClawRouter in the background
/clawrouter start &
CLAWROUTER_PID=$!

# Use socat to forward traffic from 0.0.0.0:$PORT to 127.0.0.1:8402
socat TCP-LISTEN:${PORT:-10000},fork,reuseaddr TCP:127.0.0.1:8402