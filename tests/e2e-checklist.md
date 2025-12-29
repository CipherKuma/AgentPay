# End-to-End Test Checklist

## Server Startup
- [ ] Server starts without errors
- [ ] All providers register correctly
- [ ] Database connection established (if configured)
- [ ] Health endpoint returns 200

## Free Endpoints
- [ ] GET /v1/models returns model list
- [ ] GET /v1/providers returns provider list with status
- [ ] GET /health returns ok

## Inference Flow
- [ ] POST /v1/inference without payment returns 402
- [ ] 402 response includes correct price, currency, network, payTo
- [ ] POST /v1/inference with valid X-PAYMENT succeeds
- [ ] Response includes output, usage, latency_ms
- [ ] Streaming mode works (stream: true)

## Image Generation Flow
- [ ] POST /v1/images/generate returns 402
- [ ] With payment, returns image URL
- [ ] Cost is correctly calculated

## Compute Flow
- [ ] POST /v1/compute/run returns 402
- [ ] With payment, returns job ID
- [ ] GET /v1/compute/{id}/status returns job status
- [ ] Job progresses: pending → running → completed
- [ ] POST /v1/compute/{id}/cancel cancels job

## Usage Stats
- [ ] GET /v1/usage returns stats
- [ ] Stats are persisted in database (if configured)
- [ ] Filtering by payer works
- [ ] GET /v1/usage/history returns payment history
- [ ] GET /v1/usage/by-service returns breakdown

## Provider Routing
- [ ] Default routing picks cheapest provider
- [ ] max_latency_ms routes to fast provider
- [ ] provider parameter forces specific provider
- [ ] Unhealthy providers are skipped

## API Documentation
- [ ] Swagger UI loads at /docs
- [ ] OpenAPI spec available at /openapi.yaml
- [ ] All endpoints documented

## SDK
- [ ] pip install -e . succeeds
- [ ] Unit tests pass
- [ ] Integration tests pass with running server
- [ ] Auto-pay flow works

## Treasury
- [ ] Payments recorded in database (if configured)
- [ ] If treasury enabled, on-chain recording works
