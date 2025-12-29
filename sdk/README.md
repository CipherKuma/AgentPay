# AgentPay Python SDK

Python SDK for [AgentPay](https://agentpay.io) - AI compute marketplace with x402 micropayments on Movement.

## Installation

```bash
pip install agentpay
```

For development:

```bash
pip install agentpay[dev]
```

## Quick Start

### Without Payment (Free Endpoints)

```python
from agentpay import AgentPayClient

client = AgentPayClient(endpoint="http://localhost:4402")

# List available models (free)
models = client.list_models()
for model in models:
    print(f"{model.id}: {model.price_per_unit} per {model.unit}")

# Check server health
if client.health_check():
    print("Server is healthy")
```

### With Automatic x402 Payment

```python
import os
from agentpay import AgentPayClient, InferenceRequest, ChatMessage

# Initialize client with wallet
client = AgentPayClient(
    endpoint="http://localhost:4402",
    private_key=os.environ["MOVEMENT_PRIVATE_KEY"],
    network="movement-testnet",  # or "movement-mainnet"
    auto_pay=True,
)

# Run inference - payment is automatic!
response = client.inference(InferenceRequest(
    model="gpt-4o-mini",
    messages=[ChatMessage(role="user", content="Hello!")],
    max_tokens=256,
))

print(response.choices[0].message.content)
print(f"Cost: {response.cost.total_cost} {response.cost.currency}")
```

## x402 Payment Integration

The SDK supports automatic x402 payments on Movement network.

### Setting Up a Wallet

1. Generate or use an existing Movement wallet with MOVE tokens
2. Export the private key (32 bytes, hex-encoded)
3. Store securely as an environment variable

```python
import os
from agentpay import AgentPayClient

client = AgentPayClient(
    endpoint="http://localhost:4402",
    private_key=os.environ.get("MOVEMENT_PRIVATE_KEY"),
    network="movement-testnet",
    auto_pay=True,
)
```

### Manual Payment Handling

For more control over payments:

```python
from agentpay import AgentPayClient, X402PaymentHandler, PaymentRequired

# Client without auto-pay
client = AgentPayClient(endpoint="http://localhost:4402", auto_pay=False)

# Create payment handler separately
payment = X402PaymentHandler(
    private_key=os.environ["MOVEMENT_PRIVATE_KEY"],
    network="movement-testnet",
)

try:
    response = client.inference(request)
except PaymentRequired as e:
    print(f"Payment required: {e.price} {e.currency}")
    print(f"Pay to: {e.pay_to}")
    print(f"Your address: {payment.address}")
```

### Using X402PaymentHandler Directly

```python
from agentpay import X402PaymentHandler

# Initialize handler
handler = X402PaymentHandler(
    private_key="0x...",
    network="movement-testnet",
)

# Get wallet address
print(f"Address: {handler.address}")
print(f"Public key: {handler.public_key}")

# Build payment header manually
header = handler.build_payment_header(
    pay_to="0xrecipient...",
    amount="100000",  # In octas
    resource="https://facilitator.x402.org",
)

# Use in HTTP request
headers = {"X-PAYMENT": header}
```

## API Reference

### Inference

```python
from agentpay import InferenceRequest, ChatMessage

# Full request
response = client.inference(InferenceRequest(
    model="gpt-4o-mini",
    messages=[
        ChatMessage(role="system", content="You are helpful."),
        ChatMessage(role="user", content="Hello!")
    ],
    max_tokens=256,
    temperature=0.7,
))

# Convenience method
response = client.chat(
    model="gpt-4o-mini",
    messages=[ChatMessage(role="user", content="Hi!")],
)

print(response.choices[0].message.content)
```

### Image Generation

```python
from agentpay import ImageGenerationRequest

response = client.generate_image(ImageGenerationRequest(
    prompt="A sunset over mountains",
    model="sdxl",
    size="1024x1024",
))

print(f"Image: {response.data[0].url}")
print(f"Cost: {response.cost.total_cost}")
```

### Compute Jobs

```python
from agentpay import ComputeRunRequest, GpuConfig

# Get available GPUs
gpu_types = client.get_gpu_types()
for gpu in gpu_types:
    print(f"{gpu.type}: ${gpu.price_per_hour}/hr")

# Start compute job
job = client.run_compute(ComputeRunRequest(
    image="nvidia/cuda:12.0",
    command=["python", "train.py"],
    gpu=GpuConfig(type="A100", count=1),
    timeout_seconds=3600,
))

print(f"Job ID: {job.id}")

# Check status
status = client.get_job_status(job.id)
print(f"Status: {status.status}")
```

## Error Handling

```python
from agentpay import (
    PaymentRequired,
    APIError,
    JobNotFoundError,
)

try:
    response = client.inference(request)
except PaymentRequired as e:
    print(f"Payment needed: {e.price} {e.currency}")
    print(f"Network: {e.network}")
except APIError as e:
    print(f"API error [{e.code}]: {e.message}")
except JobNotFoundError as e:
    print(f"Job not found: {e.job_id}")
```

## Configuration

```python
client = AgentPayClient(
    endpoint="http://localhost:4402",  # Server URL
    timeout=30.0,                       # Request timeout
    private_key="0x...",                # Movement private key
    network="movement-mainnet",         # Network to use
    auto_pay=True,                      # Auto-pay on 402
)
```

### Environment Variables

```bash
# Server endpoint
export AGENTPAY_ENDPOINT=http://localhost:4402

# Movement wallet (KEEP SECRET!)
export MOVEMENT_PRIVATE_KEY=0x...

# Network
export MOVEMENT_NETWORK=movement-testnet
```

## Development

```bash
# Clone repository
git clone https://github.com/agentpay/agentpay-sdk
cd agentpay-sdk/sdk

# Install with dev dependencies
pip install -e ".[dev]"

# Run unit tests
pytest tests/ -k "not integration"

# Run integration tests (requires server)
export AGENTPAY_ENDPOINT=http://localhost:4402
export AGENTPAY_PRIVATE_KEY=0x...
pytest tests/ -k integration -v
```

## Security Notes

- **Never commit private keys** - use environment variables
- **Use testnet first** - verify transactions before mainnet
- **Monitor spending** - set up alerts for wallet activity
- Keys are never logged by the SDK

## License

MIT
