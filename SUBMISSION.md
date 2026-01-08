# AgentPay

**The Compute Broker for AI Agents — Pay-Per-Request via x402 on Movement**

---

## TL;DR

AgentPay is a decentralized compute marketplace where AI agents pay for GPU/inference/data services via x402 micropayments on Movement. One API, multiple providers, pay only for what you use.

---

## Problem

AI agents are becoming autonomous economic actors, but they can't pay for the resources they need:

| Problem | Impact |
|---------|--------|
| **No payment rails** | Agents can't use credit cards or subscriptions |
| **High minimums** | $5-20 minimum deposits for API credits |
| **Account friction** | Each provider needs separate signup, KYC, API keys |
| **No aggregation** | Developers integrate each provider separately |
| **Overpayment** | Monthly subscriptions waste money on unused capacity |
| **No price optimization** | No automatic routing to cheapest provider |

### The Numbers

- **$4.3B** — AI infrastructure market (2024)
- **$200B** — Projected by 2030
- **10M+** — AI agents expected by 2025
- **$0** — Current autonomous agent payment volume

Agents are the fastest-growing compute consumers, but they have **zero native payment infrastructure**.

---

## Solution

AgentPay solves this with **x402 micropayments on Movement**:

```
AI Agent → AgentPay API → 402 Payment Required → Sign & Pay → Get Compute
```

### What We Built

| Feature | Description |
|---------|-------------|
| **Unified API** | One endpoint for LLMs, images, GPU compute |
| **x402 Payments** | HTTP-native micropayments, no accounts needed |
| **Smart Routing** | Automatic selection of cheapest/fastest provider |
| **Movement Settlement** | Sub-second finality, ~$0.0001 gas fees |
| **Multi-Provider** | Together AI, Groq, Replicate, OpenAI aggregated |
| **Python SDK** | Drop-in client with auto-payment handling |

### Key Innovation

**x402 turns every API call into a paid transaction** — no accounts, no minimums, no subscriptions. The agent's wallet IS its identity.

---

## How It Works

### Payment Flow

```
┌─────────────┐                                    ┌─────────────┐
│   AI Agent  │                                    │  AgentPay   │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  1. POST /v1/inference (no payment)              │
       │ ────────────────────────────────────────────────▶│
       │                                                  │
       │  2. 402 Payment Required                         │
       │     { price: "0.001", payTo: "0x...", ... }      │
       │ ◀────────────────────────────────────────────────│
       │                                                  │
       │  3. Sign payment with ed25519                    │
       │  ┌─────────────────────────────┐                 │
       │  │ Build X-PAYMENT header      │                 │
       │  └─────────────────────────────┘                 │
       │                                                  │
       │  4. Retry with X-PAYMENT header                  │
       │ ────────────────────────────────────────────────▶│
       │                                                  │
       │                        ┌───────────────────────┐ │
       │                        │ 5. Validate payment   │ │
       │                        │ 6. Route to provider  │ │
       │                        │ 7. Execute request    │ │
       │                        └───────────────────────┘ │
       │                                                  │
       │  8. 200 OK + Response + Cost breakdown           │
       │ ◀────────────────────────────────────────────────│
       ▼                                                  ▼
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Agents / Clients                          │
│         (Claude, GPT, AutoGPT, LangChain, Custom)               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AgentPay Gateway                           │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │  x402    │  │ Dynamic  │  │  Smart   │  │ Usage    │       │
│   │ Middleware│  │ Pricing  │  │ Routing  │  │ Tracking │       │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│    Movement     │  │  x402           │  │   Providers         │
│    Blockchain   │  │  Facilitator    │  │                     │
│                 │  │                 │  │  ┌───────────────┐  │
│  ┌───────────┐  │  │  Payment        │  │  │  Together AI  │  │
│  │ Treasury  │  │  │  Verification   │  │  ├───────────────┤  │
│  │ Contract  │  │  │                 │  │  │  Groq         │  │
│  ├───────────┤  │  └─────────────────┘  │  ├───────────────┤  │
│  │ Registry  │  │                       │  │  Replicate    │  │
│  │ Contract  │  │                       │  ├───────────────┤  │
│  └───────────┘  │                       │  │  OpenAI       │  │
└─────────────────┘                       │  └───────────────┘  │
                                          └─────────────────────┘
```

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 / Bun |
| Framework | Express.js |
| Language | TypeScript |
| Payment | x402 Protocol |
| Database | PostgreSQL (optional) |

### Blockchain
| Component | Technology |
|-----------|------------|
| Network | Movement (Testnet/Mainnet) |
| Language | Move |
| Contracts | Treasury, Registry |
| Settlement | MOVE token |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 |
| UI | Tailwind CSS, shadcn/ui |
| Wallet | Aptos Wallet Adapter |
| State | React Hooks |

### SDK
| Component | Technology |
|-----------|------------|
| Language | Python 3.9+ |
| HTTP | httpx (async) |
| Validation | Pydantic |
| Signing | PyNaCl (ed25519) |

---

## API Endpoints

| Endpoint | Method | Description | Price |
|----------|--------|-------------|-------|
| `/v1/inference` | POST | LLM text generation | ~$0.001/req |
| `/v1/images/generate` | POST | Image generation | ~$0.01/img |
| `/v1/compute/run` | POST | GPU compute jobs | ~$0.05/job |
| `/v1/providers` | GET | List providers | Free |
| `/v1/models` | GET | List models | Free |
| `/docs` | GET | Swagger docs | Free |

### Example Request

```bash
# Without payment → 402
curl -X POST http://localhost:4402/v1/inference \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"Hello"}]}'

# Response: 402 Payment Required
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "movement-testnet",
    "maxAmountRequired": "200000",
    "payTo": "0x...",
    "asset": "MOVE"
  }]
}

# With payment → Success
curl -X POST http://localhost:4402/v1/inference \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <signed-payment-header>" \
  -d '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"Hello"}]}'

# Response: 200 OK
{
  "content": "Hello! How can I help you today?",
  "model": "llama-3.1-8b-instant",
  "provider": "groq",
  "cost": { "amount": "200000", "asset": "MOVE" }
}
```

### Python SDK Usage

```python
from agentpay import AgentPayClient
from agentpay.models import InferenceRequest, Message

client = AgentPayClient(
    endpoint="http://localhost:4402",
    private_key="0x...",  # Movement wallet
    auto_pay=True         # Auto-handle 402 responses
)

response = client.inference(InferenceRequest(
    model="llama-3.1-8b-instant",
    messages=[Message(role="user", content="Explain quantum computing")]
))

print(response.content)
print(f"Cost: {response.cost.amount} MOVE")
```

---

## Smart Contracts

### Treasury Module
Tracks all payments, provider earnings, and platform fees on-chain.

```move
module AgentPay::treasury {
    // Record every payment
    public entry fun record_service_payment(
        admin: &signer,
        payer: address,
        provider: address,
        service_id: String,
        amount: u64
    );

    // Providers claim earnings
    public entry fun claim_earnings(
        provider: &signer,
        treasury_addr: address
    );

    // View functions
    public fun get_total_revenue(treasury_addr: address): u64;
    public fun get_provider_earnings(treasury_addr: address, provider: address): u64;
}
```

### Registry Module
On-chain service registry for verification and discovery.

```move
module AgentPay::registry {
    // Register a service
    public entry fun register_service(
        owner: &signer,
        registry_addr: address,
        service_id: String,
        name: String,
        price_per_request: u64
    );

    // Admin verification
    public entry fun verify_service(
        admin: &signer,
        registry_addr: address,
        service_id: String
    );
}
```

---

## Business Model

### Revenue Model

```
Customer Pays = Provider Cost + 15% Margin + Gas

Example (Llama 3.1 8B):
├── Provider cost:  $0.00087
├── Our margin:     $0.00013 (15%)
├── Gas:            ~$0.0001
└── Customer pays:  $0.001
```

### Pricing Comparison

| Service | Direct Provider | AgentPay | Premium |
|---------|-----------------|----------|---------|
| Llama 3 70B | $0.10/1K tokens | $0.115/1K | 15% |
| GPT-4 | $3.00/1K tokens | $3.45/1K | 15% |
| SDXL Image | $0.003/image | $0.0035 | 17% |
| A100 GPU/hr | $2.50/hr | $2.90/hr | 16% |

### Why Pay the Premium?

| Benefit | Value |
|---------|-------|
| No accounts | Just pay and use |
| No minimums | $0.001 minimum spend |
| Unified API | One integration, all providers |
| Smart routing | Always cheapest/fastest |
| Agent-native | Built for autonomous AI |

### Projected Revenue

| Metric | Month 1 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| API Requests | 10,000 | 500,000 | 5,000,000 |
| GMV | $500 | $25,000 | $250,000 |
| Revenue (15%) | $75 | $3,750 | $37,500 |
| Unique Agents | 100 | 2,500 | 25,000 |

---

## Market Opportunity

### Total Addressable Market

| Segment | Size (2024) | Growth |
|---------|-------------|--------|
| AI Infrastructure | $4.3B | 35% CAGR |
| LLM API Market | $1.2B | 45% CAGR |
| GPU Cloud | $3.1B | 30% CAGR |

### Target Customers

1. **AI Agent Developers** — Building autonomous systems that need compute
2. **LangChain/AutoGPT Users** — Framework users needing payment rails
3. **Enterprise AI Teams** — Pay-per-use without procurement
4. **Web3 AI Projects** — Native crypto payment preference

### Competitive Landscape

| Competitor | Limitation | AgentPay Advantage |
|------------|------------|-------------------|
| OpenRouter | Credit card only | Crypto-native, x402 |
| Replicate | Single provider | Multi-provider routing |
| Akash | Complex setup | Simple API |
| Direct APIs | Account per provider | Unified access |

---

## Why Movement?

| Feature | Benefit |
|---------|---------|
| **Sub-second finality** | Instant payment confirmation |
| **~$0.0001 gas** | Micropayments economically viable |
| **Move language** | Secure smart contracts |
| **Growing ecosystem** | First mover advantage |
| **x402 support** | Native payment protocol |

### Movement vs Alternatives

| Chain | Finality | Gas Cost | x402 Support |
|-------|----------|----------|--------------|
| Movement | <1s | ~$0.0001 | Native |
| Ethereum | 12min | $1-50 | Limited |
| Solana | 400ms | $0.00025 | None |
| Base | 2s | $0.01 | Emerging |

---

## Future Scope

### Phase 1: Foundation (Current)
- [x] x402 payment middleware
- [x] Multi-provider routing (Groq, Together, Replicate, OpenAI)
- [x] Python SDK with auto-payment
- [x] Movement testnet deployment
- [x] Dashboard with analytics

### Phase 2: Expansion (Q2 2025)
- [ ] GPU compute marketplace (Akash, Vast.ai)
- [ ] Streaming responses with incremental payments
- [ ] TypeScript/JavaScript SDK
- [ ] Provider self-onboarding portal
- [ ] Movement mainnet deployment

### Phase 3: Intelligence (Q3 2025)
- [ ] AI-powered routing optimization
- [ ] Predictive pricing based on demand
- [ ] Multi-chain support (Base, Solana)
- [ ] Provider reputation system
- [ ] SLA guarantees with slashing

### Phase 4: Ecosystem (Q4 2025)
- [ ] LangChain native integration
- [ ] AutoGPT plugin
- [ ] CrewAI tool
- [ ] Dify marketplace listing
- [ ] White-label solution for enterprises

---

## Differentiation

### Technical Innovation

| Feature | Innovation |
|---------|------------|
| **x402 Native** | First compute marketplace built on x402 |
| **Dynamic Pricing** | Real-time price calculation per request |
| **Smart Routing** | Automatic cheapest/fastest selection |
| **On-chain Treasury** | Transparent revenue tracking |
| **Auto-payment SDK** | Zero-friction agent integration |

### Why We Win

1. **Perfect x402 Fit** — Not just a paywall, a full marketplace
2. **Agent-First Design** — Built for autonomous systems, not humans
3. **Movement Advantage** — Leveraging sub-second finality for micropayments
4. **First Mover** — No direct competitors in crypto-native compute brokerage
5. **Clear Business Model** — 15% margin on every transaction

---

## Conclusion

AgentPay transforms how AI agents access compute:

- **Before:** Accounts, minimums, subscriptions, fragmentation
- **After:** One API, pay-per-request, automatic routing, instant settlement

We're building the **Stripe for AI agents** — powered by x402 and Movement.

**The future of compute is pay-as-you-go. AgentPay makes it possible.**
