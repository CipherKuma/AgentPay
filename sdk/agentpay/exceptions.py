"""Exception classes for AgentPay SDK."""

from typing import List, Optional, Any


class AgentPayError(Exception):
    """Base exception for all AgentPay errors."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class PaymentRequired(AgentPayError):
    """
    Raised when a 402 Payment Required response is received.

    Contains the payment information needed to complete the request.
    """

    def __init__(
        self,
        price: str,
        accepts: List[str],
        currency: str = "USDC",
        network: str = "movement",
        pay_to: Optional[str] = None,
    ):
        self.price = price
        self.accepts = accepts
        self.currency = currency
        self.network = network
        self.pay_to = pay_to
        message = f"Payment required: {price} {currency} on {network}"
        super().__init__(message)


class APIError(AgentPayError):
    """
    Raised when the API returns an error response.

    Contains the error code and details from the server.
    """

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int,
        details: Optional[Any] = None,
    ):
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class ValidationError(AgentPayError):
    """Raised when request validation fails."""

    pass


class ProviderError(AgentPayError):
    """Raised when a provider returns an error."""

    def __init__(self, provider: str, message: str):
        self.provider = provider
        super().__init__(f"Provider '{provider}' error: {message}")


class TimeoutError(AgentPayError):
    """Raised when a request times out."""

    pass


class JobNotFoundError(AgentPayError):
    """Raised when a compute job is not found."""

    def __init__(self, job_id: str):
        self.job_id = job_id
        super().__init__(f"Job not found: {job_id}")
