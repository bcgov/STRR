"""Unit tests for payment listener helpers (no Flask app)."""

from simple_cloudevent import SimpleCloudEvent

from strr_pay.resources.pay_listener import dict_keys_to_snake_case
from strr_pay.resources.pay_listener import get_payment_token


def test_dict_keys_to_snake_case_converts_nested_camel_case_keys():
    assert dict_keys_to_snake_case({"StatusCode": "X", "FilingIdentifier": "F1"}) == {
        "status_code": "X",
        "filing_identifier": "F1",
    }


def test_dict_keys_to_snake_case_preserves_simple_keys():
    assert dict_keys_to_snake_case({"id": 1}) == {"id": 1}


def test_get_payment_token_returns_none_for_wrong_event_type():
    ce = SimpleCloudEvent(
        id="e1",
        source="src",
        subject="sub",
        type="other.type",
        data={"Id": 1, "StatusCode": "COMPLETED"},
    )
    assert get_payment_token(ce) is None


def test_get_payment_token_returns_none_when_data_not_dict():
    ce = SimpleCloudEvent(
        id="e1",
        source="src",
        subject="sub",
        type="bc.registry.payment",
        data=None,
    )
    assert get_payment_token(ce) is None


def test_get_payment_token_returns_none_when_data_is_empty_dict():
    """Empty dict is falsy: ce.data must be truthy to enter the parse branch."""
    ce = SimpleCloudEvent(
        id="e1",
        source="src",
        subject="sub",
        type="bc.registry.payment",
        data={},
    )
    assert get_payment_token(ce) is None


def test_get_payment_token_returns_none_when_data_is_not_mapping():
    ce = SimpleCloudEvent(
        id="e1",
        source="src",
        subject="sub",
        type="bc.registry.payment",
        data=["not", "a", "dict"],
    )
    assert get_payment_token(ce) is None


def test_get_payment_token_parses_bc_registry_payment_payload():
    ce = SimpleCloudEvent(
        id="e1",
        source="src",
        subject="sub",
        type="bc.registry.payment",
        data={"Id": 4242, "StatusCode": "COMPLETED", "CorpTypeCode": "BC"},
    )
    pt = get_payment_token(ce)
    assert pt is not None
    assert pt.id == 4242
    assert pt.status_code == "COMPLETED"
    assert pt.corp_type_code == "BC"
