"""Tests for AgentPayClient."""

import pytest
from pytest_httpx import HTTPXMock

from agentpay import (
    AgentPayClient,
    InferenceRequest,
    ChatMessage,
    ImageGenerationRequest,
    ComputeRunRequest,
    PaymentRequired,
    APIError,
    JobNotFoundError,
)


class TestAgentPayClient:
    """Tests for the AgentPayClient class."""

    def test_init_default(self):
        """Test client initialization with defaults."""
        client = AgentPayClient()
        assert client.endpoint == "http://localhost:4402"
        client.close()

    def test_init_custom_endpoint(self):
        """Test client initialization with custom endpoint."""
        client = AgentPayClient(endpoint="https://api.agentpay.io")
        assert client.endpoint == "https://api.agentpay.io"
        client.close()

    def test_context_manager(self):
        """Test client as context manager."""
        with AgentPayClient() as client:
            assert client.endpoint == "http://localhost:4402"


class TestHealthCheck:
    """Tests for health check endpoint."""

    def test_health_check_success(self, httpx_mock: HTTPXMock):
        """Test successful health check."""
        httpx_mock.add_response(url="http://localhost:4402/health", status_code=200)

        with AgentPayClient() as client:
            assert client.health_check() is True

    def test_health_check_failure(self, httpx_mock: HTTPXMock):
        """Test failed health check."""
        httpx_mock.add_response(url="http://localhost:4402/health", status_code=500)

        with AgentPayClient() as client:
            assert client.health_check() is False


class TestInference:
    """Tests for inference endpoint."""

    def test_inference_payment_required(self, httpx_mock: HTTPXMock):
        """Test inference returns 402 without payment."""
        httpx_mock.add_response(
            url="http://localhost:4402/v1/inference",
            status_code=402,
            json={
                "price": "0.001",
                "currency": "USDC",
                "network": "movement",
                "accepts": ["exact", "upto"],
            },
        )

        with AgentPayClient() as client:
            with pytest.raises(PaymentRequired) as exc_info:
                client.inference(
                    InferenceRequest(
                        model="llama-3-8b",
                        messages=[ChatMessage(role="user", content="Hello")],
                    )
                )

            assert exc_info.value.price == "0.001"
            assert exc_info.value.currency == "USDC"
            assert exc_info.value.network == "movement"

    def test_inference_success(self, httpx_mock: HTTPXMock):
        """Test successful inference with payment."""
        httpx_mock.add_response(
            url="http://localhost:4402/v1/inference",
            status_code=200,
            json={
                "id": "inf-123",
                "model": "llama-3-8b",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": "Hello!"},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 5,
                    "total_tokens": 15,
                },
                "cost": {
                    "provider": "together",
                    "provider_cost": "0.00001",
                    "total_cost": "0.000012",
                    "currency": "USDC",
                },
            },
        )

        with AgentPayClient() as client:
            response = client.inference(
                InferenceRequest(
                    model="llama-3-8b",
                    messages=[ChatMessage(role="user", content="Hello")],
                )
            )

            assert response.id == "inf-123"
            assert response.model == "llama-3-8b"
            assert response.choices[0].message.content == "Hello!"
            assert response.usage.total_tokens == 15
            assert response.cost.total_cost == "0.000012"


class TestImageGeneration:
    """Tests for image generation endpoint."""

    def test_generate_image_payment_required(self, httpx_mock: HTTPXMock):
        """Test image generation returns 402 without payment."""
        httpx_mock.add_response(
            url="http://localhost:4402/v1/images/generate",
            status_code=402,
            json={"price": "0.05", "currency": "USDC", "accepts": ["exact"]},
        )

        with AgentPayClient() as client:
            with pytest.raises(PaymentRequired) as exc_info:
                client.generate_image(
                    ImageGenerationRequest(prompt="A sunset")
                )

            assert exc_info.value.price == "0.05"


class TestCompute:
    """Tests for compute endpoints."""

    def test_get_gpu_types(self, httpx_mock: HTTPXMock):
        """Test getting GPU types."""
        httpx_mock.add_response(
            url="http://localhost:4402/v1/compute/gpu-types",
            status_code=200,
            json={
                "gpuTypes": [
                    {"type": "A100", "provider": "akash", "pricePerHour": 2.5},
                    {"type": "H100", "provider": "akash", "pricePerHour": 4.0},
                ]
            },
        )

        with AgentPayClient() as client:
            gpu_types = client.get_gpu_types()
            assert len(gpu_types) == 2
            assert gpu_types[0].type == "A100"
            assert gpu_types[0].price_per_hour == 2.5

    def test_run_compute_payment_required(self, httpx_mock: HTTPXMock):
        """Test compute job returns 402 without payment."""
        httpx_mock.add_response(
            url="http://localhost:4402/v1/compute/run",
            status_code=402,
            json={"price": "1.25", "currency": "USDC", "accepts": ["exact"]},
        )

        with AgentPayClient() as client:
            with pytest.raises(PaymentRequired):
                client.run_compute(
                    ComputeRunRequest(
                        image="nvidia/cuda:12.0",
                        timeout_seconds=300,
                    )
                )

    def test_get_job_status_not_found(self, httpx_mock: HTTPXMock):
        """Test getting status of non-existent job."""
        httpx_mock.add_response(
            url="http://localhost:4402/v1/compute/job-999/status",
            status_code=404,
            json={"error": {"code": "NOT_FOUND", "message": "Job not found: job-999"}},
        )

        with AgentPayClient() as client:
            with pytest.raises(JobNotFoundError):
                client.get_job_status("job-999")


class TestDiscovery:
    """Tests for discovery endpoints."""

    def test_list_providers(self, httpx_mock: HTTPXMock):
        """Test listing providers."""
        httpx_mock.add_response(
            url="http://localhost:4402/v1/providers",
            status_code=200,
            json={
                "providers": [
                    {
                        "id": "together",
                        "name": "Together AI",
                        "status": "available",
                        "models": ["llama-3-8b"],
                    }
                ]
            },
        )

        with AgentPayClient() as client:
            providers = client.list_providers()
            assert len(providers) == 1
            assert providers[0].id == "together"
            assert providers[0].status == "available"

    def test_list_models(self, httpx_mock: HTTPXMock):
        """Test listing models."""
        httpx_mock.add_response(
            url="http://localhost:4402/v1/models",
            status_code=200,
            json={
                "models": [
                    {
                        "id": "llama-3-8b",
                        "provider": "together",
                        "type": "inference",
                        "price_per_unit": "0.00001",
                        "unit": "1K tokens",
                    }
                ]
            },
        )

        with AgentPayClient() as client:
            models = client.list_models()
            assert len(models) == 1
            assert models[0].id == "llama-3-8b"
            assert models[0].type == "inference"
