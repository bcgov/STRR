"""Tests for custom exception defaults."""

from http import HTTPStatus

from strr_api.exceptions.exceptions import (
    AuthException,
    ExternalServiceException,
    JurisdictionUpdateException,
    ValidationException,
)


def test_validation_exception_defaults():
    ex = ValidationException()
    assert ex.error == "Validation Error"
    assert ex.message == "Invalid request."
    assert ex.status_code == HTTPStatus.BAD_REQUEST


def test_validation_exception_custom_message():
    ex = ValidationException(message="Custom")
    assert ex.message == "Custom"


def test_auth_exception_defaults():
    ex = AuthException()
    assert "Unauthorized" in ex.message or ex.message == "Unauthorized access."
    assert ex.status_code == HTTPStatus.FORBIDDEN


def test_external_service_exception_defaults():
    ex = ExternalServiceException()
    assert "3rd party" in ex.message
    assert ex.status_code == HTTPStatus.BAD_GATEWAY


def test_jurisdiction_update_exception_defaults():
    ex = JurisdictionUpdateException()
    assert ex.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


def test_jurisdiction_update_exception_with_existing_error():
    ex = JurisdictionUpdateException(error="boundary")
    assert "boundary" in str(ex.error)
