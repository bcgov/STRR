"""Integration tests for ``/documents`` (global upload/delete)."""

from http import HTTPStatus
from io import BytesIO
from unittest.mock import patch

from strr_api.exceptions import ExternalServiceException
from tests.integration.helpers import assert_status, assert_unauthenticated_returns_401_for_protected_prefix


def test_documents_routes_require_auth_without_bearer(client, app):
    assert_unauthenticated_returns_401_for_protected_prefix(client, app, "/documents")


def test_post_documents_validation_no_file_bad_request(client, headers_public_user):
    rv = client.post(
        "/documents",
        data={},
        content_type="multipart/form-data",
        headers=headers_public_user(account_id=None),
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_post_documents_ok_patched_upload(client, headers_public_user):
    with patch(
        "strr_api.services.document_service.DocumentService.upload_document",
        return_value={"fileKey": "global-doc-1", "fileName": "a.txt", "fileType": "text/plain"},
    ) as mock_upload:
        rv = client.post(
            "/documents",
            headers=headers_public_user(account_id="12345"),
            data={"file": (BytesIO(b"x"), "a.txt"), "documentType": "BC_DRIVERS_LICENSE"},
            content_type="multipart/form-data",
        )
    assert_status(rv, HTTPStatus.CREATED)
    body = rv.get_json()
    assert body.get("fileKey") == "global-doc-1"
    metadata = mock_upload.call_args.kwargs["metadata"]
    assert metadata["account_id"] == "12345"
    assert metadata["document_type"] == "BC_DRIVERS_LICENSE"
    assert metadata["uploaded_by"] == "test-user"
    assert metadata["uploaded_by_idp_userid"] == "123"


def test_delete_documents_ok_patched(client, headers_public_user):
    with patch("strr_api.services.document_service.DocumentService.delete_document", return_value=None):
        rv = client.delete("/documents/global-doc-1", headers=headers_public_user(account_id=None))
    assert_status(rv, HTTPStatus.NO_CONTENT)


def test_delete_documents_external_error(client, headers_public_user):
    with patch(
        "strr_api.services.document_service.DocumentService.delete_document",
        side_effect=ExternalServiceException(
            error="downstream",
            message="storage unavailable",
            status_code=HTTPStatus.BAD_GATEWAY,
        ),
    ):
        rv = client.delete("/documents/missing", headers=headers_public_user(account_id=None))
    assert rv.status_code == HTTPStatus.BAD_GATEWAY
