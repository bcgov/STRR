"""Validator for document upload requests."""

from strr_api.exceptions import ValidationException


def validate_document_upload(request_files_segment):
    """Validate document upload."""

    if "file" not in request_files_segment:
        raise ValidationException(message="No file part found in POST body contents .")

    file = request_files_segment["file"]
    if not file or file.filename == "":
        raise ValidationException(message="No file contents found.")

    return file
