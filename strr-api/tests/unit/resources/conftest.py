"""Shared fixtures and constants for resource-level integration tests."""
from datetime import datetime
from unittest.mock import patch

import pytest

ACCOUNT_ID = 1234
MOCK_INVOICE_RESPONSE = {"id": 123, "statusCode": "CREATED", "paymentAccount": {"accountId": ACCOUNT_ID}}
MOCK_PAYMENT_COMPLETED_RESPONSE = {
    "id": 123,
    "statusCode": "COMPLETED",
    "paymentAccount": {"accountId": ACCOUNT_ID},
    "paymentDate": datetime.now().isoformat(),
}


@pytest.fixture
def mock_create_invoice():
    """Patch strr_pay.create_invoice for the duration of a test."""
    with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE) as m:
        yield m
