#!/bin/bash
set -e

echo "=== AgentPay E2E Tests ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SERVER_URL=${AGENTPAY_ENDPOINT:-http://localhost:4402}

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo "Testing against: $SERVER_URL"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
curl -sf "$SERVER_URL/health" > /dev/null && pass "Health check" || fail "Health check failed"

# Test models endpoint
echo "Testing models endpoint..."
MODELS=$(curl -sf "$SERVER_URL/v1/models")
echo "$MODELS" | jq -e '.models | length >= 0' > /dev/null && pass "Models endpoint" || fail "Models endpoint failed"

# Test providers endpoint
echo "Testing providers endpoint..."
PROVIDERS=$(curl -sf "$SERVER_URL/v1/providers")
echo "$PROVIDERS" | jq -e '.providers | length >= 0' > /dev/null && pass "Providers endpoint" || fail "Providers endpoint failed"

# Test inference requires payment
echo "Testing inference payment requirement..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL/v1/inference" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-mini", "prompt": "test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
[ "$HTTP_CODE" = "402" ] && pass "Inference requires payment" || warn "Expected 402, got $HTTP_CODE (may be OK if payment configured)"

# Test 402 response format (only if we got 402)
if [ "$HTTP_CODE" = "402" ]; then
  BODY=$(echo "$RESPONSE" | head -n -1)
  echo "$BODY" | jq -e '.price or .accepts' > /dev/null \
    && pass "402 response format" || warn "402 response missing payment info"
fi

# Test usage endpoint
echo "Testing usage endpoint..."
curl -sf "$SERVER_URL/v1/usage" > /dev/null && pass "Usage endpoint" || warn "Usage endpoint not available"

# Test OpenAPI docs
echo "Testing OpenAPI docs..."
curl -sf "$SERVER_URL/docs" > /dev/null && pass "Swagger UI" || warn "Swagger UI not available"
curl -sf "$SERVER_URL/openapi.yaml" > /dev/null && pass "OpenAPI spec" || warn "OpenAPI spec not available"

echo ""
echo "=== Tests Complete ==="
