"""Unit tests for email_listener utility functions (no Flask or DB required)."""

import pytest
from simple_cloudevent import SimpleCloudEvent
from strr_api.models import Registration

from strr_email.resources.email_listener import (
    _get_address_detail,
    _get_client_recipients,
    _get_expiry_date,
    _get_rental_nickname,
    _get_service_provider,
    dict_keys_to_snake_case,
    get_email_info,
)


class TestDictKeysToSnakeCase:
    def test_converts_camel_case(self):
        result = dict_keys_to_snake_case({"emailType": "HOST", "applicationNumber": "APP-001"})
        assert result == {"email_type": "HOST", "application_number": "APP-001"}

    def test_already_snake_case_unchanged(self):
        result = dict_keys_to_snake_case({"email_type": "HOST"})
        assert result == {"email_type": "HOST"}

    def test_empty_dict(self):
        assert dict_keys_to_snake_case({}) == {}

    def test_preserves_none_values(self):
        result = dict_keys_to_snake_case({"customContent": None, "registrationNumber": "H123"})
        assert result["custom_content"] is None
        assert result["registration_number"] == "H123"

    def test_single_word_key(self):
        result = dict_keys_to_snake_case({"type": "HOST"})
        assert result == {"type": "HOST"}


class TestGetEmailInfo:
    def test_returns_email_info_from_valid_data(self):
        ce = SimpleCloudEvent(
            id="id",
            source="src",
            subject="sub",
            type="email",
            data={"emailType": "HOST_RENEWAL_REMINDER", "registrationNumber": "H123"},
        )
        info = get_email_info(ce)
        assert info is not None
        assert info.email_type == "HOST_RENEWAL_REMINDER"
        assert info.registration_number == "H123"

    def test_returns_none_when_no_data(self):
        ce = SimpleCloudEvent(id="id", source="src", subject="sub", type="email")
        assert get_email_info(ce) is None

    def test_returns_none_when_data_is_not_dict(self):
        ce = SimpleCloudEvent(
            id="id", source="src", subject="sub", type="email", data="not-a-dict"
        )
        assert get_email_info(ce) is None

    def test_converts_camel_case_fields(self):
        ce = SimpleCloudEvent(
            id="id",
            source="src",
            subject="sub",
            type="email",
            data={"emailType": "NOC", "applicationNumber": "APP-999", "customContent": "hello"},
        )
        info = get_email_info(ce)
        assert info.email_type == "NOC"
        assert info.application_number == "APP-999"
        assert info.custom_content == "hello"


class TestGetAddressDetail:
    def test_host_returns_requested_field(self):
        app_dict = {"registration": {"unitAddress": {"streetNumber": "123"}}}
        result = _get_address_detail(app_dict, Registration.RegistrationType.HOST, "streetNumber")
        assert result == "123"

    def test_non_host_returns_empty_string(self):
        app_dict = {"registration": {"unitAddress": {"streetNumber": "123"}}}
        result = _get_address_detail(
            app_dict, Registration.RegistrationType.PLATFORM, "streetNumber"
        )
        assert result == ""

    def test_missing_field_returns_empty_string(self):
        app_dict = {"registration": {"unitAddress": {}}}
        result = _get_address_detail(app_dict, Registration.RegistrationType.HOST, "unitNumber")
        assert result == ""

    def test_strata_hotel_returns_empty_string(self):
        app_dict = {"registration": {"unitAddress": {"streetNumber": "456"}}}
        result = _get_address_detail(
            app_dict, Registration.RegistrationType.STRATA_HOTEL, "streetNumber"
        )
        assert result == ""


class TestGetExpiryDate:
    def test_formats_valid_iso_date(self):
        app_dict = {"header": {"registrationEndDate": "2025-12-15T00:00:00+00:00"}}
        result = _get_expiry_date(app_dict)
        assert "December" in result
        assert "2025" in result

    def test_returns_empty_when_no_date(self):
        assert _get_expiry_date({"header": {}}) == ""

    def test_returns_empty_when_no_header(self):
        assert _get_expiry_date({}) == ""

    def test_returns_empty_when_date_is_none(self):
        assert _get_expiry_date({"header": {"registrationEndDate": None}}) == ""


class TestGetServiceProvider:
    def test_platform_returns_legal_name(self):
        app_dict = {"registration": {"businessDetails": {"legalName": "Acme Rentals Ltd."}}}
        result = _get_service_provider(app_dict, Registration.RegistrationType.PLATFORM)
        assert result == "Acme Rentals Ltd."

    def test_host_returns_empty_string(self):
        app_dict = {"registration": {"businessDetails": {"legalName": "Acme Rentals Ltd."}}}
        result = _get_service_provider(app_dict, Registration.RegistrationType.HOST)
        assert result == ""

    def test_strata_hotel_returns_empty_string(self):
        app_dict = {"registration": {"businessDetails": {"legalName": "Acme"}}}
        result = _get_service_provider(app_dict, Registration.RegistrationType.STRATA_HOTEL)
        assert result == ""


class TestGetClientRecipients:
    def test_host_returns_primary_contact_email(self):
        app_dict = {
            "registration": {
                "registrationType": Registration.RegistrationType.HOST.value,
                "primaryContact": {"emailAddress": "host@example.com"},
            }
        }
        result = _get_client_recipients(app_dict)
        assert result == "host@example.com"

    def test_host_with_property_manager_contact_email(self):
        app_dict = {
            "registration": {
                "registrationType": Registration.RegistrationType.HOST.value,
                "primaryContact": {"emailAddress": "host@example.com"},
                "propertyManager": {"contact": {"emailAddress": "pm@example.com"}},
            }
        }
        result = _get_client_recipients(app_dict)
        assert "host@example.com" in result
        assert "pm@example.com" in result

    def test_host_with_property_manager_business_email(self):
        app_dict = {
            "registration": {
                "registrationType": Registration.RegistrationType.HOST.value,
                "primaryContact": {"emailAddress": "host@example.com"},
                "propertyManager": {
                    "business": {"primaryContact": {"emailAddress": "biz@example.com"}}
                },
            }
        }
        result = _get_client_recipients(app_dict)
        assert "host@example.com" in result
        assert "biz@example.com" in result

    def test_platform_returns_empty_string(self):
        app_dict = {
            "registration": {
                "registrationType": Registration.RegistrationType.PLATFORM.value,
            }
        }
        assert _get_client_recipients(app_dict) == ""

    def test_strata_hotel_returns_empty_string(self):
        app_dict = {
            "registration": {
                "registrationType": Registration.RegistrationType.STRATA_HOTEL.value,
            }
        }
        assert _get_client_recipients(app_dict) == ""


class TestGetRentalNickname:
    def test_host_with_nickname_returns_nickname(self):
        app_dict = {"registration": {"unitAddress": {"nickname": "Beach House"}}}
        result = _get_rental_nickname(app_dict, Registration.RegistrationType.HOST)
        assert result == "Beach House"

    def test_host_without_nickname_returns_none(self):
        app_dict = {"registration": {"unitAddress": {}}}
        result = _get_rental_nickname(app_dict, Registration.RegistrationType.HOST)
        assert result is None

    def test_platform_returns_none(self):
        app_dict = {"registration": {"unitAddress": {"nickname": "Beach House"}}}
        result = _get_rental_nickname(app_dict, Registration.RegistrationType.PLATFORM)
        assert result is None

    def test_strata_hotel_returns_none(self):
        app_dict = {"registration": {"unitAddress": {"nickname": "Resort"}}}
        result = _get_rental_nickname(app_dict, Registration.RegistrationType.STRATA_HOTEL)
        assert result is None
