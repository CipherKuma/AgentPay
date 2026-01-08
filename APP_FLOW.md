# AgentPay - Complete App Flow & Testing Guide

## Quick Start Testing

### Prerequisites

1. **Get a Movement Testnet Wallet**
   - Install [Petra](https://petra.app/) or [Pontem](https://pontem.network/) wallet
   - Switch to Movement Testnet
   - Get testnet MOVE from: https://faucet.movementlabs.xyz

2. **Get at least ONE provider API key** (Groq is FREE and recommended):
   - Groq (FREE): https://console.groq.com/keys
   - OpenAI: https://platform.openai.com/api-keys
   - Together AI: https://api.together.xyz/settings/api-keys

---

## Option A: Docker (Recommended)

```bash
# 1. Configure environment
cp server/.env.example server/.env
# Edit: Set MOVEMENT_PAY_TO=<your-wallet-address>
# Edit: Set at least one API key (GROQ_API_KEY recommended)

# 2. Start everything
docker-compose up --build

# Services:
# - Server: http://localhost:4402
# - Frontend: http://localhost:3000
# - API Docs: http://localhost:4402/docs
```

---

## Option B: Manual Startup

**Terminal 1 - Server:**
```bash
cd server
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Testing the Complete Flow

### Step 1: Verify Server Health

```bash
curl http://localhost:4402/health
# Expected: {"status":"ok","version":"1.0.0",...}
```

### Step 2: Check Available Providers & Models

```bash
# List providers
curl http://localhost:4402/v1/providers

# List models
curl http://localhost:4402/v1/models
```

### Step 3: Test x402 Payment Flow (without payment)

```bash
curl -X POST http://localhost:4402/v1/inference \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"Hello"}]}'

# Expected: 402 Payment Required response with pricing info:
# {
#   "x402Version": 1,
#   "accepts": [{
#     "scheme": "exact",
#     "network": "movement-testnet",
#     "maxAmountRequired": "200000",
#     "payTo": "0x...",
#     "asset": "MOVE"
#   }]
# }
```

### Step 4: Test with Python SDK (Auto-Payment)

```bash
cd sdk
pip install -e .
```

Create test script (`test_flow.py`):
```python
from agentpay import AgentPayClient
from agentpay.models import InferenceRequest, Message

client = AgentPayClient(
    endpoint="http://localhost:4402",
    private_key="YOUR_MOVEMENT_PRIVATE_KEY",  # hex string
    network="movement-testnet",
    auto_pay=True  # Automatically handles 402 responses
)

# Test health
print("Health:", client.health_check())

# Test providers
providers = client.list_providers()
print("Providers:", [p.id for p in providers])

# Test inference with auto-payment
response = client.inference(InferenceRequest(
    model="llama-3.1-8b-instant",
    messages=[Message(role="user", content="What is 2+2?")]
))
print("Response:", response.content)
print("Cost:", response.cost)

client.close()
```

```bash
python test_flow.py
```

### Step 5: Test Frontend Dashboard

1. Open http://localhost:3000
2. Connect your wallet (Petra/Pontem)
3. Go to "Test API" tab
4. Select endpoint and test

---

## Complete Payment Flow

```
┌─────────────┐     1. Request (no payment)      ┌─────────────┐
│   Client    │ ──────────────────────────────▶  │   Server    │
│  (SDK/curl) │                                  │  (Express)  │
└─────────────┘                                  └─────────────┘
       │                                                │
       │         2. 402 + pricing info                  │
       │  ◀─────────────────────────────────────────────│
       │                                                │
       ▼                                                │
┌─────────────┐                                         │
│   Sign      │  3. Build X-PAYMENT header             │
│  Payment    │     (ed25519 signature)                │
└─────────────┘                                         │
       │                                                │
       │         4. Retry with X-PAYMENT               │
       │  ─────────────────────────────────────────────▶
       │                                                │
       │                                    ┌───────────┴───────────┐
       │                                    │  5. Validate payment  │
       │                                    │  6. Route to provider │
       │                                    │  7. Execute request   │
       │                                    └───────────┬───────────┘
       │                                                │
       │         8. Response + cost breakdown           │
       │  ◀─────────────────────────────────────────────│
       ▼
┌─────────────┐
│   Done!     │
└─────────────┘
```

---

## API Endpoints Reference

| Endpoint | Method | Protected | Description |
|----------|--------|:---------:|-------------|
| `/health` | GET | - | Server health check |
| `/v1/inference` | POST | x402 | LLM text generation |
| `/v1/images/generate` | POST | x402 | Image generation |
| `/v1/compute/run` | POST | x402 | GPU compute jobs |
| `/v1/compute/:id/status` | GET | - | Job status |
| `/v1/providers` | GET | - | List providers |
| `/v1/models` | GET | - | List models |
| `/v1/usage` | GET | - | Usage stats |
| `/docs` | GET | - | Swagger docs |

---

## Pricing

| Service | Approx Cost | MOVE (octas) |
|---------|-------------|--------------|
| Inference | ~$0.001 | 200,000 |
| Images | ~$0.01 | 2,000,000 |
| Compute | ~$0.05 | 10,000,000 |

*1 MOVE = 100,000,000 octas ≈ $0.50*

---

## Troubleshooting

### "No providers available"
- Check at least one API key is set in `.env`
- Verify key is valid: `curl http://localhost:4402/v1/providers`

### 402 without auto-payment
- SDK needs `auto_pay=True` and valid `private_key`
- Ensure wallet has testnet MOVE tokens

### "Payment validation failed"
- Check `MOVEMENT_PAY_TO` matches expected recipient
- Verify signature is valid (ed25519)
- Ensure `DEMO_MODE=true` for local testing

### Server won't start
- Check `PORT` isn't in use
- Verify Node.js 20+ installed
- Check `npm install` completed

---

## Smart Contracts (Optional)

Deploy to Movement Testnet:
```bash
cd contracts
movement move publish --named-addresses AgentPay=default
```

Run tests:
```bash
cd contracts
movement move test
```

---

## Environment Variables

```bash
# Required
MOVEMENT_PAY_TO=0x...           # Your wallet address (receives payments)
GROQ_API_KEY=gsk_...            # At least one provider key

# Optional
DEMO_MODE=true                  # Skip facilitator (local testing)
PORT=4402                       # Server port
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://...   # Persist usage data
```
