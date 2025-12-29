# AgentPay Completion Prompts

These prompts will complete the remaining ~32% of AgentPay to reach 100%.

## Current Status: 68% → Target: 100%

## Prompt Overview

| # | Prompt | Description | Dependencies | Est. Complexity |
|---|--------|-------------|--------------|-----------------|
| 1 | Movement SDK Integration | Connect treasury service to Move contract | None | Medium |
| 2 | Database Layer | PostgreSQL + Drizzle ORM setup | None | Medium |
| 3 | Usage Stats Endpoint | Real usage stats from database | Prompt 2 | Low |
| 4 | Together AI Provider | Direct Together AI integration | None | Low |
| 5 | Groq Provider | Fast inference provider | None | Low |
| 6 | Python SDK Core | Client, models, exceptions | None | Medium |
| 7 | Python SDK Payments | x402 payment handling | Prompt 6 | Medium |
| 8 | Python SDK Tests | Unit & integration tests | Prompts 6, 7 | Low |
| 9 | API Documentation | OpenAPI spec + Swagger UI | None | Low |
| 10 | E2E Testing & Polish | Full integration testing | All above | Medium |

## Execution Order

```
Phase 1 (Infrastructure):
├── Prompt 1: Movement SDK Integration
├── Prompt 2: Database Layer
└── Prompt 3: Usage Stats Endpoint (after 2)

Phase 2 (Providers - can run in parallel):
├── Prompt 4: Together AI Provider
└── Prompt 5: Groq Provider

Phase 3 (SDK):
├── Prompt 6: Python SDK Core
├── Prompt 7: Python SDK Payments (after 6)
└── Prompt 8: Python SDK Tests (after 7)

Phase 4 (Documentation):
└── Prompt 9: API Documentation

Phase 5 (Final):
└── Prompt 10: E2E Testing & Polish (after all)
```

## How to Run

1. Start a fresh Claude session
2. Say: `run prompt 1`
3. When complete, return here and say: `completed prompt 1`
4. Start new session for next prompt
5. Repeat until all 10 prompts are complete

## Parallel Execution

These prompts can run in parallel:
- Prompts 1, 2, 4, 5 (no dependencies between them)
- Prompts 6, 9 (no dependencies between them)

## Issue Documentation

Each prompt includes instructions to:
1. Check relevant `docs/issues/` files before starting
2. Document any new issues encountered using `/document-learning`

## Expected Outcome

After completing all 10 prompts:

| Component | Before | After |
|-----------|--------|-------|
| Movement SDK Integration | 30% | 100% |
| Database Layer | 0% | 100% |
| Usage Stats | 60% | 100% |
| Providers | 60% | 100% |
| Python SDK | 5% | 100% |
| API Documentation | 40% | 100% |
| E2E Testing | 0% | 100% |

**Overall: 68% → 100%**
