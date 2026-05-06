"""Integration tests for ``/documents`` (global upload/delete)."""

from http import HTTPStatus
from io import BytesIO
from unittest.mock import patch

from strr_api.exceptions import ExternalServiceException
from tests.integration.helpers import (
    assert_status,
    protected_routes_with_prefix,
    resolve_path_for_unauth,
    unauthenticated_request,
)


def test_documents_routes_require_auth_without_bearer(client, app):
    rows = protected_routes_with_prefix(app, "/documents")
    assert rows, "expected at least one protected /documents route"
    for method, rule in rows:
        path = resolve_path_for_unauth(rule)
        rv = unauthenticated_request(client, method, path)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"{method} {rule}"


def test_post_documents_validation_no_file_bad_request(client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.post("/documents", data={}, content_type="multipart/form-data", headers=headers)
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_post_documents_ok_patched_upload(client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    with patch(
        "strr_api.services.document_service.DocumentService.upload_document",
        return_value={"fileKey": "global-doc-1", "fileName": "a.txt", "fileType": "text/plain"},
    ):
        rv = client.post(
            "/documents",
            headers=headers,
            data={"file": (BytesIO(b"x"), "a.txt")},
            content_type="multipart/form-data",
        )
    assert_status(rv, HTTPStatus.CREATED)
    body = rv.get_json()
    assert body.get("fileKey") == "global-doc-1"


def test_delete_documents_ok_patched(client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    with patch("strr_api.services.document_service.DocumentService.delete_document", return_value=None):
        rv = client.delete("/documents/global-doc-1", headers=headers)
    assert_status(rv, HTTPStatus.NO_CONTENT)


def test_delete_documents_external_error(client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    with patch(
        "strr_api.services.document_service.DocumentService.delete_document",
        side_effect=ExternalServiceException(
            error="downstream",
            message="storage unavailable",
            status_code=HTTPStatus.BAD_GATEWAY,
        ),
    ):
        rv = client.delete("/documents/missing", headers=headers)
    assert rv.status_code == HTTPStatus.BAD_GATEWAY
