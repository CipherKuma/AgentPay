# Deploy Server

Deploy the AgentPay API server.

**Usage:**
```
/deploy-server [environment]
```

**Environments:**
- `staging` - Deploy to staging environment
- `production` - Deploy to production

## Pre-Deploy Checklist

1. **Code Quality**
   - [ ] All tests pass: `npm test`
   - [ ] No TypeScript errors: `npm run typecheck`
   - [ ] No lint errors: `npm run lint`

2. **Environment**
   - [ ] All required env vars set
   - [ ] API keys valid and not expired
   - [ ] Movement RPC URL accessible

3. **Dependencies**
   - [ ] package-lock.json committed
   - [ ] No vulnerable dependencies: `npm audit`

## Deployment Steps

### Railway (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd server
railway up
```

### Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
cd server
fly deploy
```

### Docker

```bash
# Build
docker build -t AgentPay-server .

# Run
docker run -p 3000:3000 --env-file .env AgentPay-server
```

## Post-Deploy Verification

1. **Health Check**
   ```bash
   curl https://<deployed-url>/health
   ```

2. **x402 Flow Test**
   ```bash
   # Should return 402 Payment Required
   curl -X POST https://<deployed-url>/v1/inference \
     -H "Content-Type: application/json" \
     -d '{"model": "llama-3-70b", "prompt": "test"}'
   ```

3. **Provider Health**
   ```bash
   curl https://<deployed-url>/v1/providers
   ```

## Rollback

If issues are found:
```bash
# Railway
railway rollback

# Fly.io
fly releases list
fly deploy --image <previous-image>
```
