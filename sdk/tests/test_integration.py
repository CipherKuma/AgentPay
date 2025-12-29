"""Integration tests for AgentPay SDK with x402 payments.

These tests require a running AgentPay server.
Run with: pytest tests/ -k integration

To run against local server:
    export AGENTPAY_ENDPOINT=http://localhost:4402
    export AGENTPAY_PRIVATE_KEY=0x...
    pytest tests/test_integration.py -v
"""

import os
import pytest

from agentpay import (
    AgentPayClient,
    InferenceRequest,
    ChatMessage,
    ImageGenerationRequest,
    ComputeRunRequest,
    GpuConfig,
    PaymentRequired,
    X402PaymentHandler,
)


# Mark all tests in this module as integration tests
pytestmark = pytest.mark.integration

# Test configuration from environment
ENDPOINT = os.getenv("AGENTPAY_ENDPOINT", "http://localhost:4402")
PRIVATE_KEY = os.getenv("AGENTPAY_PRIVATE_KEY")


@pytest.fixture
def client():
    """Create a client without payment support."""
    return AgentPayClient(endpoint=ENDPOINT)


@pytest.fixture
def paying_client():
    """Create a client with payment support."""
    if not PRIVATE_KEY:
        pytest.skip("AGENTPAY_PRIVATE_KEY not set")
    return AgentPayClient(
        endpoint=ENDPOINT,
        private_key=PRIVATE_KEY,
        network="movement-testnet",
        auto_pay=True,
    )


class TestHealthAndDiscovery:
    """Test free endpoints that don't require payment."""

    def test_health_check(self, client):
        """Test server health check."""
        assert client.health_check() is True

    def test_list_models(self, client):
        """Test listing available models."""
        models = client.list_models()
        assert isinstance(models, list)
        # Server should have at least one model
        if models:
            assert models[0].id
            assert models[0].provider

    def test_list_providers(self, client):
        """Test listing available providers."""
        providers = client.list_providers()
        assert isinstance(providers, list)

    def test_get_gpu_types(self, client):
        """Test getting GPU types."""
        gpu_types = client.get_gpu_types()
        assert isinstance(gpu_types, list)
        if gpu_types:
            assert gpu_types[0].type
            assert gpu_types[0].price_per_hour >= 0


class TestPaymentRequired:
    """Test that paid endpoints require payment."""

    def test_inference_requires_payment(self, client):
        """Test that inference returns 402 without payment."""
        with pytest.raises(PaymentRequired) as exc_info:
            client.inference(InferenceRequest(
                model="gpt-4o-mini",
                messages=[ChatMessage(role="user", content="Hello")],
            ))

        # Verify payment info is provided
        assert exc_info.value.price
        assert exc_info.value.network

    def test_image_requires_payment(self, client):
        """Test that image generation returns 402 without payment."""
        with pytest.raises(PaymentRequired):
            client.generate_image(ImageGenerationRequest(
                prompt="A test image",
            ))

    def test_compute_requires_payment(self, client):
        """Test that compute returns 402 without payment."""
        with pytest.raises(PaymentRequired):
            client.run_compute(ComputeRunRequest(
                image="nvidia/cuda:12.0",
                timeout_seconds=60,
            ))


class TestX402PaymentFlow:
    """Test x402 payment integration."""

    def test_payment_handler_initialization(self):
        """Test that payment handler initializes correctly."""
        if not PRIVATE_KEY:
            pytest.skip("AGENTPAY_PRIVATE_KEY not set")

        handler = X402PaymentHandler(PRIVATE_KEY, "movement-testnet")
        assert handler.public_key.startswith("0x")
        assert handler.network == "movement-testnet"

    def test_client_with_payment_handler(self, paying_client):
        """Test that client initializes with payment handler."""
        assert paying_client.payment is not None
        assert paying_client.auto_pay is True

    def test_inference_with_payment(self, paying_client):
        """Test inference with automatic payment."""
        response = paying_client.inference(InferenceRequest(
            model="gpt-4o-mini",
            messages=[ChatMessage(role="user", content="Say hello!")],
            max_tokens=50,
        ))

        assert response.id
        assert response.choices
        assert response.choices[0].message.content
        assert response.cost
        assert response.cost.total_cost

    def test_chat_convenience_method(self, paying_client):
        """Test the chat convenience method."""
        response = paying_client.chat(
            model="gpt-4o-mini",
            messages=[ChatMessage(role="user", content="Hi!")],
            max_tokens=20,
        )

        assert response.choices[0].message.content

    def test_image_generation_with_payment(self, paying_client):
        """Test image generation with automatic payment."""
        response = paying_client.generate_image(ImageGenerationRequest(
            prompt="A simple test pattern",
            model="sdxl",
            size="512x512",
        ))

        assert response.id
        assert response.data
        assert response.cost

    def test_compute_with_payment(self, paying_client):
        """Test compute job with automatic payment."""
        response = paying_client.run_compute(ComputeRunRequest(
            image="nvidia/cuda:12.0",
            command=["echo", "hello"],
            gpu=GpuConfig(type="A100", count=1),
            timeout_seconds=60,
        ))

        assert response.id
        assert response.status in ["pending", "running", "completed"]


class TestErrorHandling:
    """Test error handling scenarios."""

    def test_auto_pay_disabled(self, client):
        """Test that auto_pay=False raises PaymentRequired."""
        client_no_pay = AgentPayClient(
            endpoint=ENDPOINT,
            auto_pay=False,
        )

        with pytest.raises(PaymentRequired):
            client_no_pay.inference(InferenceRequest(
                model="gpt-4o-mini",
                messages=[ChatMessage(role="user", content="Test")],
            ))

    def test_invalid_private_key(self):
        """Test that invalid private key raises error."""
        with pytest.raises(ValueError):
            AgentPayClient(
                endpoint=ENDPOINT,
                private_key="invalid_key",
            )
