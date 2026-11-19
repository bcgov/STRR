"""Validator for document upload requests."""

import io
from functools import wraps
from http import HTTPStatus

from flask import request

from strr_api.enums.enum import ContentType
from strr_api.exceptions import ValidationException

# Keep in sync with the `accept` lists on the web apps' upload components.
ALLOWED_CONTENT_TYPES = (ContentType.PDF, ContentType.JPEG)

# Keep in sync with the `maxFileSize` default on the web apps' upload components.
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
# Headroom on top of the file for the multipart framing and the other form fields.
MAX_REQUEST_OVERHEAD = 1024 * 1024  # 1 MB

PDF_SIGNATURE = b"%PDF-"
JPEG_SIGNATURE = b"\xff\xd8\xff"

# PDF readers accept the %PDF- header anywhere in the first 1024 bytes, so search that far.
HEADER_READ_LENGTH = 1024


def limit_document_upload_size(view):
    """Cap the request body size on a document upload endpoint.

    Werkzeug rejects a larger body with 413 Request Entity Too Large when the form is parsed,
    without reading the whole body. validate_document_upload still enforces MAX_FILE_SIZE on the
    file itself; this only stops oversized requests from being read in full first. Applied per
    endpoint rather than through the app-wide MAX_CONTENT_LENGTH so other endpoints (e.g. bulk
    permit validation) are unaffected. Place it below @jwt.requires_auth so auth is checked first.
    """

    @wraps(view)
    def wrapper(*args, **kwargs):
        request.max_content_length = MAX_FILE_SIZE + MAX_REQUEST_OVERHEAD
        return view(*args, **kwargs)

    return wrapper


def detect_content_type(header: bytes) -> ContentType | None:
    """Return the content type identified by a file's leading bytes, or None if unrecognized."""
    if header.startswith(JPEG_SIGNATURE):
        return ContentType.JPEG
    if PDF_SIGNATURE in header[:HEADER_READ_LENGTH]:
        return ContentType.PDF
    return None


def validate_document_upload(request_files_segment):
    """Validate document upload.

    Checks that a file is present, that it is no larger than MAX_FILE_SIZE, that its
    declared content type is allowed, and that its contents really are that type
    (e.g. a PDF renamed to .jpg is rejected).
    """

    if "file" not in request_files_segment:
        raise ValidationException(message="No file part found in POST body contents .")

    file = request_files_segment["file"]
    if not file or file.filename == "":
        raise ValidationException(message="No file contents found.")

    file_size = file.stream.seek(0, io.SEEK_END)
    file.stream.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise ValidationException(
            message=f"File is larger than the maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB.",
            status_code=HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
        )

    declared_type = (file.mimetype or "").lower()
    if declared_type not in {content_type.value for content_type in ALLOWED_CONTENT_TYPES}:
        raise ValidationException(message=f"File type '{declared_type}' is not supported. Upload a PDF or JPEG file.")

    header = file.stream.read(HEADER_READ_LENGTH)
    # Rewind so callers' file.read() gets the whole file.
    file.stream.seek(0)

    detected_type = detect_content_type(header)
    if detected_type is None or detected_type.value != declared_type:
        raise ValidationException(message=f"File contents do not match the file type '{declared_type}'.")

    return file
