"""Integration tests for Role-Based Access Control (RBAC) across staff and public endpoints."""

from __future__ import annotations

from http import HTTPStatus

import pytest

from tests.integration.application_seed import generate_application_number
from tests.integration.helpers import assert_status
from tests.shared_test_constants import ACCOUNT_ID

STAFF_ONLY_ROUTES = [
    ("PUT", "/applications/{app_num}/assign", {}),
    ("PUT", "/applications/{app_num}/unassign", {}),
    ("PUT", "/applications/{app_num}/status", {"status": "FULL_REVIEW_APPROVED"}),
    ("POST", "/applications/{app_num}/notice-of-consideration", {"content": "Test notice"}),
    ("POST", "/applications/{app_num}/decision/set-aside", {}),
    ("GET", "/applications/search?text=test", None),
    ("PUT", "/registrations/{reg_id}/assign", {}),
    ("PUT", "/registrations/{reg_id}/unassign", {}),
    ("PUT", "/registrations/{reg_id}/status", {"status": "SUSPENDED"}),
    ("POST", "/registrations/{reg_id}/notice-of-consideration", {"content": "Test notice"}),
    ("POST", "/registrations/{reg_id}/decision/set-aside", {}),
    ("GET", "/registrations/search?text=test", None),
]


@pytest.mark.parametrize("method,route_tmpl,body", STAFF_ONLY_ROUTES)
def test_staff_endpoints_forbidden_for_public_users(
    client,
    session,
    headers_public_user,
    serializable_application,
    serializable_host_registration,
    method,
    route_tmpl,
    body,
):
    """Ensure that public (host) users receive 403 Forbidden on all staff examiner endpoints."""
    app_num = serializable_application["application_number"]
    reg_id = serializable_host_registration["registration_id"]
    url = route_tmpl.format(app_num=app_num, reg_id=reg_id)

    pub_headers = headers_public_user(account_id=ACCOUNT_ID)
    if method == "GET":
        rv = client.get(url, headers=pub_headers)
    elif method == "PUT":
        rv = client.put(url, json=body, headers=pub_headers)
    elif method == "POST":
        rv = client.post(url, json=body, headers=pub_headers)

    assert rv.status_code in (
        HTTPStatus.FORBIDDEN,
        HTTPStatus.UNAUTHORIZED,
    ), f"Expected 403 or 401 on {method} {url}, got {rv.status_code}"


@pytest.mark.parametrize("method,route_tmpl,body", STAFF_ONLY_ROUTES)
def test_staff_endpoints_unauthorized_without_token(
    client, serializable_application, serializable_host_registration, method, route_tmpl, body
):
    """Ensure that unauthenticated callers receive 401 Unauthorized on staff endpoints."""
    app_num = serializable_application["application_number"]
    reg_id = serializable_host_registration["registration_id"]
    url = route_tmpl.format(app_num=app_num, reg_id=reg_id)

    if method == "GET":
        rv = client.get(url)
    elif method == "PUT":
        rv = client.put(url, json=body)
    elif method == "POST":
        rv = client.post(url, json=body)

    assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"Expected 401 on {method} {url}, got {rv.status_code}"


def test_expiry_update_requires_strr_tester_role(
    client, serializable_host_registration, headers_public_user, headers_strr_examiner, headers_strr_tester
):
    """Ensure that PUT /registrations/{number}/expiry is restricted to users with strr_tester role."""
    reg_num = "R999999999"
    url = f"/registrations/{reg_num}/expiry"
    body = {"expiryDate": "2030-01-01"}

    # Public user -> 403 / 401
    rv_pub = client.put(url, json=body, headers=headers_public_user())
    assert rv_pub.status_code in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED)

    # Examiner without strr_tester -> 403 / 401
    rv_exam = client.put(url, json=body, headers=headers_strr_examiner())
    assert rv_exam.status_code in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED)

    # Tester role -> passes auth (returns 404 for non-existent number, proving role was accepted)
    rv_tester = client.put(url, json=body, headers=headers_strr_tester())
    assert rv_tester.status_code == HTTPStatus.NOT_FOUND
