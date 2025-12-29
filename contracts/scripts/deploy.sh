#!/bin/bash
# Deploy AgentPay treasury contract to Movement testnet

set -e

echo "=== AgentPay Treasury Deployment ==="
echo ""

# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "Error: aptos CLI not found. Install with:"
    echo "  curl -fsSL https://aptos.dev/scripts/install_cli.py | python3"
    exit 1
fi

# Check for profile
PROFILE="${1:-testnet}"
echo "Using profile: $PROFILE"
echo ""

# Compile first
echo "=== Compiling contracts ==="
aptos move compile --named-addresses AgentPay=default

if [ $? -ne 0 ]; then
    echo "Compilation failed!"
    exit 1
fi

echo ""
echo "=== Publishing to $PROFILE ==="
aptos move publish \
    --profile "$PROFILE" \
    --named-addresses AgentPay=default \
    --assume-yes

if [ $? -ne 0 ]; then
    echo "Deployment failed!"
    exit 1
fi

echo ""
echo "=== Deployment successful! ==="
echo ""
echo "Next steps:"
echo "1. Initialize the treasury:"
echo "   aptos move run --function-id default::treasury::initialize --profile $PROFILE"
echo ""
echo "2. Verify deployment:"
echo "   aptos move view --function-id default::treasury::is_initialized --args address:YOUR_ADDR --profile $PROFILE"
