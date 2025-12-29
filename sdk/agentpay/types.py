"""Type definitions for AgentPay SDK."""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


# ==================== Chat/Inference Types ====================


class ChatMessage(BaseModel):
    """A single message in a chat conversation."""

    role: Literal["system", "user", "assistant"]
    content: str


class InferenceRequest(BaseModel):
    """Request for text inference/completion."""

    model: str
    messages: List[ChatMessage]
    max_tokens: Optional[int] = 256
    temperature: Optional[float] = 0.7
    stream: Optional[bool] = False


class UsageInfo(BaseModel):
    """Token usage information."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class CostInfo(BaseModel):
    """Cost breakdown for a request."""

    provider: str
    provider_cost: str
    total_cost: str
    currency: str = "USDC"


class Choice(BaseModel):
    """A single completion choice."""

    index: int
    message: ChatMessage
    finish_reason: str


class InferenceResponse(BaseModel):
    """Response from text inference."""

    id: str
    model: str
    choices: List[Choice]
    usage: UsageInfo
    cost: CostInfo


# ==================== Image Generation Types ====================


class ImageGenerationRequest(BaseModel):
    """Request for image generation."""

    prompt: str
    model: Optional[str] = "sdxl"
    size: Optional[str] = "1024x1024"
    n: Optional[int] = 1


class ImageData(BaseModel):
    """Generated image data."""

    url: Optional[str] = None
    b64_json: Optional[str] = None


class ImageGenerationResponse(BaseModel):
    """Response from image generation."""

    id: str
    created: int
    data: List[ImageData]
    cost: CostInfo


# ==================== Compute Types ====================


class GpuConfig(BaseModel):
    """GPU configuration for compute jobs."""

    type: str = "A100"
    count: int = 1


class ComputeRunRequest(BaseModel):
    """Request to run a compute job."""

    image: str
    command: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    gpu: Optional[GpuConfig] = None
    timeout_seconds: int = 300


class ComputeRunResponse(BaseModel):
    """Response when compute job is created."""

    id: str
    status: Literal["pending", "running", "completed", "failed"]
    estimated_cost: Optional[str] = None
    cost: Optional[CostInfo] = None


class ComputeJobStatus(BaseModel):
    """Status of a compute job."""

    id: str
    status: Literal["pending", "running", "completed", "failed"]
    output: Optional[str] = None
    logs: Optional[str] = None
    duration_seconds: Optional[float] = None
    cost: Optional[str] = None


# ==================== Provider/Model Types ====================


class ProviderInfo(BaseModel):
    """Information about a compute provider."""

    id: str
    name: str
    status: Literal["available", "unavailable", "degraded"]
    models: List[str] = Field(default_factory=list)


class ModelInfo(BaseModel):
    """Information about an available model."""

    id: str
    provider: str
    type: Literal["inference", "image", "compute"]
    price_per_unit: str
    unit: str


class GpuTypeInfo(BaseModel):
    """Information about a GPU type."""

    model_config = ConfigDict(populate_by_name=True)

    type: str
    provider: str
    price_per_hour: float = Field(alias="pricePerHour")


# ==================== Payment Types ====================


class PaymentInfo(BaseModel):
    """Payment information from 402 response."""

    price: str
    currency: str = "USDC"
    network: str = "movement"
    accepts: List[str] = Field(default_factory=lambda: ["exact", "upto"])
    pay_to: Optional[str] = None
