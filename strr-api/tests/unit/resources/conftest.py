"""Shared fixtures and constants for resource-level integration tests."""

from unittest.mock import patch

import pytest

from tests.shared_test_constants import ACCOUNT_ID, MOCK_INVOICE_RESPONSE, MOCK_PAYMENT_COMPLETED_RESPONSE

__all__ = [
    "ACCOUNT_ID",
    "MOCK_INVOICE_RESPONSE",
    "MOCK_PAYMENT_COMPLETED_RESPONSE",
    "mock_create_invoice",
]


@pytest.fixture
def mock_create_invoice():
    """Patch strr_pay.create_invoice for the duration of a test."""
    with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE) as m:
        yield m
