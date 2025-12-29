# AgentPay

A decentralized compute marketplace where AI agents pay for GPU/inference/data services via x402 micropayments on Movement.

## Overview

AgentPay aggregates AI providers (OpenAI, Together AI, Replicate, etc.) behind a unified API with pay-per-request billing using the x402 payment protocol. Agents can seamlessly pay for inference with MOVE tokens.

### Features

- **Unified API**: OpenAI-compatible API for inference requests
- **x402 Payments**: Pay-per-request with MOVE tokens
- **Provider Routing**: Automatic selection based on price, latency, availability
- **Dynamic Pricing**: Real-time price calculation based on model and token usage
- **Dashboard**: Admin interface for monitoring usage and providers

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│   AgentPay      │────▶│   Providers     │
│  (Client)       │     │   (Broker)      │     │  (OpenAI, etc)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │  x402 Payment         │  Records
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Movement      │     │   Treasury      │
│   Network       │     │   Contract      │
└─────────────────┘     └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- OpenAI API key (or compatible provider)
- Movement wallet for receiving payments

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/agentpay.git
cd agentpay

# Install server dependencies
cd server
npm install

# Copy environment template
cp ../.env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Docker Setup

```bash
# Set environment variables
export MOVEMENT_PAY_TO=0x...your_wallet
export OPENAI_API_KEY=sk-...

# Start all services
docker-compose up -d
```

## API Documentation

Interactive API docs available at `/docs` (Swagger UI).

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/docs` | GET | Swagger UI documentation |
| `/v1/providers` | GET | List available providers |
| `/v1/models` | GET | List available models |
| `/v1/inference` | POST | Run inference (requires x402 payment) |
| `/v1/images/generate` | POST | Generate images (requires x402 payment) |
| `/v1/compute/run` | POST | Run GPU compute job (requires x402 payment) |
| `/v1/compute/{id}/status` | GET | Get compute job status |
| `/v1/usage` | GET | Get usage statistics |
| `/v1/usage/history` | GET | Get payment history |

### Inference Request

```bash
curl -X POST http://localhost:4402/v1/inference \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello, world!"}
    ],
    "max_tokens": 100
  }'
```

Without payment, returns 402 with pricing info:

```json
{
  "error": "Payment Required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "movement-mainnet",
      "maxAmountRequired": "11500",
      "resource": "https://facilitator.x402.org",
      "payTo": "0x..."
    }
  ]
}
```

### x402 Payment Flow

1. Client sends inference request
2. Server calculates price based on model + estimated tokens
3. Returns 402 with payment requirements
4. Client signs x402 payment with MOVE tokens
5. Client resends request with `X-PAYMENT` header
6. Server verifies payment, executes inference, returns result

## Development

### Running Tests

```bash
cd server

# Unit tests
npm test

# Watch mode
npm run test:watch

# Integration tests (requires running server)
npm run test:integration

# Coverage report
npm run test:coverage
```

### Project Structure

```
agentpay/
├── server/              # API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # x402, pricing
│   │   ├── providers/   # Provider integrations
│   │   ├── routing/     # Provider selection
│   │   └── services/    # Business logic
│   └── tests/           # Test files
├── dashboard/           # Admin dashboard (Next.js)
├── contracts/           # Move smart contracts
└── docker-compose.yml   # Docker configuration
```

### Adding a Provider

1. Create provider file in `server/src/providers/`
2. Implement the `Provider` interface
3. Register in `server/src/providers/index.ts`

```typescript
import type { Provider } from './types';

export const myProvider: Provider = {
  id: 'my-provider',
  name: 'My Provider',
  models: ['model-a', 'model-b'],
  
  async inference(request) { /* ... */ },
  getPricing(model) { /* ... */ },
  async healthCheck() { /* ... */ },
};
```

## Python SDK

Install the Python SDK:

```bash
cd sdk
pip install -e .
```

Usage:

```python
from agentpay import AgentPayClient, InferenceRequest, ChatMessage

# With auto-payment
client = AgentPayClient(
    endpoint="http://localhost:4402",
    private_key="0x...",
    auto_pay=True,
)

response = client.inference(InferenceRequest(
    model="gpt-4o-mini",
    messages=[ChatMessage(role="user", content="Hello!")],
))
print(response.output)
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 4402) |
| `MOVEMENT_PAY_TO` | Yes | Wallet address for payments |
| `MOVEMENT_FACILITATOR_URL` | No | x402 facilitator URL |
| `MOVEMENT_RPC_URL` | No | Movement RPC URL |
| `MOVEMENT_TREASURY_ADDRESS` | No | Treasury contract address |
| `MOVEMENT_ADMIN_PRIVATE_KEY` | No | Admin key for treasury |
| `DATABASE_URL` | No | PostgreSQL connection URL |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `TOGETHER_API_KEY` | No | Together AI API key |
| `GROQ_API_KEY` | No | Groq API key |

\* At least one provider API key is required.

## Deployment

### Production with Docker

```bash
docker-compose -f docker-compose.yml up -d
```

### Manual Deployment

```bash
cd server
npm run build
NODE_ENV=production npm start
```

## License

MIT
