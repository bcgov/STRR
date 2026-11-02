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

from datetime import datetime, timedelta, timezone
from http import HTTPStatus

import pytest

from strr_api.enums.enum import OAuthScope, RegistrationStatus, RegistrationType
from strr_api.models import (
    Address,
    Contact,
    Platform,
    PlatformBrand,
    PlatformRegistration,
    PlatformRepresentative,
    Registration,
    StrataHotel,
    StrataHotelBuilding,
    StrataHotelRegistration,
    StrataHotelRepresentative,
    User,
)
from strr_api.services.registration_service import RegistrationService
from tests.integration.helpers import assert_json_keys, assert_status
from tests.integration.registration_seed import seed_serializable_host_registration
from tests.unit.utils.auth_helpers import create_header

READ_SCOPE = OAuthScope.REGISTRATIONS_READ.value
EXPORT_SCOPE = OAuthScope.REGISTRATIONS_EXPORT.value
PII_SCOPE = OAuthScope.REGISTRATIONS_PII_READ.value


# ---------------------------------------------------------------------------
# Seed Helpers for Polymorphic Registrations
# ---------------------------------------------------------------------------


def seed_platform_registration(session, account_id: int, registration_number: str) -> Registration:
    """Insert a complete PLATFORM registration graph into the test database."""
    owner = User(username=f"owner_{registration_number}")
    session.add(owner)
    session.flush()

    addr = Address(
        country="CA",
        street_address="1055 W Georgia St",
        city="Vancouver",
        province="BC",
        postal_code="V6E 4N7",
    )
    session.add(addr)
    session.flush()

    contact = Contact(
        firstname="Alice",
        lastname="Wong",
        job_title="Director of Regulatory Compliance",
        email="alice.wong@example.com",
        phone_number="604-555-0144",
        address_id=addr.id,
    )
    session.add(contact)
    session.flush()

    brand = PlatformBrand(name="GlobalStay", website="https://www.globalstay.example.com")
    platform = Platform(
        legal_name="Global Booking Corp.",
        home_jurisdiction="BC, Canada",
        business_number="123456789BC0001",
        primary_non_compliance_notice_email="notices@example.com",
        primary_take_down_request_email="takedown@example.com",
        mailingAddress=addr,
        brands=[brand],
        representatives=[PlatformRepresentative(contact=contact)],
    )
    reg_plat = PlatformRegistration(platform=platform)
    now = datetime.now(timezone.utc)
    reg = Registration(
        registration_type=RegistrationType.PLATFORM.value,
        registration_number=registration_number,
        sbc_account_id=account_id,
        status=RegistrationStatus.ACTIVE,
        user_id=owner.id,
        start_date=now,
        expiry_date=now + timedelta(days=365),
        platform_registration=reg_plat,
    )
    session.add(reg)
    session.flush()
    return reg


def seed_strata_hotel_registration(session, account_id: int, registration_number: str) -> Registration:
    """Insert a complete STRATA_HOTEL registration graph into the test database."""
    owner = User(username=f"owner_{registration_number}")
    session.add(owner)
    session.flush()

    addr = Address(
        country="CA",
        street_address="4000 Whistler Way",
        city="Whistler",
        province="BC",
        postal_code="V8E 1J2",
    )
    bld_addr = Address(
        country="CA",
        street_address="4000 Whistler Way - North Tower",
        city="Whistler",
        province="BC",
        postal_code="V8E 1J2",
    )
    session.add_all([addr, bld_addr])
    session.flush()

    contact = Contact(
        firstname="David",
        lastname="Miller",
        job_title="General Manager",
        email="dmiller@whistlerpeak.example.com",
        phone_number="604-555-0188",
        address_id=addr.id,
    )
    session.add(contact)
    session.flush()

    sh = StrataHotel(
        legal_name="Whistler Peak Lodging Ltd.",
        home_jurisdiction="BC, Canada",
        business_number="888777666BC0001",
        brand_name="Whistler Peak Residences",
        website="https://whistlerpeak.example.com",
        number_of_units=120,
        mailingAddress=addr,
        location=addr,
        buildings=[StrataHotelBuilding(address=bld_addr)],
        representatives=[StrataHotelRepresentative(contact=contact)],
        unit_listings={
            "primary": "101\n 102, 103 \r\n 104 \n",
            "additional": ["201, 202\n203", "301\n302"],
        },
    )
    sh_reg = StrataHotelRegistration(strata_hotel=sh)
    now = datetime.now(timezone.utc)
    reg = Registration(
        registration_type=RegistrationType.STRATA_HOTEL.value,
        registration_number=registration_number,
        sbc_account_id=account_id,
        status=RegistrationStatus.ACTIVE,
        user_id=owner.id,
        start_date=now,
        expiry_date=now + timedelta(days=365),
        strata_hotel_registration=sh_reg,
    )
    session.add(reg)
    session.flush()
    return reg


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# 1. Authentication & Scope Authorization Tests
# ---------------------------------------------------------------------------


def test_query_unauthenticated_returns_401(client):
    """Calling query endpoint without an Authorization header returns 401 Unauthorized."""
    rv = client.post("/registrations:query", json={})
    assert_status(rv, HTTPStatus.UNAUTHORIZED)


def test_query_broad_sync_forbidden_without_export_scope(client, auth_header_read_only):
    """Attempting broad CDC sync without export scope is rejected with 403 Forbidden."""
    rv = client.post(
        "/registrations:query",
        json={"updatedSince": "2026-01-01T00:00:00Z"},
        headers=auth_header_read_only,
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)
    assert "strr.registrations:export" in rv.json.get("message", "")


def test_query_targeted_forbidden_without_read_scope(client, jwt):
    """Caller with token lacking read scope attempting targeted lookup is rejected with 403."""
    headers = create_header(
        jwt,
        roles=[],
        username="m2m-unauthorized-service",
        additional_claims={"scope": "unrelated.service:read"},
    )
    rv = client.post(
        "/registrations:query",
        json={"registrationNumbers": ["H123456789"]},
        headers=headers,
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)
    assert "strr.registrations:read" in rv.json.get("message", "")


def test_query_roles_alone_without_scope_rejected_403(client, jwt):
    """Caller presenting Keycloak roles but lacking OAuth2 scope is rejected with 403."""
    headers = create_header(
        jwt,
        roles=["strr_examiner", "staff"],
        username="staff-examiner",
    )
    rv = client.post(
        "/registrations:query",
        json={"registrationNumbers": ["H123456789"]},
        headers=headers,
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)
    assert "strr.registrations:read" in rv.json.get("message", "")


# ---------------------------------------------------------------------------
# 2. Polymorphic Snapshot Schemas (HOST, PLATFORM, STRATA_HOTEL)
# ---------------------------------------------------------------------------


def test_query_targeted_lookup_ok_and_pii_masked(client, session, auth_header_read_only, integration_account_id):
    """Targeted lookup with read-only scope returns requested HOST registration with masked PII."""
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
    assert "unitAddress" in item
    assert "unitDetails" in item


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


def test_query_platform_snapshot_shape(client, session, auth_header_read_only, integration_account_id):
    """Verify that PLATFORM snapshot conforms to OpenAPI PlatformRegistrationSnapshot."""
    seed_platform_registration(
        session,
        account_id=integration_account_id,
        registration_number="PL100000001",
    )
    session.commit()

    rv = client.post(
        "/registrations:query",
        json={"registrationNumbers": ["PL100000001"]},
        headers=auth_header_read_only,
    )
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "items")
    assert len(data["items"]) == 1

    item = data["items"][0]
    assert item["registrationNumber"] == "PL100000001"
    assert item["registrationType"] == "PLATFORM"
    assert "businessDetails" in item
    assert item["businessDetails"]["legalName"] == "Global Booking Corp."
    assert "platformDetails" in item
    assert len(item["platformDetails"]["brands"]) >= 1
    assert "platformRepresentatives" in item
    assert len(item["platformRepresentatives"]) >= 1


def test_query_strata_hotel_snapshot_shape(client, session, auth_header_read_only, integration_account_id):
    """Verify that STRATA_HOTEL snapshot conforms to OpenAPI StrataHotelRegistrationSnapshot with normalized unit listings."""
    seed_strata_hotel_registration(
        session,
        account_id=integration_account_id,
        registration_number="ST200000001",
    )
    session.commit()

    rv = client.post(
        "/registrations:query",
        json={"registrationNumbers": ["ST200000001"]},
        headers=auth_header_read_only,
    )
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "items")
    assert len(data["items"]) == 1

    item = data["items"][0]
    assert item["registrationNumber"] == "ST200000001"
    assert item["registrationType"] == "STRATA_HOTEL"
    assert "businessDetails" in item
    assert "strataHotelDetails" in item

    sh_details = item["strataHotelDetails"]
    assert sh_details["numberOfUnits"] == 120
    assert sh_details["unitListings"]["primary"] == ["101", "102", "103", "104"]
    assert len(sh_details["buildings"]) >= 1


# ---------------------------------------------------------------------------
# 3. Request Validation (400 Bad Request)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("invalid_limit", [0, -1, 501, "invalid"])
def test_query_limit_validation(client, auth_header_export_pii, invalid_limit):
    """Limits outside 1..500 or non-integer are rejected with 400 Bad Request."""
    rv = client.post(
        "/registrations:query",
        json={"limit": invalid_limit},
        headers=auth_header_export_pii,
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_query_unknown_properties_rejected(client, auth_header_export_pii):
    """Payload with properties not defined in schema is rejected (additionalProperties: false)."""
    rv = client.post(
        "/registrations:query",
        json={"limit": 10, "unknownField": "unexpected"},
        headers=auth_header_export_pii,
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_query_invalid_timestamp_rejected(client, auth_header_export_pii):
    """Invalid updatedSince timestamp format is rejected with 400 Bad Request."""
    rv = client.post(
        "/registrations:query",
        json={"updatedSince": "not-a-datetime"},
        headers=auth_header_export_pii,
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_query_empty_numbers_array_rejected(client, auth_header_read_only):
    """Empty registrationNumbers array fails minItems: 1 validation with 400 Bad Request."""
    rv = client.post(
        "/registrations:query",
        json={"registrationNumbers": []},
        headers=auth_header_read_only,
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_query_excessive_numbers_array_rejected(client, auth_header_read_only):
    """Arrays exceeding 500 items fail maxItems: 500 validation with 400 Bad Request."""
    rv = client.post(
        "/registrations:query",
        json={"registrationNumbers": [f"H{i:09d}" for i in range(501)]},
        headers=auth_header_read_only,
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


# ---------------------------------------------------------------------------
# 4. Error Reporting & Deduplication
# ---------------------------------------------------------------------------


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


def test_query_targeted_deduplication(client, session, auth_header_read_only, integration_account_id):
    """Duplicate numbers in registrationNumbers are deduplicated without duplicate queries."""
    seeded = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H777888999",
    )
    session.commit()

    reg_num = seeded["registration_number"]
    payload = {"registrationNumbers": [reg_num, reg_num, reg_num]}

    rv = client.post("/registrations:query", json=payload, headers=auth_header_read_only)
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "items")
    assert len(data["items"]) == 1


# ---------------------------------------------------------------------------
# 5. Keyset Pagination & Cursor Security
# ---------------------------------------------------------------------------


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


def test_query_cursor_scope_mismatch_rejected(client, app, auth_header_export_pii):
    """Reusing cursor generated for different filter scope is rejected with 400 Bad Request."""
    with app.app_context():
        scope_hash_a = RegistrationService.compute_scope_hash(datetime(2026, 1, 1, tzinfo=timezone.utc), None)
        cursor_a = RegistrationService.generate_cursor(
            position={"changed": "2026-01-01T00:00:00Z", "registrationId": 1},
            scope_hash=scope_hash_a,
        )

    # Calling with different updatedSince produces scope mismatch
    rv = client.post(
        "/registrations:query",
        json={"updatedSince": "2026-06-01T00:00:00Z", "cursor": cursor_a},
        headers=auth_header_export_pii,
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)
    assert "scope does not match" in rv.json.get("message", "")


# ---------------------------------------------------------------------------
# 6. CDC Timestamp Filtering
# ---------------------------------------------------------------------------


def test_query_updated_since_filters_records(client, session, auth_header_export_pii, integration_account_id):
    """Records updated before updatedSince timestamp are excluded from CDC export."""
    older = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H100000010",
    )
    newer = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number="H100000020",
    )
    reg_old = session.get(Registration, older["registration_id"])
    reg_old.updated_date = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    reg_new = session.get(Registration, newer["registration_id"])
    reg_new.updated_date = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    session.commit()

    # Query changes since March 2026
    rv = client.post(
        "/registrations:query",
        json={"updatedSince": "2026-03-01T00:00:00Z"},
        headers=auth_header_export_pii,
    )
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "items")

    returned_numbers = [item["registrationNumber"] for item in data["items"]]
    assert "H100000020" in returned_numbers
    assert "H100000010" not in returned_numbers


# ---------------------------------------------------------------------------
# 7. Method & Route Interchangeability
# ---------------------------------------------------------------------------


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
