"""Tests for X402 payment handler."""

import base64
import json
import pytest

from agentpay.x402 import X402PaymentHandler


# Test private key (32 bytes = 64 hex chars)
TEST_PRIVATE_KEY = "0x" + "ab" * 32


class TestX402PaymentHandler:
    """Test X402PaymentHandler functionality."""

    def test_init_valid_key(self):
        """Test initialization with valid private key."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY)
        assert handler.network == "movement-mainnet"
        assert handler.public_key.startswith("0x")
        assert len(handler.public_key) == 66  # 0x + 64 hex chars

    def test_init_without_0x_prefix(self):
        """Test initialization without 0x prefix."""
        key = "ab" * 32
        handler = X402PaymentHandler(key)
        assert handler.public_key.startswith("0x")

    def test_init_testnet(self):
        """Test initialization with testnet."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY, "movement-testnet")
        assert handler.network == "movement-testnet"
        assert handler.network_config["chain_id"] == "177"

    def test_init_invalid_network(self):
        """Test initialization with invalid network."""
        with pytest.raises(ValueError, match="Unknown network"):
            X402PaymentHandler(TEST_PRIVATE_KEY, "invalid-network")

    def test_init_invalid_key_length(self):
        """Test initialization with invalid key length."""
        with pytest.raises(ValueError, match="32 bytes"):
            X402PaymentHandler("0x" + "ab" * 16)  # 16 bytes

    def test_init_invalid_key_format(self):
        """Test initialization with invalid hex."""
        with pytest.raises(ValueError):
            X402PaymentHandler("0x" + "zz" * 32)

    def test_public_key_property(self):
        """Test public key derivation."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY)
        public_key = handler.public_key

        # Should be consistent
        assert handler.public_key == public_key
        assert len(public_key) == 66  # 0x + 64 hex chars

    def test_address_property(self):
        """Test address is same as public key."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY)
        assert handler.address == handler.public_key

    def test_build_payment_header_format(self):
        """Test payment header format."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY)

        header = handler.build_payment_header(
            pay_to="0x123456",
            amount="100000",
            resource="https://facilitator.x402.org",
        )

        # Should be valid base64
        decoded = base64.b64decode(header)
        payload = json.loads(decoded)

        # Check structure
        assert payload["x402Version"] == 1
        assert payload["scheme"] == "exact"
        assert payload["network"] == "movement-mainnet"
        assert "payload" in payload
        assert "signature" in payload["payload"]
        assert payload["payload"]["signature"].startswith("0x")

    def test_build_payment_header_payload(self):
        """Test payment header contains correct payment info."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY, "movement-testnet")

        header = handler.build_payment_header(
            pay_to="0xrecipient",
            amount="500000",
            resource="https://test.facilitator.org",
            nonce="12345",
        )

        decoded = base64.b64decode(header)
        payload = json.loads(decoded)

        inner = payload["payload"]["payload"]
        assert inner["payTo"] == "0xrecipient"
        assert inner["maxAmount"] == "500000"
        assert inner["nonce"] == "12345"
        assert "validUntil" in inner

        auth = payload["payload"]["authorization"]
        assert auth["from"] == handler.address
        assert auth["asset"] == "MOVE"

    def test_build_payment_header_auto_nonce(self):
        """Test that nonce is auto-generated when not provided."""
        import time
        handler = X402PaymentHandler(TEST_PRIVATE_KEY)

        header1 = handler.build_payment_header(
            pay_to="0x123",
            amount="100",
            resource="https://test.org",
        )
        # Wait 2ms to ensure different nonce
        time.sleep(0.002)
        header2 = handler.build_payment_header(
            pay_to="0x123",
            amount="100",
            resource="https://test.org",
        )

        # Different nonces should produce different headers
        assert header1 != header2

    def test_sign_message(self):
        """Test raw message signing."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY)

        message = b"Hello, World!"
        signature = handler.sign_message(message)

        assert signature.startswith("0x")
        assert len(signature) == 130  # 0x + 128 hex chars (64 bytes)

    def test_verify_own_signature(self):
        """Test signature verification."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY)

        message = b"Test message for signing"
        signature = handler.sign_message(message)

        assert handler.verify_own_signature(message, signature) is True
        assert handler.verify_own_signature(b"Wrong message", signature) is False

    def test_verify_signature_without_0x(self):
        """Test verification accepts signatures without 0x prefix."""
        handler = X402PaymentHandler(TEST_PRIVATE_KEY)

        message = b"Test message"
        signature = handler.sign_message(message)

        # Remove 0x prefix
        sig_no_prefix = signature.removeprefix("0x")
        assert handler.verify_own_signature(message, sig_no_prefix) is True

    def test_deterministic_keys(self):
        """Test that same private key produces same public key."""
        handler1 = X402PaymentHandler(TEST_PRIVATE_KEY)
        handler2 = X402PaymentHandler(TEST_PRIVATE_KEY)

        assert handler1.public_key == handler2.public_key
        assert handler1.address == handler2.address

    def test_different_keys_different_public(self):
        """Test that different private keys produce different public keys."""
        handler1 = X402PaymentHandler("0x" + "aa" * 32)
        handler2 = X402PaymentHandler("0x" + "bb" * 32)

        assert handler1.public_key != handler2.public_key
