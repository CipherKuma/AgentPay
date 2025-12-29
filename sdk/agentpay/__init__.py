"""
AgentPay SDK - Python client for AgentPay AI compute marketplace.

AgentPay is a decentralized compute marketplace where AI agents pay for
GPU/inference/data services via x402 micropayments on Movement.

Example:
    from agentpay import AgentPayClient, InferenceRequest, ChatMessage

    client = AgentPayClient()

    # List available models
    models = client.list_models()
    for model in models:
        print(f"{model.id}: {model.price_per_unit} per {model.unit}")

    # Attempt inference (requires x402 payment)
    try:
        response = client.inference(InferenceRequest(
            model="llama-3-8b",
            messages=[ChatMessage(role="user", content="Hello!")]
        ))
    except PaymentRequired as e:
        print(f"Payment required: {e.price} {e.currency}")
"""

from .client import AgentPayClient
from .x402 import X402PaymentHandler
from .types import (
    # Chat/Inference
    ChatMessage,
    InferenceRequest,
    InferenceResponse,
    UsageInfo,
    CostInfo,
    Choice,
    # Image generation
    ImageGenerationRequest,
    ImageGenerationResponse,
    ImageData,
    # Compute
    ComputeRunRequest,
    ComputeRunResponse,
    ComputeJobStatus,
    GpuConfig,
    # Discovery
    ProviderInfo,
    ModelInfo,
    GpuTypeInfo,
    # Payment
    PaymentInfo,
)
from .exceptions import (
    AgentPayError,
    PaymentRequired,
    APIError,
    ValidationError,
    ProviderError,
    TimeoutError,
    JobNotFoundError,
)

__version__ = "0.1.0"

__all__ = [
    # Client
    "AgentPayClient",
    # x402 Payment
    "X402PaymentHandler",
    # Types - Inference
    "ChatMessage",
    "InferenceRequest",
    "InferenceResponse",
    "UsageInfo",
    "CostInfo",
    "Choice",
    # Types - Image
    "ImageGenerationRequest",
    "ImageGenerationResponse",
    "ImageData",
    # Types - Compute
    "ComputeRunRequest",
    "ComputeRunResponse",
    "ComputeJobStatus",
    "GpuConfig",
    # Types - Discovery
    "ProviderInfo",
    "ModelInfo",
    "GpuTypeInfo",
    "PaymentInfo",
    # Exceptions
    "AgentPayError",
    "PaymentRequired",
    "APIError",
    "ValidationError",
    "ProviderError",
    "TimeoutError",
    "JobNotFoundError",
]
