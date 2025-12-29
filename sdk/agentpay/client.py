"""AgentPay API client."""

from typing import Optional, List, Dict, Any
import httpx

from .types import (
    InferenceRequest,
    InferenceResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
    ComputeRunRequest,
    ComputeRunResponse,
    ComputeJobStatus,
    ProviderInfo,
    ModelInfo,
    GpuTypeInfo,
    ChatMessage,
)
from .exceptions import (
    PaymentRequired,
    APIError,
    JobNotFoundError,
)
from .x402 import X402PaymentHandler


class AgentPayClient:
    """
    Client for interacting with the AgentPay API with x402 payment support.

    Example:
        # Without auto-payment (will raise PaymentRequired)
        client = AgentPayClient()

        # With auto-payment enabled
        client = AgentPayClient(
            private_key="0x...",
            network="movement-testnet",
            auto_pay=True,
        )

        response = client.inference(InferenceRequest(
            model="llama-3-8b",
            messages=[ChatMessage(role="user", content="Hello!")]
        ))
        print(f"Cost: {response.cost.total_cost}")
    """

    def __init__(
        self,
        endpoint: str = "http://localhost:4402",
        timeout: float = 30.0,
        private_key: Optional[str] = None,
        network: str = "movement-mainnet",
        auto_pay: bool = True,
    ):
        """
        Initialize the AgentPay client.

        Args:
            endpoint: Base URL of the AgentPay server
            timeout: Request timeout in seconds
            private_key: Hex-encoded ed25519 private key for x402 payments
            network: "movement-mainnet" or "movement-testnet"
            auto_pay: Automatically pay when 402 response received
        """
        self.endpoint = endpoint.rstrip("/")
        self.http = httpx.Client(timeout=timeout)
        self.auto_pay = auto_pay
        self.network = network

        if private_key:
            self.payment = X402PaymentHandler(private_key, network)
        else:
            self.payment = None

    def close(self) -> None:
        """Close the HTTP client."""
        self.http.close()

    def __enter__(self) -> "AgentPayClient":
        return self

    def __exit__(self, *args) -> None:
        self.close()

    def _handle_response(self, response: httpx.Response) -> dict:
        """Handle API response, raising appropriate exceptions."""
        if response.status_code == 404:
            data = response.json()
            error = data.get("error", {})
            if "job" in error.get("message", "").lower():
                raise JobNotFoundError(error.get("message", "unknown"))
            raise APIError(
                code=error.get("code", "NOT_FOUND"),
                message=error.get("message", "Not found"),
                status_code=404,
            )

        if response.status_code >= 400 and response.status_code != 402:
            data = response.json()
            error = data.get("error", {})
            raise APIError(
                code=error.get("code", "UNKNOWN"),
                message=error.get("message", response.text),
                status_code=response.status_code,
                details=error.get("details"),
            )

        return response.json()

    def _request_with_payment(
        self,
        method: str,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """Make a request with automatic x402 payment handling."""
        url = f"{self.endpoint}{path}"

        # First attempt without payment
        response = self.http.request(method, url, json=json_data)

        # Handle 402 Payment Required
        if response.status_code == 402:
            data = response.json()

            if not self.auto_pay or not self.payment:
                raise PaymentRequired(
                    price=data.get("price", "unknown"),
                    accepts=data.get("accepts", []),
                    currency=data.get("currency", "USDC"),
                    network=data.get("network", "movement"),
                    pay_to=data.get("payTo"),
                )

            # Extract payment info from 402 response
            accepts = data.get("accepts", [])
            if not accepts:
                raise APIError("INVALID_402", "No payment info in 402 response", 402)

            accept = accepts[0] if isinstance(accepts, list) else accepts
            pay_to = accept.get("payTo", data.get("payTo"))
            amount = accept.get("maxAmountRequired", data.get("price"))
            resource = accept.get("resource", self.endpoint)

            # Build payment header
            payment_header = self.payment.build_payment_header(
                pay_to=pay_to,
                amount=str(amount),
                resource=resource,
            )

            # Retry with payment header
            response = self.http.request(
                method,
                url,
                json=json_data,
                headers={"X-PAYMENT": payment_header},
            )

        return self._handle_response(response)

    # ==================== Inference ====================

    def inference(self, request: InferenceRequest) -> InferenceResponse:
        """
        Run text inference with automatic x402 payment.

        Args:
            request: The inference request

        Returns:
            InferenceResponse with completion and cost info

        Raises:
            PaymentRequired: When payment needed and auto_pay is False
            APIError: When the API returns an error
        """
        data = self._request_with_payment(
            "POST",
            "/v1/inference",
            request.model_dump(exclude_none=True),
        )
        return InferenceResponse(**data)

    def chat(
        self,
        model: str,
        messages: List[ChatMessage],
        max_tokens: int = 256,
        temperature: float = 0.7,
    ) -> InferenceResponse:
        """
        Convenience method for chat completion.

        Args:
            model: Model ID to use
            messages: List of chat messages
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature

        Returns:
            InferenceResponse with completion
        """
        request = InferenceRequest(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return self.inference(request)

    # ==================== Image Generation ====================

    def generate_image(
        self, request: ImageGenerationRequest
    ) -> ImageGenerationResponse:
        """
        Generate images from a prompt with automatic x402 payment.

        Args:
            request: The image generation request

        Returns:
            ImageGenerationResponse with image URLs and cost info

        Raises:
            PaymentRequired: When payment needed and auto_pay is False
            APIError: When the API returns an error
        """
        data = self._request_with_payment(
            "POST",
            "/v1/images/generate",
            request.model_dump(exclude_none=True),
        )
        return ImageGenerationResponse(**data)

    # ==================== Compute ====================

    def run_compute(self, request: ComputeRunRequest) -> ComputeRunResponse:
        """
        Start a compute job with automatic x402 payment.

        Args:
            request: The compute run request

        Returns:
            ComputeRunResponse with job ID and status

        Raises:
            PaymentRequired: When payment needed and auto_pay is False
            APIError: When the API returns an error
        """
        data = self._request_with_payment(
            "POST",
            "/v1/compute/run",
            request.model_dump(exclude_none=True),
        )
        return ComputeRunResponse(**data)

    def get_job_status(self, job_id: str) -> ComputeJobStatus:
        """
        Get the status of a compute job.

        Args:
            job_id: The job ID to check

        Returns:
            ComputeJobStatus with current status

        Raises:
            JobNotFoundError: When job is not found
            APIError: When the API returns an error
        """
        response = self.http.get(f"{self.endpoint}/v1/compute/{job_id}/status")
        data = self._handle_response(response)
        return ComputeJobStatus(**data)

    def get_gpu_types(self) -> List[GpuTypeInfo]:
        """
        Get available GPU types and pricing.

        Returns:
            List of available GPU types with pricing
        """
        response = self.http.get(f"{self.endpoint}/v1/compute/gpu-types")
        data = self._handle_response(response)
        return [GpuTypeInfo(**gpu) for gpu in data.get("gpuTypes", [])]

    # ==================== Discovery ====================

    def list_providers(self) -> List[ProviderInfo]:
        """
        List available compute providers.

        Returns:
            List of provider information
        """
        response = self.http.get(f"{self.endpoint}/v1/providers")
        data = self._handle_response(response)
        return [ProviderInfo(**p) for p in data.get("providers", [])]

    def list_models(self) -> List[ModelInfo]:
        """
        List available models across all providers.

        Returns:
            List of model information with pricing
        """
        response = self.http.get(f"{self.endpoint}/v1/models")
        data = self._handle_response(response)
        return [ModelInfo(**m) for m in data.get("models", [])]

    def health_check(self) -> bool:
        """
        Check if the AgentPay server is healthy.

        Returns:
            True if server is healthy
        """
        try:
            response = self.http.get(f"{self.endpoint}/health")
            return response.status_code == 200
        except Exception:
            return False
