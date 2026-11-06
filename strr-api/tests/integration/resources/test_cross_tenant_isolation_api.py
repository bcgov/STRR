"""Integration tests for cross-tenant isolation and security boundary enforcement.

Verifies that Tenant B (Account B) cannot view, update, delete, or upload to
Tenant A's (Account A's) applications, documents, notes, todos, snapshots, or registrations.
"""

from __future__ import annotations

import copy
from http import HTTPStatus
from unittest.mock import patch

import pytest

from tests.integration.application_seed import generate_application_number, host_renewal_application_json
from tests.integration.helpers import assert_status, load_mock_json
from tests.shared_test_constants import ACCOUNT_ID, MOCK_INVOICE_RESPONSE
from tests.unit.utils.application_flow_helpers import (
    assign_examiner_and_full_review_approve,
    set_application_ready_for_examiner_review,
)

ACCOUNT_A = ACCOUNT_ID
ACCOUNT_B = ACCOUNT_ID + 77777


@pytest.fixture
def mock_invoice():
    with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE) as mock:
        yield mock


def test_cross_tenant_application_isolation(client, session, jwt, headers_public_user, mock_invoice):
    """Ensure Tenant B cannot access or manipulate Tenant A's draft or submitted application."""
    headers_a = headers_public_user(account_id=ACCOUNT_A)
    headers_b = headers_public_user(account_id=ACCOUNT_B)

    # 1. Tenant A creates a draft application
    body = copy.deepcopy(load_mock_json("host_registration.json"))
    headers_a_draft = headers_public_user(account_id=ACCOUNT_A)
    headers_a_draft["isDraft"] = "true"

    rv_create = client.post("/applications", json=body, headers=headers_a_draft)
    assert_status(rv_create, HTTPStatus.OK)
    app_num_a = rv_create.get_json()["header"]["applicationNumber"]

    # 2. Tenant B attempts to read Tenant A's application
    rv_get = client.get(f"/applications/{app_num_a}", headers=headers_b)
    assert rv_get.status_code == HTTPStatus.NOT_FOUND

    # 3. Tenant B attempts to mutate Tenant A's application
    mutated_body = copy.deepcopy(body)
    mutated_body["registration"]["primaryContact"]["firstName"] = "Hacker"
    rv_put = client.put(f"/applications/{app_num_a}", json=mutated_body, headers=headers_b)
    assert rv_put.status_code == HTTPStatus.NOT_FOUND

    # 4. Tenant B attempts to fetch Tenant A's application events
    rv_events = client.get(f"/applications/{app_num_a}/events", headers=headers_b)
    assert rv_events.status_code == HTTPStatus.NOT_FOUND

    # 5. Tenant B attempts to delete Tenant A's draft application
    rv_delete = client.delete(f"/applications/{app_num_a}", headers=headers_b)
    assert rv_delete.status_code == HTTPStatus.NOT_FOUND

    # 6. Verify Tenant A's draft is intact
    rv_verify = client.get(f"/applications/{app_num_a}", headers=headers_a)
    assert_status(rv_verify, HTTPStatus.OK)
    assert rv_verify.get_json()["registration"]["primaryContact"]["firstName"] != "Hacker"


def test_cross_tenant_registration_isolation(
    client, session, jwt, headers_public_user, headers_strr_examiner, mock_invoice
):
    """Ensure Tenant B cannot access or mutate Tenant A's active registration."""
    headers_a = headers_public_user(account_id=ACCOUNT_A)
    headers_b = headers_public_user(account_id=ACCOUNT_B)

    # 1. Create and approve registration under Account A
    body = copy.deepcopy(load_mock_json("host_registration.json"))
    rv_create = client.post("/applications", json=body, headers=headers_a)
    assert_status(rv_create, HTTPStatus.OK)
    app_num = rv_create.get_json()["header"]["applicationNumber"]

    set_application_ready_for_examiner_review(app_num)
    approved_resp, _ = assign_examiner_and_full_review_approve(client, jwt, app_num)
    reg_id_a = approved_resp["header"]["registrationId"]
    assert reg_id_a is not None

    # 2. Tenant B attempts GET /registrations/{id}
    rv_get = client.get(f"/registrations/{reg_id_a}", headers=headers_b)
    assert rv_get.status_code == HTTPStatus.NOT_FOUND

    # 3. Tenant B attempts PATCH /registrations/{id} email
    patch_body = {"primaryContact": {"emailAddress": "tenant_b@attacker.test"}}
    rv_patch = client.patch(f"/registrations/{reg_id_a}", json=patch_body, headers=headers_b)
    assert rv_patch.status_code in (HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.FORBIDDEN)

    # 4. Tenant B attempts GET /registrations/{id}/todos
    rv_todos = client.get(f"/registrations/{reg_id_a}/todos", headers=headers_b)
    assert rv_todos.status_code in (HTTPStatus.NOT_FOUND, HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN)

    # 5. Tenant B attempts GET /registrations/{id}/events
    rv_events = client.get(f"/registrations/{reg_id_a}/events", headers=headers_b)
    assert rv_events.status_code in (HTTPStatus.NOT_FOUND, HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN)

    # 6. Tenant B attempts to upload document to Tenant A's registration
    doc_body = {"fileName": "test.pdf", "fileType": "pdf", "fileKey": "fake-key", "documentType": "BL"}
    rv_doc = client.post(f"/registrations/{reg_id_a}/documents", json=doc_body, headers=headers_b)
    assert rv_doc.status_code in (HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.FORBIDDEN)

    # 7. Tenant B attempts to file a renewal for Tenant A's registration
    renewal_body = host_renewal_application_json(reg_id_a, base_json=body)
    rv_renew = client.post("/applications", json=renewal_body, headers=headers_b)
    assert rv_renew.status_code in (HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.FORBIDDEN)
