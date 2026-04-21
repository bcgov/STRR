"""Additional PayService coverage: init_app, create_invoice, platform/strata/renewal payloads, receipts."""

from datetime import datetime, timezone
from http import HTTPStatus
from unittest.mock import MagicMock, patch

import pytest

from strr_api.enums.enum import PropertyType, RegistrationType
from strr_api.models import RentalProperty
from strr_api.services.payment_service import (
    HOST_RENEWAL_BED_AND_BREAKFAST,
    HOST_RENEWAL_OFFSITE,
    HOST_RENEWAL_ONSITE,
    PLATFORM_FEE_WAIVED,
    PLATFORM_LARGE_USER_BASE,
    PLATFORM_RENEWAL_LARGE,
    PLATFORM_RENEWAL_MINOR,
    PLATFORM_RENEWAL_WAIVED,
    PLATFORM_SMALL_USER_BASE,
    STRATA_HOTEL_REG,
    STRATA_HOTEL_RENEWAL,
    PayService,
)


def test_pay_service_without_app():
    """Constructor with no app skips init_app."""
    pay = PayService()
    assert pay.app is None


def test_init_app_sets_url_and_timeout(app):
    pay = PayService()
    pay.init_app(app)
    assert pay.app is app
    assert pay.svc_url == app.config.get("PAYMENT_SVC_URL")
    assert pay.timeout == app.config.get("PAY_API_TIMEOUT", 20)


def _minimal_application_json(registration_type, **extra):
    base = {"header": {"applicationType": "registration"}, "registration": {"registrationType": registration_type}}
    base["registration"].update(extra)
    return base


@pytest.fixture
def pay(app):
    p = PayService(app)
    return p


def test_get_payment_request_platform_cpbc_waived(pay):
    reg = {
        "businessDetails": {"consumerProtectionBCLicenceNumber": "LIC123"},
        "platformDetails": {"listingSize": "SMALL"},
    }
    aj = _minimal_application_json(RegistrationType.PLATFORM.value)
    aj["registration"] = {**aj["registration"], **reg}
    payload = pay._get_payment_request(aj, "F1")
    ft = payload["filingInfo"]["filingTypes"][0]["filingTypeCode"]
    assert ft == PLATFORM_FEE_WAIVED


def test_get_payment_request_platform_large_listing(pay):
    reg = {
        "businessDetails": {"consumerProtectionBCLicenceNumber": ""},
        "platformDetails": {"listingSize": "THOUSAND_AND_ABOVE"},
    }
    aj = _minimal_application_json(RegistrationType.PLATFORM.value)
    aj["registration"] = {**aj["registration"], **reg}
    payload = pay._get_payment_request(aj, "F1")
    assert payload["filingInfo"]["filingTypes"][0]["filingTypeCode"] == PLATFORM_LARGE_USER_BASE


def test_get_payment_request_platform_small(pay):
    reg = {
        "businessDetails": {"consumerProtectionBCLicenceNumber": None},
        "platformDetails": {"listingSize": "BELOW"},
    }
    aj = _minimal_application_json(RegistrationType.PLATFORM.value)
    aj["registration"] = {**aj["registration"], **reg}
    payload = pay._get_payment_request(aj, "F1")
    assert payload["filingInfo"]["filingTypes"][0]["filingTypeCode"] == PLATFORM_SMALL_USER_BASE


def test_get_payment_request_platform_renewal_cpbc(pay):
    reg = {
        "businessDetails": {"consumerProtectionBCLicenceNumber": "lic"},
        "platformDetails": {"listingSize": "SMALL"},
    }
    aj = _minimal_application_json(RegistrationType.PLATFORM.value)
    aj["header"]["applicationType"] = "renewal"
    aj["registration"] = {**aj["registration"], **reg}
    payload = pay._get_payment_request(aj, "F1")
    assert payload["filingInfo"]["filingTypes"][0]["filingTypeCode"] == PLATFORM_RENEWAL_WAIVED


def test_get_payment_request_platform_renewal_large(pay):
    reg = {
        "businessDetails": {"consumerProtectionBCLicenceNumber": ""},
        "platformDetails": {"listingSize": "THOUSAND_AND_ABOVE"},
    }
    aj = _minimal_application_json(RegistrationType.PLATFORM.value)
    aj["header"]["applicationType"] = "renewal"
    aj["registration"] = {**aj["registration"], **reg}
    payload = pay._get_payment_request(aj, "F1")
    assert payload["filingInfo"]["filingTypes"][0]["filingTypeCode"] == PLATFORM_RENEWAL_LARGE


def test_get_payment_request_platform_renewal_minor(pay):
    reg = {
        "businessDetails": {"consumerProtectionBCLicenceNumber": ""},
        "platformDetails": {"listingSize": "TINY"},
    }
    aj = _minimal_application_json(RegistrationType.PLATFORM.value)
    aj["header"]["applicationType"] = "renewal"
    aj["registration"] = {**aj["registration"], **reg}
    payload = pay._get_payment_request(aj, "F1")
    assert payload["filingInfo"]["filingTypes"][0]["filingTypeCode"] == PLATFORM_RENEWAL_MINOR


def test_get_payment_request_strata_registration(pay):
    aj = _minimal_application_json(RegistrationType.STRATA_HOTEL.value)
    payload = pay._get_payment_request(aj, "F1")
    assert payload["filingInfo"]["filingTypes"][0]["filingTypeCode"] == STRATA_HOTEL_REG


def test_get_payment_request_strata_renewal(pay):
    aj = _minimal_application_json(RegistrationType.STRATA_HOTEL.value)
    aj["header"]["applicationType"] = "renewal"
    payload = pay._get_payment_request(aj, "F1")
    assert payload["filingInfo"]["filingTypes"][0]["filingTypeCode"] == STRATA_HOTEL_RENEWAL


def test_get_payment_request_direct_pay_and_skip_automation(pay):
    aj = _minimal_application_json(RegistrationType.HOST.value)
    aj["header"]["paymentMethod"] = "DIRECT_PAY"
    aj["registration"]["unitDetails"] = {
        "propertyType": "SINGLE_FAMILY_HOME",
        "rentalUnitSetupOption": "PRIMARY_RESIDENCE_OR_SHARED_SPACE",
    }
    with patch("strr_api.services.payment_service.UserService.is_automation_tester", return_value=True):
        payload = pay._get_payment_request(aj, "F1")
    assert payload.get("paymentInfo") == {"methodOfPayment": "DIRECT_PAY"}
    assert payload.get("skipPayment") is True


def test_get_host_filing_type_renewal_bb(pay):
    reg = {
        "unitDetails": {
            "rentalUnitSetupOption": "PRIMARY_RESIDENCE_OR_SHARED_SPACE",
            "propertyType": PropertyType.BED_AND_BREAKFAST.name,
        }
    }
    filing, qty = pay._get_host_filing_type(reg, "renewal")
    assert filing == HOST_RENEWAL_BED_AND_BREAKFAST
    assert qty == 1


def test_get_host_filing_type_renewal_offsite(pay):
    reg = {
        "unitDetails": {
            "rentalUnitSetupOption": "DIFFERENT_PROPERTY",
            "propertyType": "SINGLE_FAMILY_HOME",
        }
    }
    filing, qty = pay._get_host_filing_type(reg, "renewal")
    assert filing == HOST_RENEWAL_OFFSITE


def test_get_host_filing_type_renewal_onsite(pay):
    reg = {
        "unitDetails": {
            "rentalUnitSetupOption": "PRIMARY_RESIDENCE_OR_SHARED_SPACE",
            "propertyType": "SINGLE_FAMILY_HOME",
        }
    }
    filing, qty = pay._get_host_filing_type(reg, "renewal")
    assert filing == HOST_RENEWAL_ONSITE


def test_legacy_entire_home_same_unit(pay):
    from strr_api.services.payment_service import HOST_REGISTRATION_FEE_1

    reg = {
        "unitDetails": {
            "rentalUnitSpaceType": RentalProperty.RentalUnitSpaceType.ENTIRE_HOME.name,
            "isUnitOnPrincipalResidenceProperty": True,
            "hostResidence": RentalProperty.HostResidence.SAME_UNIT.name,
        }
    }
    ft, qty = pay._get_host_registration_fee_using_legacy_option(None, 1, reg)
    assert ft == HOST_REGISTRATION_FEE_1


def test_legacy_entire_home_another_unit(pay):
    from strr_api.services.payment_service import HOST_REGISTRATION_FEE_2

    reg = {
        "unitDetails": {
            "rentalUnitSpaceType": RentalProperty.RentalUnitSpaceType.ENTIRE_HOME.name,
            "isUnitOnPrincipalResidenceProperty": True,
            "hostResidence": RentalProperty.HostResidence.ANOTHER_UNIT.name,
        }
    }
    ft, _ = pay._get_host_registration_fee_using_legacy_option(None, 1, reg)
    assert ft == HOST_REGISTRATION_FEE_2


def test_legacy_entire_home_not_on_principal(pay):
    from strr_api.services.payment_service import HOST_REGISTRATION_FEE_2

    reg = {
        "unitDetails": {
            "rentalUnitSpaceType": RentalProperty.RentalUnitSpaceType.ENTIRE_HOME.name,
            "isUnitOnPrincipalResidenceProperty": False,
        }
    }
    ft, _ = pay._get_host_registration_fee_using_legacy_option(None, 1, reg)
    assert ft == HOST_REGISTRATION_FEE_2


def test_legacy_shared_bb(pay):
    from strr_api.services.payment_service import HOST_REGISTRATION_FEE_3

    reg = {
        "unitDetails": {
            "rentalUnitSpaceType": RentalProperty.RentalUnitSpaceType.SHARED_ACCOMMODATION.name,
            "propertyType": PropertyType.BED_AND_BREAKFAST.name,
        }
    }
    ft, _ = pay._get_host_registration_fee_using_legacy_option(None, 1, reg)
    assert ft == HOST_REGISTRATION_FEE_3


def test_legacy_shared_rooms_quantity(pay):
    reg = {
        "unitDetails": {
            "rentalUnitSpaceType": RentalProperty.RentalUnitSpaceType.SHARED_ACCOMMODATION.name,
            "propertyType": "SINGLE_FAMILY_HOME",
            "numberOfRoomsForRent": 3,
        }
    }
    _, qty = pay._get_host_registration_fee_using_legacy_option(None, 1, reg)
    assert qty == 3


@patch("strr_api.services.payment_service.requests.post")
@patch("strr_api.services.payment_service.EventsService.save_event")
def test_create_invoice_success(mock_save_event, mock_post, pay):
    mock_jwt = MagicMock()
    mock_jwt.get_token_auth_header.return_value = "tok"
    mock_post.return_value.status_code = HTTPStatus.CREATED
    mock_post.return_value.json.return_value = {"id": 99}
    app_obj = MagicMock()
    app_obj.application_json = _minimal_application_json(RegistrationType.HOST.value)
    app_obj.application_json["registration"]["unitDetails"] = {
        "propertyType": "SINGLE_FAMILY_HOME",
        "rentalUnitSetupOption": "PRIMARY_RESIDENCE_OR_SHARED_SPACE",
    }
    app_obj.application_number = "N1"
    app_obj.id = 5
    out = pay.create_invoice(mock_jwt, 10, app_obj)
    assert out["id"] == 99
    mock_save_event.assert_called_once()


@patch("strr_api.services.payment_service.requests.post")
def test_create_invoice_bad_status_returns_none(mock_post, pay):
    """Pay-api errors are caught broadly and return None (including ExternalServiceException from bad status)."""
    mock_jwt = MagicMock()
    mock_jwt.get_token_auth_header.return_value = "tok"
    mock_post.return_value.status_code = 400
    mock_post.return_value.json.return_value = {}
    app_obj = MagicMock()
    app_obj.application_json = _minimal_application_json(RegistrationType.HOST.value)
    app_obj.application_json["registration"]["unitDetails"] = {
        "propertyType": "SINGLE_FAMILY_HOME",
        "rentalUnitSetupOption": "PRIMARY_RESIDENCE_OR_SHARED_SPACE",
    }
    app_obj.application_number = "N1"
    app_obj.id = 5
    assert pay.create_invoice(mock_jwt, 10, app_obj) is None


@patch("strr_api.services.payment_service.requests.post")
def test_create_invoice_exception_returns_none(mock_post, pay):
    mock_jwt = MagicMock()
    mock_jwt.get_token_auth_header.return_value = "tok"
    mock_post.side_effect = RuntimeError("network")
    app_obj = MagicMock()
    app_obj.application_json = _minimal_application_json(RegistrationType.HOST.value)
    app_obj.application_json["registration"]["unitDetails"] = {
        "propertyType": "SINGLE_FAMILY_HOME",
        "rentalUnitSetupOption": "PRIMARY_RESIDENCE_OR_SHARED_SPACE",
    }
    app_obj.application_number = "N1"
    app_obj.id = 5
    assert pay.create_invoice(mock_jwt, 10, app_obj) is None


@patch("strr_api.services.payment_service.requests.get")
def test_get_payment_details_by_invoice_id(mock_get, pay):
    mock_jwt = MagicMock()
    mock_jwt.get_token_auth_header.return_value = "t"
    mock_get.return_value.json.return_value = {"status": "PAID"}
    assert pay.get_payment_details_by_invoice_id(mock_jwt, 1, 42) == {"status": "PAID"}


@patch("strr_api.services.payment_service.requests.post")
def test_get_payment_receipt_success(mock_post, pay):
    mock_jwt = MagicMock()
    mock_jwt.get_token_auth_header.return_value = "t"
    mock_resp = MagicMock()
    mock_resp.status_code = HTTPStatus.CREATED
    mock_resp.content = b"pdf"
    mock_post.return_value = mock_resp
    app_row = MagicMock()
    app_row.invoice_id = 1
    app_row.payment_account = 9
    app_row.application_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    app_row.id = 3
    rv = pay.get_payment_receipt(mock_jwt, app_row)
    assert rv.status_code == HTTPStatus.CREATED


@patch("strr_api.services.payment_service.requests.post")
def test_get_payment_receipt_non_created_logs(mock_post, pay):
    mock_jwt = MagicMock()
    mock_jwt.get_token_auth_header.return_value = "t"
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.content = b""
    mock_post.return_value = mock_resp
    app_row = MagicMock()
    app_row.invoice_id = 1
    app_row.payment_account = 9
    app_row.application_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    app_row.id = 3
    pay.get_payment_receipt(mock_jwt, app_row)
