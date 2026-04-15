"""Tests for document upload validation."""

import pytest

from strr_api.exceptions import ValidationException
from strr_api.validators.DocumentUploadValidator import validate_document_upload


def test_validate_document_upload_missing_file_key_raises():
    with pytest.raises(ValidationException) as exc:
        validate_document_upload({})
    assert "No file part" in exc.value.message


def test_validate_document_upload_empty_file_raises():
    with pytest.raises(ValidationException) as exc:
        validate_document_upload({"file": None})
    assert "No file contents" in exc.value.message


def test_validate_document_upload_empty_filename_raises():
    class _F:
        filename = ""

    with pytest.raises(ValidationException) as exc:
        validate_document_upload({"file": _F()})
    assert "No file contents" in exc.value.message


def test_validate_document_upload_returns_file():
    class _F:
        filename = "a.pdf"

    f = _F()
    assert validate_document_upload({"file": f}) is f
