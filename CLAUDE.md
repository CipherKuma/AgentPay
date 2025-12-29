# AgentPay - Agent Compute Broker with x402 Payments

AgentPay is a decentralized compute marketplace where AI agents pay for GPU/inference/data services via x402 micropayments on Movement. It aggregates providers (Akash, Render, Together AI, etc.) behind a unified API with pay-per-request billing.

---

## Git Configuration (MANDATORY)

**ALWAYS use these credentials for ALL commits and pushes:**

| Setting | Value |
|---------|-------|
| **User Name** | `gabrielantonyxaviour` |
| **User Email** | `gabrielantony56@gmail.com` |

Before making any commits, ALWAYS run:
```bash
git config user.name "gabrielantonyxaviour"
git config user.email "gabrielantony56@gmail.com"
```

**DO NOT use any other git identity for this project.**

---

## Critical Rules

**NEVER mock or create placeholder code.** If blocked, STOP and explain why.

- No scope creep - only implement what's requested
- No assumptions - ask for clarification
- Follow existing patterns in codebase
- Verify work before completing
- Use conventional commits (`feat:`, `fix:`, `refactor:`)

---

## File Size Limits (CRITICAL)

**HARD LIMIT: 300 lines per file maximum. NO EXCEPTIONS.**

Files over 300 lines (~25000 tokens) CANNOT be read by AI tools and block development.

### Limits by File Type

| File Type | Max Lines | Purpose |
|-----------|-----------|---------|
| Route handlers | 150 | API endpoint logic |
| Middleware | 100 | Request processing |
| Services | 250 | Business logic |
| Types/interfaces | 100 | Type definitions |
| Config files | 100 | Configuration |
| Move modules | 300 | Smart contracts |
| Tests | 250 | Test files |

### When to Decompose

| Trigger | Action |
|---------|--------|
| File > 300 lines | MUST decompose immediately |
| Route handler > 150 lines | Extract to service |
| Multiple providers in one file | Split into separate files |
| Complex logic | Extract to utility functions |

---

## Documentation Lookup (MANDATORY)

**ALWAYS use Context7 MCP for documentation. NEVER use WebFetch for docs.**

Context7 is the ONLY reliable way to get up-to-date SDK/library documentation.

### How to Use Context7

```
1. First resolve the library ID:
   mcp__context7__resolve-library-id({ libraryName: "express" })

2. Then fetch the docs:
   mcp__context7__get-library-docs({
     context7CompatibleLibraryID: "/expressjs/express",
     topic: "middleware",
     mode: "code"
   })
```

### Common Libraries in This Project

| Library | Context7 ID | Use Case |
|---------|-------------|----------|
| Express | `/expressjs/express` | HTTP server |
| Hono | `/honojs/hono` | Alternative HTTP server |
| Movement SDK | Look up via resolve | Blockchain interactions |
| x402 | Look up via resolve | Payment middleware |

### DO NOT

- **NEVER use WebFetch for documentation** - It's unreliable
- **NEVER guess SDK usage** - Always verify with Context7 first
- **NEVER assume API signatures** - Look them up via Context7

---

## Skills (LOAD BEFORE STARTING TASKS)

**IMPORTANT: Always load the appropriate skill BEFORE starting any task.**

### Required Skills by Task Type

| Task Type | Required Skill | Examples |
|-----------|----------------|----------|
| **API Development** | `api-dev` | Routes, middleware, x402 integration |
| **Provider Integration** | `provider-integration` | Together AI, Replicate, Akash |
| **Move Contracts** | `move-dev` | Treasury, payment tracking |
| **Dashboard UI** | `dashboard-dev` | Admin dashboard, analytics |
| **Testing** | `testing` | Unit tests, integration tests |
| **Strategic Planning** | `strategy` | NO-CODE mode, breaking goals into prompts |

---

## Multi-Prompt System

This project uses a multi-session prompt system for complex features.

### How It Works

1. **`/strategy <goal>`** - Enter planning mode, breaks goal into executable prompts
2. **Prompts written to `prompts/`** - As `1.md`, `2.md`, `3.md`, etc.
3. **Run prompts in fresh sessions** - "run prompt 1"
4. **Report completion** - "completed prompt 1"
5. **Strategy session generates next batch** - Until goal is complete

---

## Repository Structure

```
AgentPay/
├── docs/                       # Documentation
│   └── PRD.md                  # Product Requirements Document
├── server/                     # Node.js API server
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── routes/            # API routes
│   │   │   ├── inference.ts   # /v1/inference endpoint
│   │   │   ├── images.ts      # /v1/images/generate endpoint
│   │   │   └── compute.ts     # /v1/compute/run endpoint
│   │   ├── middleware/        # Express middleware
│   │   │   ├── x402.ts        # x402 payment middleware
│   │   │   └── pricing.ts     # Dynamic pricing logic
│   │   ├── providers/         # Provider integrations
│   │   │   ├── together.ts    # Together AI
│   │   │   ├── replicate.ts   # Replicate
│   │   │   └── types.ts       # Provider interfaces
│   │   ├── routing/           # Routing engine
│   │   │   └── engine.ts      # Provider selection logic
│   │   ├── services/          # Business logic
│   │   └── config/            # Configuration
│   ├── package.json
│   └── tsconfig.json
├── contracts/                  # Move smart contracts
│   ├── sources/
│   │   └── treasury.move      # Treasury module
│   ├── tests/
│   └── Move.toml
├── dashboard/                  # Admin dashboard (optional)
│   ├── src/
│   └── package.json
├── sdk/                        # Client SDK
│   ├── src/
│   │   └── client.ts          # AgentPayClient
│   └── package.json
├── prompts/                    # Generated prompts (strategy system)
├── .claude/                    # Claude configuration
│   ├── commands/              # Slash commands
│   └── skills/                # Skill definitions
└── .env.example               # Environment template
```

---

## Tech Stack

### Backend
- **Runtime:** Node.js 20+ or Bun
- **Framework:** Express or Hono
- **Language:** TypeScript
- **x402:** @x402/express middleware

### Blockchain
- **Chain:** Movement (Move-based)
- **Language:** Move
- **SDK:** Movement TypeScript SDK

### Database (optional)
- **Primary:** PostgreSQL
- **Cache:** Redis

---

## Core Concepts

### x402 Payment Flow

```
1. Client sends request to /v1/inference
2. x402 middleware checks for X-PAYMENT header
3. If missing: Return 402 with price info
4. If present: Verify payment, proceed
5. Route to cheapest eligible provider
6. Return response with cost info
```

### Provider Routing

```typescript
// Routing priorities:
// 1. Filter by model support
// 2. Filter by availability (>95%)
// 3. If max_latency_ms: filter by latency, sort by price
// 4. If max_price: filter by price, sort by latency
// 5. Default: sort by price (cheapest first)
```

### Pricing Strategy

```
Customer pays = Provider cost + 15% margin + gas

Example (Llama 3 70B):
- Provider cost: $0.10 / 1K tokens
- Our margin: $0.015 / 1K tokens
- Customer pays: $0.115 / 1K tokens
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/inference` | POST | LLM text generation |
| `/v1/images/generate` | POST | Image generation |
| `/v1/compute/run` | POST | GPU compute jobs |
| `/v1/providers` | GET | List available providers |
| `/v1/models` | GET | List available models |
| `/health` | GET | Health check |

---

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Movement
MOVEMENT_RPC_URL=https://...
TREASURY_ADDRESS=0x...

# x402
X402_FACILITATOR_URL=https://...
X402_PRIVATE_KEY=0x...

# Providers
TOGETHER_API_KEY=...
REPLICATE_API_TOKEN=...
OPENAI_API_KEY=...

# Database (optional)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/strategy <goal>` | Enter planning mode, generate prompts |
| `/run-prompt <n>` | Execute prompt n from prompts/ |
| `/deploy-server` | Deploy server to production |
| `/deploy-contracts` | Deploy Move contracts |
| `/add-provider` | Add a new compute provider |
| `/debug` | Strategic debugging |

---

## Provider Integration Pattern

Each provider should follow this pattern:

```typescript
// providers/together.ts
import type { Provider, InferenceRequest, InferenceResponse } from './types'

export const togetherProvider: Provider = {
  id: 'together',
  name: 'Together AI',
  models: ['llama-3-8b', 'llama-3-70b', 'mixtral-8x7b'],

  async inference(request: InferenceRequest): Promise<InferenceResponse> {
    // Implementation
  },

  getPricing(model: string): number {
    const prices: Record<string, number> = {
      'llama-3-8b': 0.00001,
      'llama-3-70b': 0.0001,
    }
    return prices[model] || 0.0001
  },

  async healthCheck(): Promise<boolean> {
    // Check provider availability
  }
}
```

---

## Move Contract Pattern

```move
module AgentPay::treasury {
    use aptos_framework::coin;
    use std::string::String;

    struct Treasury has key {
        balance: coin::Coin<USDC>,
        total_revenue: u64,
        total_payouts: u64,
    }

    public entry fun record_payment(
        admin: &signer,
        payer: address,
        amount: u64,
        service: String,
    ) acquires Treasury {
        // Record payment logic
    }
}
```

---

## Testing

### Unit Tests
```bash
cd server && npm test
```

### Integration Tests
```bash
cd server && npm run test:integration
```

### Move Tests
```bash
cd contracts && aptos move test
```

---

## Issues & Learnings System

### Before Starting These Tasks, Read Relevant Issues:

| Task Type | Read First |
|-----------|------------|
| UI/Frontend | `../docs/issues/ui/README.md` |
| Move contracts | `../docs/issues/move/README.md` |
| Indexing/GraphQL | `../docs/issues/indexer/README.md` |
| Movement network | `../docs/issues/movement/README.md` |

### When to Document a New Learning

**DOCUMENT if ALL of these are true:**
1. It caused repeated back-and-forth debugging (wasted user's time)
2. It's non-obvious (you wouldn't naturally avoid it)
3. It will happen again in future projects
4. The fix isn't easily searchable in official docs

**DO NOT document:**
- Basic syntax errors or typos
- Standard patterns you already know
- One-off edge cases unlikely to repeat
- Things covered in official documentation

### How to Add a Learning

1. Determine category: `ui/`, `move/`, `indexer/`, or `movement/`
2. Read the existing README.md in that folder
3. Add new issue following the template format (increment ID)
4. Keep it focused: problem → root cause → solution → prevention

---

## DO NOT

- **Create files over 300 lines** - Decompose immediately
- **Hardcode API keys** - Use environment variables
- **Skip x402 middleware** - All paid endpoints need it
- **Ignore provider errors** - Handle gracefully, fallback to next provider
- **Use synchronous blocking** - Everything should be async

## DO

- **Keep files under 300 lines** - Split early
- **Load skills FIRST** - Before any task
- **Use Context7 for docs** - Always verify SDK patterns
- **Handle all error cases** - Provider failures, payment failures
- **Log everything** - Requests, payments, errors
- **Follow the PRD** - It's the source of truth
