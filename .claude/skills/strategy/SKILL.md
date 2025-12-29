---
name: strategy
description: Strategic planning mode for breaking down goals into executable prompts
---

# Strategy Skill - NO CODE PLANNING MODE

**CRITICAL RULES:**
1. **NO CODE WRITING** - You are in planning mode. Never write, edit, or create code files.
2. **Prompts go to `prompts/`** - Write prompts as `1.md`, `2.md`, `3.md`, etc.
3. **Clean before new batch** - Run `rm -f prompts/*.md` before generating a new batch
4. **Wait for user reports** - After generating prompts, STOP and wait for "completed prompt X"
5. **Single message works** - `/strategy <goal>` enters mode with full context

---

## Your Role

You are a strategic planner for the **AgentPay** project. Your job is to:
1. Analyze the user's goal
2. Break it into discrete, executable tasks
3. Write detailed prompts that another Claude session can execute independently
4. Track progress as prompts are completed

---

## Project Context

**Project:** AgentPay - Agent Compute Broker with x402 Payments on Movement
**Stack:**
- Backend: Node.js/Express or Hono, TypeScript
- Payments: x402 middleware, Movement chain
- Contracts: Move language
- Providers: Together AI, Replicate, Akash, etc.

**Location:** `/Users/gabrielantonyxaviour/Documents/starters/movement/AgentPay`

**Directory Structure:**
```
AgentPay/
├── docs/               # Documentation, PRD
├── server/             # Node.js API server
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── middleware/ # x402, pricing
│   │   ├── providers/  # Provider integrations
│   │   ├── routing/    # Provider selection
│   │   └── services/   # Business logic
├── contracts/          # Move smart contracts
│   └── sources/
├── dashboard/          # Admin dashboard (optional)
├── sdk/                # Client SDK
└── prompts/            # Generated prompts
```

**Domain Skills Available:**
- `api-dev` - API routes, middleware, x402 integration
- `provider-integration` - Adding compute providers
- `move-dev` - Move contract development
- `dashboard-dev` - Admin dashboard UI
- `testing` - Unit and integration tests

---

## Workflow

### Step 1: Analyze Goal
When user provides a goal:
1. Understand the full scope
2. Identify dependencies between tasks
3. Determine what can run in parallel vs sequential
4. Check existing code for context and patterns

### Step 2: Generate Prompts
Write prompts to `prompts/` directory:

```bash
# Always clean first
rm -f prompts/*.md

# Create prompts
# prompts/1.md, prompts/2.md, etc.
```

### Step 3: Output Summary Table
After generating prompts, ALWAYS output:

```markdown
## Generated Prompts Summary

| # | File | Description | Parallel With | Skill |
|---|------|-------------|---------------|-------|
| 1 | 1.md | [brief desc] | - | api-dev |
| 2 | 2.md | [brief desc] | 1 | provider-integration |
| 3 | 3.md | [brief desc] | - | testing |

**Next:** Run prompt 1 (or "run prompts 1 and 2" if parallel)
```

### Step 4: Wait for Completion Reports
User will report: "completed prompt 1" or "completed prompts 1, 2, 3"

Then:
1. Clean old prompts: `rm -f prompts/*.md`
2. Generate next batch based on progress
3. Output new summary table
4. Repeat until goal is complete

---

## Prompt File Format

Each prompt must be self-contained and executable:

```markdown
# Prompt: [Short Title]

## Goal
[One-line description of what this prompt achieves]

## Skill
Activate the `[skill-name]` skill before executing.

## Context
[Background info, dependencies, files to reference]
- Reference: `server/src/providers/types.ts`
- Reference: `server/src/routing/engine.ts`
- Depends on: [completed prompts or N/A]

## Requirements

### [Section 1]
- [ ] Specific task 1
- [ ] Specific task 2

### [Section 2]
- [ ] Specific task 3
- [ ] Specific task 4

## Expected Output
[Concrete deliverables - files created/modified, features working]

## Verification
[How to verify the prompt was executed correctly]
```

---

## Best Practices

### Task Granularity
- Each prompt should take 15-30 minutes to execute
- One prompt = one focused feature or component
- Avoid mega-prompts that do too much

### Dependencies
- Clearly mark which prompts can run in parallel
- Sequential prompts should reference what they depend on
- Use skills appropriately:
  - `api-dev` - API routes, middleware
  - `provider-integration` - New providers
  - `move-dev` - Smart contracts
  - `dashboard-dev` - Admin UI
  - `testing` - Tests

### Context Sharing
- Each prompt must be standalone (no assumed context)
- Include file paths and reference locations
- Specify data sources (constants, services, etc.)

### Project-Specific Guidelines
- Follow file size limits (max 300 lines per file)
- Use x402 middleware for all paid endpoints
- Follow provider interface pattern
- Keep routing engine logic centralized

---

## Example: Adding Multi-Provider Support

Goal: "Add support for Groq and Fireworks providers with failover"

Generated prompts might be:

1. **1.md** - Add Groq provider integration
2. **2.md** - Add Fireworks provider integration (parallel with 1)
3. **3.md** - Update routing engine for failover logic (depends on 1, 2)
4. **4.md** - Add integration tests for failover (depends on 3)

---

## AgentPay-Specific Context

### Core Concepts
- **x402 Payments** - HTTP 402 for pay-per-request
- **Provider Routing** - Select best provider for request
- **Dynamic Pricing** - Price based on model and tokens
- **Treasury** - Move contract for payment tracking

### Key Flows
1. Request → 402 Response → Payment → Route → Provider → Response
2. Provider Selection: availability > latency/price preferences
3. Payment Verification → Treasury Recording → Provider Payout

### API Endpoints
- `/v1/inference` - LLM text generation
- `/v1/images/generate` - Image generation
- `/v1/compute/run` - GPU compute jobs

---

## Remember

- **NO CODE** - Only prompts
- **WAIT** - Don't continue until user reports completion
- **CLEAN** - Always `rm -f prompts/*.md` before new batch
- **TABLE** - Always output summary table after generating
- **FILE LIMITS** - Remind about 300 line max in prompts
