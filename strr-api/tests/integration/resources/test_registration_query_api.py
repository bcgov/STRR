# Copyright © 2026 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
"""Integration tests for machine-to-machine /registrations:query endpoint."""
# pylint: disable=redefined-outer-name,too-many-arguments,too-many-positional-arguments

from http import HTTPStatus

import pytest

from strr_api.enums.enum import OAuthScope
from strr_api.models import Registration
from tests.integration.helpers import assert_json_keys, assert_status
from tests.integration.registration_seed import seed_serializable_host_registration
from tests.unit.utils.auth_helpers import create_header

READ_SCOPE = OAuthScope.REGISTRATIONS_READ.value
EXPORT_SCOPE = OAuthScope.REGISTRATIONS_EXPORT.value
PII_SCOPE = OAuthScope.REGISTRATIONS_PII_READ.value


@pytest.fixture
def auth_header_export_pii(jwt):
    """Header for caller with broad export and PII reading scopes (Ministry of Finance)."""
    return create_header(
        jwt,
        roles=[],
        username="m2m-finance-service",
        additional_claims={"scope": f"{EXPORT_SCOPE} {PII_SCOPE}"},
    )


@pytest.fixture
def auth_header_export_only(jwt):
    """Header for caller with broad export scope without PII (policy/analytics)."""
    return create_header(
        jwt,
        roles=[],
        username="m2m-analytics-service",
        additional_claims={"scope": EXPORT_SCOPE},
    )


@pytest.fixture
def auth_header_read_only(jwt):
    """Header for caller with targeted lookup scope (STR Data Portal)."""
    return create_header(
        jwt,
        roles=[],
        username="m2m-data-portal-service",
        additional_claims={"scope": READ_SCOPE},
    )


def test_query_unauthenticated_returns_401(client):
    """Calling query endpoint without an Authorization header returns 401 Unauthorized."""
    rv = client.post("/registrations:query", json={})
    assert_status(rv, HTTPStatus.UNAUTHORIZED)


def test_query_targeted_lookup_ok_and_pii_masked(client, session, auth_header_read_only, integration_account_id):
    """Targeted lookup with read-only scope returns requested registration with masked PII."""
    seeded = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H987654321",
    )
    session.commit()

    reg_num = seeded["registration_number"]
    payload = {"registrationNumbers": [reg_num]}

    rv = client.post("/registrations:query", json=payload, headers=auth_header_read_only)
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "items", "nextCursor")

    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["registrationNumber"] == reg_num
    assert item["registrationType"] == "HOST"
    assert item["status"] == "ACTIVE"

    # PII MUST be masked because caller only has strr.registrations:read
    primary = item["primaryContact"]
    assert primary["socialInsuranceNumber"] is None
    assert primary["dateOfBirth"] is None
    assert primary["emailAddress"] == "host@example.test"


def test_query_targeted_lookup_with_pii_unmasked(client, session, auth_header_export_pii, integration_account_id):
    """Caller with PII scope receives unmasked SIN and DOB."""
    seeded = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H111222333",
    )
    reg = session.get(Registration, seeded["registration_id"])
    contact = reg.rental_property.contacts[0].contact
    contact.social_insurance_number = "123 456 789"
    session.commit()

    reg_num = seeded["registration_number"]
    payload = {"registrationNumbers": [reg_num]}

    rv = client.post("/registrations:query", json=payload, headers=auth_header_export_pii)
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "items")

    item = data["items"][0]
    primary = item["primaryContact"]
    assert primary["socialInsuranceNumber"] == "123 456 789"
    assert primary["dateOfBirth"] == "1985-05-15"


def test_query_targeted_lookup_reports_invalid_and_not_found(
    client, session, auth_header_read_only, integration_account_id
):
    """Errors array correctly flags invalid numbers and not found registrations."""
    seeded = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H555666777",
    )
    session.commit()

    payload = {"registrationNumbers": [seeded["registration_number"], "H000000000", "INVALID#NUM"]}

    rv = client.post("/registrations:query", json=payload, headers=auth_header_read_only)
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "items", "errors")

    assert len(data["items"]) == 1
    errors = data["errors"]
    assert any(e["registrationNumber"] == "H000000000" and e["code"] == "NOT_FOUND" for e in errors)
    assert any(e["registrationNumber"] == "INVALID#NUM" and e["code"] == "INVALID_REGISTRATION_NUMBER" for e in errors)


def test_query_broad_sync_forbidden_without_export_scope(client, auth_header_read_only):
    """Attempting broad CDC sync without export scope is rejected with 403 Forbidden."""
    rv = client.post(
        "/registrations:query",
        json={"updatedSince": "2026-01-01T00:00:00Z"},
        headers=auth_header_read_only,
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)
    assert "strr.registrations:export" in rv.json.get("message", "")


def test_query_cdc_sync_and_keyset_pagination(client, session, auth_header_export_pii, integration_account_id):
    """Broad CDC feed sync with limit traverses pages via tamper-proof nextCursor."""
    seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H800000001",
    )
    seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H800000002",
    )
    session.commit()

    # Page 1
    rv1 = client.post(
        "/registrations:query",
        json={"limit": 1},
        headers=auth_header_export_pii,
    )
    assert_status(rv1, HTTPStatus.OK)
    page1 = assert_json_keys(rv1, "items", "nextCursor")
    assert len(page1["items"]) == 1
    cursor1 = page1["nextCursor"]
    assert cursor1 is not None

    # Page 2
    rv2 = client.post(
        "/registrations:query",
        json={"limit": 1, "cursor": cursor1},
        headers=auth_header_export_pii,
    )
    assert_status(rv2, HTTPStatus.OK)
    page2 = assert_json_keys(rv2, "items")
    assert len(page2["items"]) == 1
    assert page2["items"][0]["registrationNumber"] != page1["items"][0]["registrationNumber"]


def test_query_tampered_cursor_rejected(client, auth_header_export_pii):
    """Tampered or invalid cursor signature is rejected with 400 Bad Request."""
    rv = client.post(
        "/registrations:query",
        json={"cursor": "eyJhbGciOiJIUzI1NiJ9.invalidSignature"},
        headers=auth_header_export_pii,
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


@pytest.mark.parametrize(
    "route",
    [
        "/registrations:query",
        "/registrations/:query",
        "/registrations/query",
    ],
)
@pytest.mark.parametrize("method", ["POST", "QUERY"])
def test_query_routes_and_methods_interchangeable(
    client, session, auth_header_export_pii, integration_account_id, route, method
):
    """Verify that colon and slash routing variations support both POST and QUERY identically."""
    seeded = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H999888777",
    )
    session.commit()

    body = {"registrationNumbers": [seeded["registration_number"]]}
    rv = client.open(route, method=method, json=body, headers=auth_header_export_pii)
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "items")
    assert data["items"][0]["registrationNumber"] == seeded["registration_number"]
