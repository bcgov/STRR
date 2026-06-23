# Copyright © 2024 Province of British Columbia
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
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
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
"""Tests for registration service methods."""

import json
from datetime import datetime, timezone

import pytest

from strr_api.enums.enum import PropertyType, RegistrationStatus
from strr_api.models import Address, Contact, Events, PropertyContact, Registration, RentalProperty, User
from strr_api.services import RegistrationService


@pytest.fixture
def host_registration(session):
    """Create a HOST registration with a full RentalProperty + primary Contact for testing."""
    user = User(username="testuser", firstname="Test", lastname="User")
    session.add(user)
    session.flush()

    contact = Contact(firstname="John", lastname="Doe", email="old@example.com")
    session.add(contact)
    session.flush()

    unit_address = Address(
        country="CA",
        street_address="1 Test St",
        city="Victoria",
        province="BC",
        postal_code="V8V1A1",
        street_number="1",
    )
    session.add(unit_address)
    session.flush()

    registration = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number="TST-12345",
        sbc_account_id=12345,
        status=RegistrationStatus.ACTIVE,
        user_id=user.id,
        start_date=datetime.now(timezone.utc),
        expiry_date=datetime.now(timezone.utc),
        registration_json={
            "primaryContact": {
                "firstName": "John",
                "lastName": "Doe",
                "emailAddress": "old@example.com",
            }
        },
    )
    session.add(registration)
    session.flush()

    rental = RentalProperty(
        registration_id=registration.id,
        address_id=unit_address.id,
        property_type=PropertyType.SINGLE_FAMILY_HOME,
        ownership_type=RentalProperty.OwnershipType.OWN,
    )
    session.add(rental)
    session.flush()

    pc = PropertyContact(
        property_id=rental.id,
        contact_id=contact.id,
        is_primary=True,
        contact_type=PropertyContact.ContactType.INDIVIDUAL,
    )
    session.add(pc)
    session.flush()

    return {"registration": registration, "user": user, "contact": contact}


def test_update_registration_host_email(session, host_registration):
    """Test updating email for HOST registration type — updates registration_json AND Contact record."""
    registration = host_registration["registration"]
    user = host_registration["user"]
    contact = host_registration["contact"]
    original_updated_date = registration.updated_date

    update_data = {"primaryContact": {"emailAddress": "new@example.com"}}
    updated_reg = RegistrationService.update_registration(registration, update_data, user)

    # registration_json is updated
    assert updated_reg.registration_json["primaryContact"]["emailAddress"] == "new@example.com"

    # Contact DB record is also updated
    session.refresh(contact)
    assert contact.email == "new@example.com"

    # updated_date is changed
    assert updated_reg.updated_date > original_updated_date

    # Check event was created
    events = Events.fetch_registration_events(registration.id, applicant_visible_events_only=False)
    assert len(events) == 1
    event = events[0]
    assert event.event_name == Events.EventName.REGISTRATION_UPDATED
    assert event.user_id == user.id
    assert event.visible_to_applicant is True

    # Check event details structure
    details = json.loads(event.details)
    assert "changes" in details
    assert len(details["changes"]) == 1
    change = details["changes"][0]
    assert change["field"] == "primaryContact.emailAddress"
    assert change["oldValue"] == "old@example.com"
    assert change["newValue"] == "new@example.com"


def test_update_registration_no_change_no_event(session, host_registration):
    """Test that no event is created when email value doesn't change."""
    registration = host_registration["registration"]
    user = host_registration["user"]

    # Update with same email
    update_data = {"primaryContact": {"emailAddress": "old@example.com"}}
    updated_reg = RegistrationService.update_registration(registration, update_data, user)

    # Email should still be the same
    assert updated_reg.registration_json["primaryContact"]["emailAddress"] == "old@example.com"

    # No event should be created
    events = Events.fetch_registration_events(registration.id, applicant_visible_events_only=False)
    assert len(events) == 0


def test_update_registration_empty_registration_json(session):
    """Test updating email when registration_json is empty or None."""
    user = User(username="emptyuser", firstname="Empty", lastname="User")
    session.add(user)
    session.flush()

    registration = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number="TST-EMPTY",
        sbc_account_id=99999,
        status=RegistrationStatus.ACTIVE,
        user_id=user.id,
        start_date=datetime.now(timezone.utc),
        expiry_date=datetime.now(timezone.utc),
        registration_json=None,
    )
    session.add(registration)
    session.flush()

    update_data = {"primaryContact": {"emailAddress": "new@example.com"}}
    updated_reg = RegistrationService.update_registration(registration, update_data, user)

    # Should create the structure
    assert updated_reg.registration_json is not None
    assert updated_reg.registration_json["primaryContact"]["emailAddress"] == "new@example.com"

    # Event should track old value as None
    events = Events.fetch_registration_events(registration.id, applicant_visible_events_only=False)
    assert len(events) == 1
    details = json.loads(events[0].details)
    change = details["changes"][0]
    assert change["oldValue"] is None
    assert change["newValue"] == "new@example.com"
