# Debug

Strategic debugging across server, providers, and contracts.

**Usage:**
```
/debug <issue-description>
```

**Example:**
```
/debug x402 payments not verifying on testnet
```

## Debug Decision Tree

```
What's the issue?
│
├─ x402 Payment Issues
│  ├─ Check facilitator URL is correct
│  ├─ Verify wallet has USDC balance
│  ├─ Check payment signature format
│  └─ Test with x402 debug endpoint
│
├─ Provider Errors
│  ├─ Check API key is valid
│  ├─ Verify model name is correct
│  ├─ Check provider health endpoint
│  └─ Review provider logs
│
├─ Routing Failures
│  ├─ Check provider availability
│  ├─ Verify model is supported
│  ├─ Review routing engine logs
│  └─ Test with specific provider
│
├─ Movement/Contract Issues
│  ├─ Check RPC endpoint
│  ├─ Verify account has gas
│  ├─ Check transaction status
│  └─ Review contract logs
│
└─ Server Errors
   ├─ Check application logs
   ├─ Verify environment variables
   ├─ Test health endpoint
   └─ Check dependencies
```

## Debugging Commands

### Server Logs
```bash
# Local
cd server && npm run dev 2>&1 | tee debug.log

# Production (Railway)
railway logs

# Production (Fly.io)
fly logs
```

### x402 Payment Debug
```bash
# Test payment flow
curl -v -X POST http://localhost:3000/v1/inference \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3-70b", "prompt": "test"}'

# Check if 402 response includes proper payment details
```

### Provider Health
```bash
# Check all providers
curl http://localhost:3000/v1/providers

# Test specific provider
curl -X POST http://localhost:3000/v1/inference \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3-70b", "prompt": "test", "provider": "together"}'
```

### Movement RPC
```bash
# Check connection
curl -X POST $MOVEMENT_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"method": "eth_blockNumber", "params": [], "id": 1}'
```

## Common Issues

### "Payment verification failed"
- Check USDC balance
- Verify payment signature
- Ensure facilitator is reachable

### "No provider available"
- Check all provider API keys
- Run health checks
- Review routing engine config

### "Model not found"
- Verify model name spelling
- Check model is in supported list
- Ensure provider supports model

### "Transaction failed"
- Check gas balance
- Verify contract address
- Review transaction parameters

## Log Locations

| Component | Location |
|-----------|----------|
| Server | `server/logs/` |
| Providers | Inline in server logs |
| Movement | Transaction explorer |
