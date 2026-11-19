"""Tests for document upload validation."""

from io import BytesIO

import pytest
from flask import Flask, request
from werkzeug.datastructures import FileStorage

from strr_api.enums.enum import ContentType
from strr_api.exceptions import ValidationException
from strr_api.validators.DocumentUploadValidator import (
    HEADER_READ_LENGTH,
    MAX_FILE_SIZE,
    detect_content_type,
    validate_document_upload,
)

PDF_CONTENT = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"
JPEG_CONTENT = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01" + b"\x00" * 32
PNG_CONTENT = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


def _file(content: bytes, filename: str, content_type: str) -> FileStorage:
    return FileStorage(stream=BytesIO(content), filename=filename, content_type=content_type)


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


@pytest.mark.parametrize(
    "content, filename, content_type",
    [
        (PDF_CONTENT, "a.pdf", "application/pdf"),
        (JPEG_CONTENT, "a.jpg", "image/jpeg"),
        (PDF_CONTENT, "a.pdf", "Application/PDF"),
    ],
    ids=["pdf", "jpeg", "pdf-mixed-case-type"],
)
def test_validate_document_upload_returns_file_with_stream_rewound(content, filename, content_type):
    f = _file(content, filename, content_type)
    assert validate_document_upload({"file": f}) is f
    # The endpoints call file.read() after validating, so the whole file must still be readable.
    assert f.read() == content


def test_validate_document_upload_pdf_header_after_leading_bytes_accepted():
    content = b"\x00" * 100 + PDF_CONTENT
    f = _file(content, "a.pdf", ContentType.PDF.value)
    assert validate_document_upload({"file": f}) is f


@pytest.mark.parametrize("content_type", ["text/plain", "image/png", "application/octet-stream", ""])
def test_validate_document_upload_unsupported_type_raises(content_type):
    f = _file(PDF_CONTENT, "a.pdf", content_type)
    with pytest.raises(ValidationException) as exc:
        validate_document_upload({"file": f})
    assert "is not supported" in exc.value.message


@pytest.mark.parametrize(
    "content, filename, content_type",
    [
        (PDF_CONTENT, "a.jpg", ContentType.JPEG.value),  # PDF renamed to .jpg
        (JPEG_CONTENT, "a.pdf", ContentType.PDF.value),  # JPEG renamed to .pdf
        (PNG_CONTENT, "a.jpg", ContentType.JPEG.value),  # unsupported format with an allowed extension
        (b"hello", "a.pdf", ContentType.PDF.value),  # text with an allowed extension
        (b"", "a.pdf", ContentType.PDF.value),  # empty file
    ],
    ids=["pdf-as-jpg", "jpeg-as-pdf", "png-as-jpg", "text-as-pdf", "empty-file"],
)
def test_validate_document_upload_contents_mismatch_raises(content, filename, content_type):
    f = _file(content, filename, content_type)
    with pytest.raises(ValidationException) as exc:
        validate_document_upload({"file": f})
    assert "do not match" in exc.value.message
    assert exc.value.status_code == 400


@pytest.mark.parametrize(
    "header, expected",
    [
        (PDF_CONTENT, ContentType.PDF),
        (JPEG_CONTENT, ContentType.JPEG),
        (PNG_CONTENT, None),
        (b"", None),
        (b"\x00" * HEADER_READ_LENGTH + b"%PDF-", None),  # header beyond the search window
    ],
    ids=["pdf", "jpeg", "png", "empty", "pdf-header-too-late"],
)
def test_detect_content_type(header, expected):
    assert detect_content_type(header) == expected


def test_validate_document_upload_file_at_max_size_accepted():
    content = PDF_CONTENT + b"\x00" * (MAX_FILE_SIZE - len(PDF_CONTENT))
    f = _file(content, "a.pdf", ContentType.PDF.value)
    assert validate_document_upload({"file": f}) is f
    assert len(f.read()) == MAX_FILE_SIZE


def test_validate_document_upload_file_over_max_size_raises():
    content = PDF_CONTENT + b"\x00" * (MAX_FILE_SIZE + 1 - len(PDF_CONTENT))
    f = _file(content, "a.pdf", ContentType.PDF.value)
    with pytest.raises(ValidationException) as exc:
        validate_document_upload({"file": f})
    assert "maximum size" in exc.value.message
    assert exc.value.status_code == 413


@pytest.fixture
def upload_client():
    """Minimal app with a document upload route guarded by the request size cap."""
    app = Flask(__name__)

    @app.post("/upload")
    def upload():
        return {"size": len(request.files["file"].read())}, 201

    @app.post("/other")
    def other():
        return {"size": len(request.get_data())}, 200

    return app.test_client()
