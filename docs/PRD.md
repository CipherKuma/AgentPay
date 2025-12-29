# PRD: AgentPay — Agent Compute Broker with x402 Payments

## Track: Best x402 App on Movement

---

## Executive Summary

AgentPay is a decentralized compute marketplace where AI agents pay for GPU/inference/data services via x402 micropayments on Movement. It aggregates providers (Akash, Render, Together AI, etc.) behind a unified API with pay-per-request billing.

---

## Problem Statement

AI agents need to autonomously acquire compute, but:

1. **No payment rails:** Agents can't use credit cards or subscriptions
2. **Minimum payments too high:** $5-20 minimums for API credits
3. **Account friction:** Each provider needs separate setup
4. **No aggregation:** No single API for multiple providers
5. **Overpayment:** Subscriptions waste money on unused capacity

**x402 solves this:** HTTP 402 enables pay-per-request without accounts, minimums, or subscriptions.

---

## Solution Overview

### Core Concept

```
AI Agent → AgentPay API → 402 Payment Required → Pay via Movement → Get compute
```

### What We Aggregate

| Category | Providers | Use Case |
|----------|-----------|----------|
| **GPU Compute** | Akash, Render, Vast.ai | Training, batch inference |
| **LLM Inference** | Together AI, Groq, Fireworks | Text generation |
| **Image Gen** | Replicate, Stability | Image/video generation |
| **Data/RAG** | Pinecone, Weaviate | Vector search |
| **Web Scraping** | Browserless, ScrapingBee | Data collection |

### Flow Example

```
1. Agent: GET /v1/inference?model=llama-3-70b&prompt=Hello
2. Server: 402 Payment Required
   {
     "price": "0.0001",
     "currency": "USDC",
     "network": "movement",
     "accepts": ["exact", "upto"]
   }
3. Agent: Signs payment with embedded wallet
4. Agent: Retries request with X-PAYMENT header
5. Server: Verifies payment, routes to cheapest provider
6. Server: 200 OK + inference result
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI Agents / Clients                              │
│  (Claude, GPT, AutoGPT, Custom Agents, Human Developers)                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        AgentPay Gateway                               │
│                    (Node.js + x402 Middleware)                          │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Pricing   │  │   Routing   │  │   Caching   │  │  Metering   │   │
│  │   Engine    │  │   Engine    │  │   Layer     │  │   & Logs    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  x402 Facilitator │    │  Movement Chain   │    │  Provider APIs   │
│  (Payment Verify) │    │  (Settlement)     │    │                  │
└──────────────────┘    └──────────────────┘    │  ┌────────────┐  │
                                                 │  │  Together  │  │
                                                 │  │  AI        │  │
                                                 │  └────────────┘  │
                                                 │  ┌────────────┐  │
                                                 │  │  Akash     │  │
                                                 │  │  Network   │  │
                                                 │  └────────────┘  │
                                                 │  ┌────────────┐  │
                                                 │  │  Replicate │  │
                                                 │  └────────────┘  │
                                                 │  ┌────────────┐  │
                                                 │  │  ...more   │  │
                                                 │  └────────────┘  │
                                                 └──────────────────┘
```

### API Design

#### Unified Inference Endpoint

```typescript
// POST /v1/inference
// or GET /v1/inference?model=...&prompt=...

interface InferenceRequest {
  model: string;           // "llama-3-70b", "gpt-4", "claude-3"
  prompt: string;          // or messages array
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;

  // Routing preferences
  provider?: string;       // Force specific provider
  max_latency_ms?: number; // Route to fastest
  max_price?: number;      // Route to cheapest under threshold
}

interface InferenceResponse {
  id: string;
  model: string;
  provider: string;        // Which provider was used
  output: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: {
    amount: string;        // "0.00012"
    currency: string;      // "USDC"
    tx_hash: string;       // Movement tx
  };
  latency_ms: number;
}
```

#### Image Generation Endpoint

```typescript
// POST /v1/images/generate

interface ImageRequest {
  prompt: string;
  model?: string;          // "sdxl", "dalle-3", "midjourney"
  size?: string;           // "1024x1024"
  n?: number;              // Number of images
}

interface ImageResponse {
  images: {
    url: string;
    b64_json?: string;
  }[];
  cost: Cost;
}
```

#### GPU Compute Endpoint

```typescript
// POST /v1/compute/run

interface ComputeRequest {
  image: string;           // Docker image
  command: string[];
  env?: Record<string, string>;
  gpu?: {
    type: string;          // "A100", "H100", "4090"
    count: number;
  };
  timeout_seconds: number;
}

interface ComputeResponse {
  job_id: string;
  status: "running" | "completed" | "failed";
  output?: string;
  logs?: string;
  cost: Cost;
}
```

### x402 Integration

```typescript
// Express middleware using @x402/express

import { paymentMiddleware } from "@x402/express";

app.use(
  paymentMiddleware({
    "POST /v1/inference": {
      price: dynamicPricing,  // Function that returns price
      network: "movement",
      currency: "USDC",
      recipient: TREASURY_ADDRESS,
      description: "LLM inference request"
    },
    "POST /v1/images/generate": {
      price: "0.01",          // Fixed price per image
      network: "movement",
      currency: "USDC",
      recipient: TREASURY_ADDRESS,
      description: "Image generation"
    },
    "POST /v1/compute/run": {
      price: computePricing,   // Per-second GPU pricing
      network: "movement",
      currency: "USDC",
      recipient: TREASURY_ADDRESS,
      description: "GPU compute job"
    }
  })
);

// Dynamic pricing based on model
function dynamicPricing(req: Request): string {
  const model = req.body.model;
  const tokens = estimateTokens(req.body.prompt, req.body.max_tokens);

  const prices: Record<string, number> = {
    "llama-3-8b": 0.00001,    // $0.01 per 1K tokens
    "llama-3-70b": 0.0001,    // $0.10 per 1K tokens
    "claude-3-opus": 0.0015,  // $1.50 per 1K tokens
  };

  const pricePerToken = prices[model] || 0.0001;
  return (pricePerToken * tokens / 1000).toFixed(6);
}
```

### Routing Engine

```typescript
interface Provider {
  id: string;
  name: string;
  endpoint: string;
  models: string[];
  pricing: Record<string, number>;  // price per 1K tokens
  latency_p50: number;              // ms
  availability: number;             // 0-1
  priority: number;                 // lower = preferred
}

class RoutingEngine {
  private providers: Provider[];

  selectProvider(request: InferenceRequest): Provider {
    const eligible = this.providers.filter(p =>
      p.models.includes(request.model) &&
      p.availability > 0.95
    );

    if (request.max_latency_ms) {
      return eligible
        .filter(p => p.latency_p50 < request.max_latency_ms)
        .sort((a, b) => a.pricing[request.model] - b.pricing[request.model])[0];
    }

    if (request.max_price) {
      return eligible
        .filter(p => p.pricing[request.model] < request.max_price)
        .sort((a, b) => a.latency_p50 - b.latency_p50)[0];
    }

    // Default: cheapest
    return eligible
      .sort((a, b) => a.pricing[request.model] - b.pricing[request.model])[0];
  }
}
```

### Movement Smart Contract (Optional Treasury)

```move
module AgentPay::treasury {
    use aptos_framework::coin;
    use aptos_framework::event;

    struct Treasury has key {
        balance: coin::Coin<USDC>,
        total_revenue: u64,
        total_payouts: u64,
        provider_shares: vector<ProviderShare>
    }

    struct ProviderShare has store, drop {
        provider_id: String,
        address: address,
        share_bps: u64,  // basis points (10000 = 100%)
        pending_payout: u64
    }

    struct PaymentReceived has drop, store {
        payer: address,
        amount: u64,
        service: String,
        provider: String,
        timestamp: u64
    }

    // Called by facilitator after payment verified
    public entry fun record_payment(
        admin: &signer,
        payer: address,
        amount: u64,
        service: String,
        provider_id: String
    ) acquires Treasury {
        // Record revenue
        // Allocate provider share
        // Emit event
    }

    // Providers claim their earnings
    public entry fun claim_provider_payout(
        provider: &signer
    ) acquires Treasury {
        // Transfer pending payout to provider
    }
}
```

---

## Feature Specifications

### MVP (Hackathon Scope)

| Feature | Priority | Effort |
|---------|----------|--------|
| x402 payment middleware | P0 | Medium |
| LLM inference endpoint (1 provider) | P0 | Low |
| Dynamic pricing | P0 | Low |
| Basic routing (cheapest) | P0 | Low |
| Movement testnet settlement | P0 | Medium |
| Simple dashboard | P0 | Medium |

### Post-MVP

| Feature | Priority | Effort |
|---------|----------|--------|
| Multi-provider routing | P1 | Medium |
| Image generation | P1 | Low |
| GPU compute | P1 | High |
| Streaming responses | P1 | Medium |
| Usage analytics | P1 | Medium |
| Provider onboarding | P2 | Medium |
| Self-service dashboard | P2 | High |

---

## Pricing Strategy

### Our Margin Model

```
Customer pays: Provider cost + 15% margin + gas

Example (Llama 3 70B):
- Provider cost: $0.10 / 1K tokens
- Our margin: $0.015 / 1K tokens (15%)
- Gas (Movement): ~$0.0001
- Customer pays: $0.1151 / 1K tokens
```

### Competitive Pricing

| Service | Provider Direct | AgentPay | Premium |
|---------|-----------------|-------------|---------|
| Llama 3 70B | $0.10/1K | $0.115/1K | 15% |
| GPT-4 | $3.00/1K | $3.45/1K | 15% |
| SDXL Image | $0.003/img | $0.0035/img | 17% |
| A100 GPU/hr | $2.50/hr | $2.90/hr | 16% |

### Why Pay Premium?

1. **No account setup** — Just pay and use
2. **No minimums** — Pay for exactly what you use
3. **Unified API** — One integration, all providers
4. **Smart routing** — Always cheapest/fastest
5. **Agent-native** — x402 built for AI

---

## User Flows

### Agent Developer Integration

```python
# Python SDK usage

from AgentPay import Client

client = Client(
    wallet_private_key="0x...",  # Movement wallet
    network="mainnet"
)

# Simple inference
response = client.inference(
    model="llama-3-70b",
    prompt="Explain quantum computing"
)
print(response.output)
print(f"Cost: ${response.cost.amount} USDC")

# With routing preferences
response = client.inference(
    model="llama-3-70b",
    prompt="...",
    max_latency_ms=500,  # Fast response
)

# Streaming
for chunk in client.inference_stream(model="llama-3-70b", prompt="..."):
    print(chunk.text, end="")
```

### Direct HTTP (No SDK)

```bash
# Step 1: Make request
curl -X POST https://api.AgentPay.xyz/v1/inference \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3-70b", "prompt": "Hello"}'

# Response: 402 Payment Required
# {
#   "price": "0.00012",
#   "currency": "USDC",
#   "network": "movement",
#   "payTo": "0xabc..."
# }

# Step 2: Sign payment and retry
curl -X POST https://api.AgentPay.xyz/v1/inference \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <signed_payment_payload>" \
  -d '{"model": "llama-3-70b", "prompt": "Hello"}'

# Response: 200 OK with inference result
```

---

## Technical Requirements

### Backend Stack
- **Runtime:** Node.js 20+ / Bun
- **Framework:** Express or Hono
- **x402:** @x402/express middleware
- **Database:** PostgreSQL (usage logs, analytics)
- **Cache:** Redis (rate limiting, session)
- **Queue:** BullMQ (async jobs)

### Provider Integrations
- Together AI API
- Replicate API
- Akash Network SDK
- OpenAI-compatible endpoints

### Movement Integration
- Movement TypeScript SDK
- x402 facilitator (public or self-hosted)
- USDC on Movement

### Infrastructure
- **API:** Railway / Fly.io (multi-region)
- **Database:** Supabase / Neon
- **Monitoring:** Datadog / Grafana

---

## Success Metrics

### Hackathon Demo

| Metric | Target |
|--------|--------|
| x402 flow working | ✓ |
| At least 1 provider integrated | ✓ |
| Dynamic pricing | ✓ |
| Live on testnet | ✓ |
| Demo video | ✓ |

### Post-Launch

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| API requests | 10,000 | 100,000 | 1,000,000 |
| Unique agents | 100 | 1,000 | 10,000 |
| GMV | $500 | $10,000 | $100,000 |
| Revenue (15%) | $75 | $1,500 | $15,000 |
| Providers | 3 | 10 | 25 |

---

## Go-To-Market Strategy

### Phase 1: Developer Preview (Hackathon + 4 weeks)
- Movement developer community
- AI agent builders (AutoGPT, BabyAGI communities)
- x402 ecosystem projects

### Phase 2: Agent Framework Integrations (Month 2-3)
- LangChain tool integration
- AutoGPT plugin
- CrewAI integration
- Dify marketplace

### Phase 3: Provider Partnerships (Month 3-6)
- Akash Network partnership
- Together AI integration
- Render Network
- Bring providers to Movement

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Provider API changes | Medium | Medium | Abstract provider layer, monitor |
| x402 adoption slow | Medium | High | Support other payment methods |
| Price undercutting | Medium | Medium | Focus on UX, not just price |
| Provider downtime | Low | High | Multi-provider redundancy |
| Movement issues | Low | High | Support multiple chains |

---

## Development Timeline

### Week 1: Core Infrastructure
- [ ] Express server with x402 middleware
- [ ] Together AI integration
- [ ] Dynamic pricing engine
- [ ] Basic routing

### Week 2: Movement Integration
- [ ] Movement SDK setup
- [ ] Testnet deployment
- [ ] Payment verification
- [ ] Treasury contract (optional)

### Week 3: Dashboard & Polish
- [ ] Simple admin dashboard
- [ ] Usage analytics
- [ ] Documentation
- [ ] Python SDK

### Week 4: Demo & Submission
- [ ] Demo video
- [ ] Pitch deck
- [ ] Bug fixes
- [ ] Submission

---

## Why This Wins

### Perfect x402 Fit
- **Not just a paywall** — Dynamic pricing, routing, aggregation
- **Clear user benefit** — Agents can finally pay for compute
- **Obvious revenue** — 15% margin on every request

### Movement Advantages
- **Sub-second finality** — No waiting for payments
- **Low gas** — Micropayments viable
- **Growing ecosystem** — First mover in Movement compute

### Market Timing
- AI agent explosion (2024-2025)
- x402 just launched
- No competitors yet

---

## Appendix

### Provider Comparison

| Provider | Strengths | Weaknesses |
|----------|-----------|------------|
| Together AI | Fast, cheap LLMs | Limited models |
| Replicate | Huge model variety | Higher latency |
| Akash | Cheapest GPU | Setup complexity |
| Groq | Fastest inference | Limited availability |

### SDK Design

```typescript
// @AgentPay/sdk

export class AgentPayClient {
  constructor(config: {
    privateKey: string;
    network: "mainnet" | "testnet";
    endpoint?: string;
  });

  // LLM
  inference(params: InferenceParams): Promise<InferenceResponse>;
  inferenceStream(params: InferenceParams): AsyncIterable<StreamChunk>;

  // Images
  generateImage(params: ImageParams): Promise<ImageResponse>;

  // Compute
  runJob(params: ComputeParams): Promise<ComputeResponse>;
  getJobStatus(jobId: string): Promise<JobStatus>;

  // Account
  getBalance(): Promise<string>;
  getUsage(period: "day" | "week" | "month"): Promise<UsageStats>;
}
```

### Team Requirements
- 1 Backend developer (Node.js, API design)
- 1 Full-stack developer (dashboard, SDK)
- 1 Blockchain developer (Movement, x402)
