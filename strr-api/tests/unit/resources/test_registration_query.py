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
"""Unit and integration tests for Registration Query API and Serializer."""

from datetime import date, datetime, timedelta, timezone
from http import HTTPStatus

import pytest

from strr_api.enums.enum import OAuthScope, PropertyType, RegistrationStatus, RegistrationType
from strr_api.exceptions import ValidationException
from strr_api.models import (
    Address,
    Contact,
    Platform,
    PlatformBrand,
    PlatformRegistration,
    PlatformRepresentative,
    PropertyContact,
    PropertyManager,
    Registration,
    RentalProperty,
    StrataHotel,
    StrataHotelBuilding,
    StrataHotelRegistration,
    StrataHotelRepresentative,
    User,
    db,
)
from strr_api.responses.RegistrationQuerySerializer import RegistrationQuerySerializer
from strr_api.services.registration_query_service import RegistrationQueryService
from tests.unit.utils.auth_helpers import create_header

READ_SCOPE = OAuthScope.REGISTRATIONS_READ.value
EXPORT_SCOPE = OAuthScope.REGISTRATIONS_EXPORT.value
PII_SCOPE = OAuthScope.REGISTRATIONS_PII_READ.value


@pytest.fixture
def test_user(session):
    """Create test user."""
    user = User(
        username="test_export_user",
        firstname="Tester",
        lastname="User",
        sub="test-export-sub-123",
        iss="test-iss",
        idp_userid="test-idp-123",
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def host_registration(session, test_user):
    """Create a complete sample HOST registration."""
    address_host = Address(
        country="CA",
        street_address="100 Government St",
        street_address_additional="Unit 402",
        city="Victoria",
        province="BC",
        postal_code="V8W 1W4",
        unit_number="402",
        street_number="100",
    )
    contact_host = Contact(
        firstname="Jane",
        lastname="Doe",
        middlename="Marie",
        preferredname="Janey",
        date_of_birth=date(1980, 5, 15),
        social_insurance_number="123 456 789",
        email="jane.doe@example.com",
        phone_number="250-555-0100",
        phone_country_code="001",
        address=address_host,
    )
    prop_contact_host = PropertyContact(
        is_primary=True,
        contact_type=PropertyContact.ContactType.INDIVIDUAL,
        contact=contact_host,
    )

    address_pm = Address(
        country="CA",
        street_address="500 Douglas St",
        street_address_additional="Suite 200",
        city="Victoria",
        province="BC",
        postal_code="V8V 2P8",
    )
    contact_pm = Contact(
        firstname="Robert",
        lastname="Smith",
        email="robert@islandpm.example.com",
        phone_number="250-555-0199",
        phone_country_code="001",
    )
    pm = PropertyManager(
        property_manager_type=PropertyManager.PropertyManagerType.BUSINESS,
        business_legal_name="Island Property Management Ltd.",
        business_number="987654321BC0001",
        business_mailing_address=address_pm,
        primary_contact=contact_pm,
    )

    rental_property = RentalProperty(
        nickname="Downtown Haven",
        parcel_identifier="001-234-567",
        local_business_licence="BL-2026-001",
        property_type=PropertyType.CONDO_OR_APT,
        address=address_host,
        contacts=[prop_contact_host],
        property_manager=pm,
    )

    reg = Registration(
        registration_type=RegistrationType.HOST.value,
        registration_number="H123456789",
        sbc_account_id=1,
        status=RegistrationStatus.ACTIVE,
        start_date=datetime(2026, 1, 15, tzinfo=timezone.utc),
        expiry_date=datetime(2027, 1, 15, tzinfo=timezone.utc),
        updated_date=datetime(2026, 9, 7, 18, 42, 11, tzinfo=timezone.utc),
        user_id=test_user.id,
        rental_property=rental_property,
        registration_json={"propertyManager": {"initiatedByPropertyManager": True}},
    )
    db.session.add(reg)
    db.session.commit()
    return reg


@pytest.fixture
def strata_hotel_registration(session, test_user):
    """Create a complete sample STRATA_HOTEL registration with multi-line unit listings."""
    loc_address = Address(
        country="CA",
        street_address="4000 Whistler Way",
        city="Whistler",
        province="BC",
        postal_code="V8E 1J2",
    )
    bld_address = Address(
        country="CA",
        street_address="4000 Whistler Way - North Tower",
        city="Whistler",
        province="BC",
        postal_code="V8E 1J2",
    )
    bld = StrataHotelBuilding(address=bld_address)

    contact_rep = Contact(
        firstname="David",
        lastname="Miller",
        job_title="General Manager",
        email="dmiller@whistlerpeak.example.com",
        phone_number="604-555-0188",
        phone_country_code="001",
    )
    rep = StrataHotelRepresentative(contact=contact_rep)

    strata_hotel = StrataHotel(
        legal_name="Whistler Peak Lodging Ltd.",
        home_jurisdiction="BC, Canada",
        business_number="888777666BC0001",
        brand_name="Whistler Peak Residences",
        website="https://whistlerpeak.example.com",
        number_of_units=120,
        mailingAddress=loc_address,
        location=loc_address,
        buildings=[bld],
        representatives=[rep],
        # multi-line and comma-separated raw values
        unit_listings={
            "primary": "101\n 102, 103 \r\n 104 \n",
            "additional": ["201, 202\n203", "301\n302"],
        },
    )
    sh_reg_map = StrataHotelRegistration(strata_hotel=strata_hotel)

    reg = Registration(
        registration_type=RegistrationType.STRATA_HOTEL.value,
        registration_number="ST200000001",
        sbc_account_id=2,
        status=RegistrationStatus.ACTIVE,
        start_date=datetime(2026, 3, 1, tzinfo=timezone.utc),
        expiry_date=datetime(2027, 3, 1, tzinfo=timezone.utc),
        updated_date=datetime(2026, 9, 9, 14, 22, 45, tzinfo=timezone.utc),
        user_id=test_user.id,
        strata_hotel_registration=sh_reg_map,
    )
    db.session.add(reg)
    db.session.commit()
    return reg


@pytest.fixture
def platform_registration(session, test_user):
    """Create a complete sample PLATFORM registration."""
    address_platform = Address(
        country="CA",
        street_address="1055 W Georgia St",
        city="Vancouver",
        province="BC",
        postal_code="V6E 4N7",
    )
    contact_rep = Contact(
        firstname="Alice",
        lastname="Wong",
        job_title="Director of Regulatory Compliance",
        email="alice.wong@globalbooking.example.com",
        phone_number="604-555-0144",
        phone_country_code="001",
    )
    rep = PlatformRepresentative(contact=contact_rep)
    brand = PlatformBrand(name="GlobalStay", website="https://www.globalstay.example.com")

    platform = Platform(
        legal_name="Global Booking Services Inc.",
        home_jurisdiction="BC, Canada",
        business_number="111222333BC0001",
        cpbc_licence_number="CPBC-88990",
        primary_non_compliance_notice_email="notices@globalbooking.example.com",
        primary_take_down_request_email="takedown@globalbooking.example.com",
        listing_size=Platform.ListingSize.THOUSAND_AND_ABOVE,
        mailingAddress=address_platform,
        representatives=[rep],
        brands=[brand],
    )
    plt_reg_map = PlatformRegistration(platform=platform)

    reg = Registration(
        registration_type=RegistrationType.PLATFORM.value,
        registration_number="PL100000001",
        sbc_account_id=3,
        status=RegistrationStatus.ACTIVE,
        start_date=datetime(2026, 2, 1, tzinfo=timezone.utc),
        expiry_date=datetime(2027, 2, 1, tzinfo=timezone.utc),
        updated_date=datetime(2026, 9, 8, 10, 15, 30, tzinfo=timezone.utc),
        user_id=test_user.id,
        platform_registration=plt_reg_map,
    )
    db.session.add(reg)
    db.session.commit()
    return reg


# =============================================================================
# 1. Serializer Tests (PII Masking & Formatting)
# =============================================================================


def test_host_serializer_pii_handling(host_registration):
    """Verify that PII (SIN & DOB) is present when include_pii=True and masked when False."""
    # Finance view (with PII)
    snapshot_finance = RegistrationQuerySerializer.serialize(host_registration, include_pii=True)
    assert snapshot_finance["registrationNumber"] == "H123456789"
    assert snapshot_finance["registrationType"] == "HOST"
    assert snapshot_finance["status"] == "ACTIVE"
    primary_contact = snapshot_finance["primaryContact"]
    assert primary_contact["dateOfBirth"] == "1980-05-15"
    assert primary_contact["socialInsuranceNumber"] == "123 456 789"
    assert primary_contact["firstName"] == "Jane"
    assert primary_contact["lastName"] == "Doe"

    # Data Portal view (PII masked)
    snapshot_portal = RegistrationQuerySerializer.serialize(host_registration, include_pii=False)
    primary_contact_masked = snapshot_portal["primaryContact"]
    assert primary_contact_masked["dateOfBirth"] is None
    assert primary_contact_masked["socialInsuranceNumber"] is None
    assert primary_contact_masked["firstName"] == "Jane"
    assert primary_contact_masked["lastName"] == "Doe"

    # Verify flat property manager structure
    pm = snapshot_finance["propertyManager"]
    assert pm is not None
    assert pm["propertyManagerType"] == "BUSINESS"
    assert pm["businessLegalName"] == "Island Property Management Ltd."
    assert pm["businessNumber"] == "987654321BC0001"
    assert pm["initiatedByPropertyManager"] is True
    assert pm["contact"]["firstName"] == "Robert"
    assert pm["contact"]["lastName"] == "Smith"
    assert pm["mailingAddress"]["city"] == "Victoria"


def test_strata_hotel_serializer_unit_listings_normalization(strata_hotel_registration):
    """Verify that multi-line and comma-separated unit listings are sanitized into clean arrays."""
    snapshot = RegistrationQuerySerializer.serialize(strata_hotel_registration, include_pii=False)
    assert snapshot["registrationNumber"] == "ST200000001"
    assert snapshot["registrationType"] == "STRATA_HOTEL"

    sh_details = snapshot["strataHotelDetails"]
    assert sh_details["brand"]["name"] == "Whistler Peak Residences"
    assert sh_details["numberOfUnits"] == 120

    # Primary unit listings should be a clean list of strings with whitespace and empty tokens stripped
    unit_listings = sh_details["unitListings"]
    assert unit_listings["primary"] == ["101", "102", "103", "104"]
    assert unit_listings["additional"] == [["201", "202", "203"], ["301", "302"]]


def test_platform_serializer(platform_registration):
    """Verify PLATFORM registration serialization."""
    snapshot = RegistrationQuerySerializer.serialize(platform_registration, include_pii=False)
    assert snapshot["registrationNumber"] == "PL100000001"
    assert snapshot["registrationType"] == "PLATFORM"
    assert snapshot["businessDetails"]["legalName"] == "Global Booking Services Inc."
    assert snapshot["platformDetails"]["listingSize"] == "THOUSAND_AND_ABOVE"
    assert len(snapshot["platformDetails"]["brands"]) == 1
    assert snapshot["platformDetails"]["brands"][0]["name"] == "GlobalStay"
    assert len(snapshot["platformRepresentatives"]) == 1
    assert snapshot["platformRepresentatives"][0]["firstName"] == "Alice"


# =============================================================================
# 2. Service Layer Cursor Tests
# =============================================================================


def test_cursor_generation_and_tampering(app):
    """Verify HMAC cursor generation, verification, and tamper resistance."""
    with app.app_context():
        scope_hash = RegistrationQueryService.compute_scope_hash(
            updated_since=datetime(2026, 9, 1, tzinfo=timezone.utc),
            registration_numbers=None,
        )
        position = {"changed": "2026-09-07T18:42:11.203000Z", "registrationId": 4821}
        cursor = RegistrationQueryService.generate_cursor(position, scope_hash)
        assert cursor is not None
        assert "." in cursor

        # Successful decode
        decoded = RegistrationQueryService.decode_and_validate_cursor(cursor, scope_hash)
        assert decoded["registrationId"] == 4821
        assert decoded["changed"] == "2026-09-07T18:42:11.203000Z"

        # Tampered signature
        tampered_sig_cursor = cursor[:-3] + "xyz"
        with pytest.raises(ValidationException, match="Invalid cursor signature or tampered token"):
            RegistrationQueryService.decode_and_validate_cursor(tampered_sig_cursor, scope_hash)

        # Mismatched scope hash (e.g. reused with different filters)
        different_scope_hash = RegistrationQueryService.compute_scope_hash(
            updated_since=datetime(2026, 9, 2, tzinfo=timezone.utc),
            registration_numbers=None,
        )
        with pytest.raises(ValidationException, match="Cursor filter scope does not match"):
            RegistrationQueryService.decode_and_validate_cursor(cursor, different_scope_hash)


# =============================================================================
# 3. HTTP Integration Tests (Routes, Auth, AIP colon syntax, and Least Privilege)
# =============================================================================


def test_roles_alone_without_scope_rejected_403(client, jwt, host_registration):
    """Caller with roles but without required OAuth2 scopes is rejected with 403."""
    headers = create_header(jwt, ["staff", "strr_examiner"], username="staff-user")
    body = {"registrationNumbers": ["H123456789"]}
    rv = client.post("/v1/registrations:query", json=body, headers=headers)
    assert rv.status_code == HTTPStatus.FORBIDDEN
    assert "strr.registrations:read" in rv.json.get("message", "")


def test_oauth2_scopes_cdc_full_query_with_pii(client, jwt, host_registration, strata_hotel_registration):
    """Caller with OAuth2 scopes 'strr.registrations:export strr.registrations.pii:read' receives full snapshot with PII."""
    headers = create_header(
        jwt,
        roles=[],
        username="oauth-client",
        additional_claims={"scope": "strr.registrations:export strr.registrations.pii:read"},
    )
    body = {"updatedSince": "2026-01-01T00:00:00Z", "limit": 10}

    rv = client.post("/v1/registrations:query", json=body, headers=headers)
    assert rv.status_code == HTTPStatus.OK
    data = rv.json
    assert "items" in data

    host_item = next(i for i in data["items"] if i["registrationNumber"] == "H123456789")
    assert host_item["primaryContact"]["socialInsuranceNumber"] == "123 456 789"
    assert host_item["primaryContact"]["dateOfBirth"] == "1980-05-15"


def test_bulk_export_without_pii_masked(client, jwt, host_registration, strata_hotel_registration):
    """Caller with export capability but no PII capability receives full CDC sync with masked PII."""
    headers = create_header(
        jwt,
        roles=[],
        username="policy-analytics-service",
        additional_claims={"scope": "strr.registrations:export"},
    )
    body = {"updatedSince": "2026-01-01T00:00:00Z", "limit": 10}

    rv = client.post("/v1/registrations:query", json=body, headers=headers)
    assert rv.status_code == HTTPStatus.OK
    data = rv.json
    assert len(data["items"]) >= 2

    # PII MUST be masked because caller lacks strr.registrations.pii:read
    host_item = next(i for i in data["items"] if i["registrationNumber"] == "H123456789")
    assert host_item["primaryContact"]["socialInsuranceNumber"] is None
    assert host_item["primaryContact"]["dateOfBirth"] is None


def test_targeted_lookup_with_pii_capability(client, jwt, host_registration):
    """Caller with PII scope can view SIN/DOB for targeted queries, but cannot do bulk export."""
    headers = create_header(
        jwt,
        roles=[],
        username="investigations-service",
        additional_claims={"scope": f"{READ_SCOPE} {PII_SCOPE}"},
    )
    # 1. Targeted lookup succeeds with PII
    body_targeted = {"registrationNumbers": ["H123456789"]}
    rv1 = client.post("/v1/registrations:query", json=body_targeted, headers=headers)
    assert rv1.status_code == HTTPStatus.OK
    item = rv1.json["items"][0]
    assert item["primaryContact"]["socialInsuranceNumber"] == "123 456 789"
    assert item["primaryContact"]["dateOfBirth"] == "1980-05-15"

    # 2. Attempting bulk sync without export capability is rejected with 403
    body_bulk = {"updatedSince": "2026-01-01T00:00:00Z"}
    rv2 = client.post("/v1/registrations:query", json=body_bulk, headers=headers)
    assert rv2.status_code == HTTPStatus.FORBIDDEN
    assert "strr.registrations:export" in rv2.json.get("message", "")


def test_caller_without_read_scope_blocked_from_targeted_lookup(client, jwt):
    """Caller with unrelated scope attempting targeted query is rejected with 403."""
    headers = create_header(
        jwt,
        roles=[],
        username="unauthorized-service",
        additional_claims={"scope": "unrelated.service:read"},
    )
    body = {"registrationNumbers": ["H123456789"]}
    rv = client.post("/v1/registrations:query", json=body, headers=headers)
    assert rv.status_code == HTTPStatus.FORBIDDEN
    assert "strr.registrations:read" in rv.json.get("message", "")


def test_data_portal_targeted_query_masked_pii(client, jwt, host_registration):
    """Data Portal targeted lookup with read scope returns masked PII (null SIN and DOB)."""
    headers = create_header(
        jwt,
        roles=[],
        username="data-portal-service",
        additional_claims={"scope": READ_SCOPE},
    )
    body = {
        "registrationNumbers": ["H123456789", "H999999999", "INVALID#REG"],
        "limit": 10,
    }

    rv = client.post("/v1/registrations:query", json=body, headers=headers)
    assert rv.status_code == HTTPStatus.OK
    data = rv.json
    assert len(data["items"]) == 1

    item = data["items"][0]
    assert item["registrationNumber"] == "H123456789"
    # PII MUST be masked
    assert item["primaryContact"]["socialInsuranceNumber"] is None
    assert item["primaryContact"]["dateOfBirth"] is None

    # Errors array must report invalid syntax and not-found records
    assert "errors" in data
    errors = data["errors"]
    not_found = next(e for e in errors if e["registrationNumber"] == "H999999999")
    assert not_found["code"] == "NOT_FOUND"

    invalid_num = next(e for e in errors if e["registrationNumber"] == "INVALID#REG")
    assert invalid_num["code"] == "INVALID_REGISTRATION_NUMBER"


def test_broad_sync_forbidden_without_export_capability(client, jwt):
    """Caller without export capability attempting full CDC sync is rejected with 403."""
    headers = create_header(
        jwt,
        roles=[],
        username="data-portal-service",
        additional_claims={"scope": READ_SCOPE},
    )
    body = {
        "updatedSince": "2026-01-01T00:00:00Z",
        "limit": 10,
    }

    rv = client.post("/v1/registrations:query", json=body, headers=headers)
    assert rv.status_code == HTTPStatus.FORBIDDEN
    assert "registrations:export" in rv.json.get("message", "")


def test_routing_variations_and_compatibility(client, jwt, host_registration):
    """Verify that both versioned and unversioned colon and slash endpoints route correctly for POST and QUERY."""
    headers = create_header(
        jwt,
        roles=[],
        username="test-client",
        additional_claims={"scope": f"{READ_SCOPE} {PII_SCOPE}"},
    )
    body = {"registrationNumbers": ["H123456789"]}

    routes = [
        "/v1/registrations:query",
        "/v1/registrations/:query",
        "/v1/registrations/query",
        "/registrations:query",
        "/registrations/:query",
        "/registrations/query",
    ]

    for path in routes:
        # Test POST
        rv_post = client.post(path, json=body, headers=headers)
        assert rv_post.status_code == HTTPStatus.OK, f"POST failed for route: {path}"
        assert rv_post.json["items"][0]["registrationNumber"] == "H123456789"

        # Test QUERY
        rv_query = client.open(path, method="QUERY", json=body, headers=headers)
        assert rv_query.status_code == HTTPStatus.OK, f"QUERY failed for route: {path}"
        assert rv_query.json["items"][0]["registrationNumber"] == "H123456789"


def test_query_method_cdc_success(client, jwt, host_registration):
    """Verify that HTTP QUERY method executes CDC sync identically to POST."""
    headers = create_header(
        jwt,
        roles=[],
        username="test-client",
        additional_claims={"scope": EXPORT_SCOPE},
    )
    body = {"updatedSince": "2026-01-01T00:00:00Z", "limit": 10}

    rv = client.open("/v1/registrations:query", method="QUERY", json=body, headers=headers)
    assert rv.status_code == HTTPStatus.OK
    data = rv.json
    assert "items" in data
    assert any(i["registrationNumber"] == "H123456789" for i in data["items"])


def test_invalid_limit_rejected(client, jwt):
    """Limit > 500 or non-integer is rejected with 400 Bad Request."""
    headers = create_header(
        jwt,
        roles=[],
        username="test-client",
        additional_claims={"scope": EXPORT_SCOPE},
    )
    rv = client.post("/v1/registrations:query", json={"limit": 501}, headers=headers)
    assert rv.status_code == HTTPStatus.BAD_REQUEST


def test_finance_cdc_pagination_traversal(client, jwt, host_registration, strata_hotel_registration):
    """CDC query traverses pages cleanly via nextCursor."""
    headers = create_header(
        jwt,
        roles=[],
        username="test-client",
        additional_claims={"scope": EXPORT_SCOPE},
    )

    # Page 1 with limit 1
    rv1 = client.post("/v1/registrations:query", json={"limit": 1}, headers=headers)
    assert rv1.status_code == HTTPStatus.OK
    page1 = rv1.json
    assert len(page1["items"]) == 1
    cursor1 = page1["nextCursor"]
    assert cursor1 is not None

    # Page 2 with cursor1 and limit 1
    rv2 = client.post("/v1/registrations:query", json={"limit": 1, "cursor": cursor1}, headers=headers)
    assert rv2.status_code == HTTPStatus.OK
    page2 = rv2.json
    assert len(page2["items"]) == 1
    # Different item
    assert page2["items"][0]["registrationNumber"] != page1["items"][0]["registrationNumber"]


def test_targeted_lookup_deduplication_and_pagination(client, jwt, host_registration, strata_hotel_registration):
    """Data Portal targeted lookup deduplicates repeated numbers and paginates with cursor."""
    headers = create_header(
        jwt,
        roles=[],
        username="data-portal-service",
        additional_claims={"scope": READ_SCOPE},
    )
    reg_nums = ["H123456789", "H123456789", "ST200000001"]

    # Page 1 with limit 1
    rv1 = client.post(
        "/v1/registrations:query",
        json={"registrationNumbers": reg_nums, "limit": 1},
        headers=headers,
    )
    assert rv1.status_code == HTTPStatus.OK
    page1 = rv1.json
    assert len(page1["items"]) == 1
    assert page1["items"][0]["registrationNumber"] == "H123456789"
    cursor1 = page1["nextCursor"]
    assert cursor1 is not None

    # Page 2 with cursor1
    rv2 = client.post(
        "/v1/registrations:query",
        json={"registrationNumbers": reg_nums, "limit": 1, "cursor": cursor1},
        headers=headers,
    )
    assert rv2.status_code == HTTPStatus.OK
    page2 = rv2.json
    assert len(page2["items"]) == 1
    assert page2["items"][0]["registrationNumber"] == "ST200000001"
    assert page2["nextCursor"] is None  # Reached end of 2 unique numbers!
