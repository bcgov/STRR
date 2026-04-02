"""Unit tests for pure helpers (strr-email style ``unit/`` helper tests)."""

import pytest
from simple_cloudevent import SimpleCloudEvent

from batch_permit_validator.resources.batch_permit_validator import BulkValidationResponse
from batch_permit_validator.resources.batch_permit_validator import dict_keys_to_snake_case
from batch_permit_validator.resources.batch_permit_validator import get_bulk_validation_response


def test_dict_keys_to_snake_case_converts_camel_case():
    assert dict_keys_to_snake_case({"callBackUrl": "a", "preSignedUrl": "b"}) == {
        "call_back_url": "a",
        "pre_signed_url": "b",
    }


def test_get_bulk_validation_response_success():
    ce = SimpleCloudEvent(
        id="1",
        source="s",
        subject="sub",
        type="strr.batchPermitValidationResult",
        data={
            "callBackUrl": "https://cb",
            "preSignedUrl": "https://file",
        },
    )
    result = get_bulk_validation_response(ce)
    assert isinstance(result, BulkValidationResponse)
    assert result.call_back_url == "https://cb"
    assert result.pre_signed_url == "https://file"


@pytest.mark.parametrize(
    "event_type,data",
    [
        ("other.type", {"callBackUrl": "x", "preSignedUrl": "y"}),
        ("strr.batchPermitValidationResult", None),
        ("strr.batchPermitValidationResult", "not-a-dict"),
    ],
)
def test_get_bulk_validation_response_returns_none_when_invalid(event_type, data):
    ce = SimpleCloudEvent(
        id="1",
        source="s",
        subject="sub",
        type=event_type,
        data=data,
    )
    assert get_bulk_validation_response(ce) is None
