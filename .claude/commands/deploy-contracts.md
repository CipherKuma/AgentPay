# Deploy Contracts

Deploy Move smart contracts to Movement network.

**Usage:**
```
/deploy-contracts [network]
```

**Networks:**
- `testnet` - Movement Testnet (default)
- `mainnet` - Movement Mainnet

## Pre-Deploy Checklist

1. **Code Quality**
   - [ ] All Move tests pass: `aptos move test`
   - [ ] Code compiles: `aptos move compile`
   - [ ] No warnings or errors

2. **Environment**
   - [ ] Private key configured
   - [ ] Sufficient balance for gas
   - [ ] Network RPC accessible

## Deployment Steps

### 1. Compile Contracts

```bash
cd contracts
aptos move compile --named-addresses AgentPay=default
```

### 2. Run Tests

```bash
aptos move test --named-addresses AgentPay=default
```

### 3. Deploy to Testnet

```bash
aptos move publish \
  --named-addresses AgentPay=default \
  --profile testnet \
  --assume-yes
```

### 4. Deploy to Mainnet

```bash
aptos move publish \
  --named-addresses AgentPay=default \
  --profile mainnet \
  --assume-yes
```

## Post-Deploy

1. **Verify Deployment**
   - Check module is published
   - Test basic functions

2. **Update Configuration**
   - Update `TREASURY_ADDRESS` in .env
   - Update contract addresses in server config

3. **Initialize Treasury** (if applicable)
   ```bash
   aptos move run \
     --function-id 'AgentPay::treasury::initialize' \
     --profile testnet
   ```

## Contract Addresses

After deployment, record addresses:

| Contract | Testnet | Mainnet |
|----------|---------|---------|
| Treasury | 0x... | 0x... |

## Troubleshooting

### Insufficient Gas
```bash
aptos account fund-with-faucet --account default --amount 100000000
```

### Module Already Exists
Add `--assume-yes` flag to overwrite

### Compilation Errors
Check Move.toml dependencies are correct
