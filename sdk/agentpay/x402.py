"""X402 payment handler for AgentPay SDK."""

import base64
import json
import time
from typing import Optional

try:
    from nacl.signing import SigningKey
    from nacl.encoding import HexEncoder
except ImportError:
    raise ImportError(
        "PyNaCl is required for x402 payment support. "
        "Install it with: pip install PyNaCl"
    )


class X402PaymentHandler:
    """
    Handles x402 payment signing for Movement network.

    Uses ed25519 signatures compatible with Movement's account system.
    """

    # Network configurations
    NETWORKS = {
        "movement-mainnet": {
            "chain_id": "126",
            "name": "Movement Mainnet",
        },
        "movement-testnet": {
            "chain_id": "177",
            "name": "Movement Testnet",
        },
    }

    def __init__(self, private_key: str, network: str = "movement-mainnet"):
        """
        Initialize the payment handler.

        Args:
            private_key: Hex-encoded ed25519 private key (32 bytes)
            network: "movement-mainnet" or "movement-testnet"

        Raises:
            ValueError: If private key is invalid or network is unknown
        """
        if network not in self.NETWORKS:
            raise ValueError(f"Unknown network: {network}. Use: {list(self.NETWORKS.keys())}")

        self.network = network
        self.network_config = self.NETWORKS[network]

        # Parse private key
        key_hex = private_key.removeprefix("0x")
        if len(key_hex) != 64:
            raise ValueError("Private key must be 32 bytes (64 hex characters)")

        try:
            self._signing_key = SigningKey(bytes.fromhex(key_hex))
        except Exception as e:
            raise ValueError(f"Invalid private key: {e}")

    @property
    def public_key(self) -> str:
        """Get the hex-encoded public key."""
        return "0x" + self._signing_key.verify_key.encode().hex()

    @property
    def address(self) -> str:
        """Get the Movement address (same as public key for ed25519)."""
        return self.public_key

    def build_payment_header(
        self,
        pay_to: str,
        amount: str,
        resource: str,
        nonce: Optional[str] = None,
    ) -> str:
        """
        Build the X-PAYMENT header value for x402.

        Args:
            pay_to: Recipient address
            amount: Amount in smallest units (octas)
            resource: Facilitator URL or resource identifier
            nonce: Optional nonce (defaults to timestamp)

        Returns:
            Base64-encoded payment header value
        """
        if nonce is None:
            nonce = str(int(time.time() * 1000))

        # Create payload per x402 spec
        payload = {
            "x402Version": 1,
            "scheme": "exact",
            "network": self.network,
            "payload": {
                "signature": "",  # Will be filled after signing
                "payload": {
                    "payTo": pay_to,
                    "maxAmount": amount,
                    "nonce": nonce,
                    "validUntil": str(int(time.time()) + 300),  # 5 minutes
                },
                "authorization": {
                    "from": self.address,
                    "asset": "MOVE",
                },
            },
        }

        # Create message to sign (inner payload as canonical JSON)
        inner_payload = payload["payload"]["payload"]
        message = json.dumps(inner_payload, separators=(',', ':'), sort_keys=True)
        message_bytes = message.encode('utf-8')

        # Sign with ed25519
        signed = self._signing_key.sign(message_bytes)
        signature = signed.signature.hex()

        # Add signature to payload
        payload["payload"]["signature"] = "0x" + signature

        # Encode as base64
        payload_json = json.dumps(payload, separators=(',', ':'))
        return base64.b64encode(payload_json.encode('utf-8')).decode('ascii')

    def sign_message(self, message: bytes) -> str:
        """
        Sign arbitrary message bytes.

        Args:
            message: Raw bytes to sign

        Returns:
            Hex-encoded signature with 0x prefix
        """
        signed = self._signing_key.sign(message)
        return "0x" + signed.signature.hex()

    def verify_own_signature(self, message: bytes, signature: str) -> bool:
        """
        Verify a signature created by this handler.

        Args:
            message: Original message bytes
            signature: Hex-encoded signature (with or without 0x prefix)

        Returns:
            True if signature is valid
        """
        try:
            sig_bytes = bytes.fromhex(signature.removeprefix("0x"))
            self._signing_key.verify_key.verify(message, sig_bytes)
            return True
        except Exception:
            return False
