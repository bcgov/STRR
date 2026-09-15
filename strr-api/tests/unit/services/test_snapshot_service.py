# Copyright © 2025 Province of British Columbia
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
"""Tests to ensure that the snapshot service works as expected."""

import pytest

from strr_api.enums.enum import RegistrationStatus
from strr_api.models import Registration, RegistrationSnapshot
from strr_api.services.snapshot_service import SnapshotService
from tests.integration.registration_seed import seed_serializable_host_registration


@pytest.fixture
def registration_factory(session, random_string):
    """Create persisted registrations that can be serialized without external services."""

    def create_registration():
        seeded = seed_serializable_host_registration(
            session, account_id=1234, registration_number=f"SNAP{random_string(10)}"
        )
        return session.get(Registration, seeded["registration_id"])

    return create_registration


def test_create_snapshot(session, registration_factory):
    """Persist the full registration state and expose snapshot metadata."""
    registration = registration_factory()
    snapshot = SnapshotService.snapshot_registration(registration)
    session.refresh(snapshot)

    assert snapshot.id is not None
    assert snapshot.registration_id == registration.id
    assert snapshot.version == 1
    assert snapshot.snapshot_datetime is not None
    assert snapshot.snapshot_data["registrationNumber"] == registration.registration_number
    assert snapshot.snapshot_data["status"] == "ACTIVE"
    assert snapshot.snapshot_data["primaryContact"]["emailAddress"] == "host@example.test"
    assert snapshot.snapshot_data["unitAddress"]["city"] == "Victoria"
    assert SnapshotService.serialize(snapshot) == {
        "id": snapshot.id,
        "registrationId": registration.id,
        "version": 1,
        "snapshotDateTime": snapshot.snapshot_datetime.isoformat(),
        "snapshotData": snapshot.snapshot_data,
    }


def test_new_snapshot_preserves_previous_registration_state(session, registration_factory):
    """Subsequent snapshots capture changes without rewriting previous versions."""
    registration = registration_factory()
    first = SnapshotService.snapshot_registration(registration)

    registration.status = RegistrationStatus.CANCELLED
    registration.rental_property.nickname = "Updated rental"
    session.flush()
    second = SnapshotService.snapshot_registration(registration)
    session.refresh(first)
    session.refresh(second)

    assert first.version == 1
    assert second.version == 2
    assert second.id != first.id
    assert first.snapshot_data["status"] == "ACTIVE"
    assert first.snapshot_data["unitAddress"]["nickname"] == "Integration Rental"
    assert second.snapshot_data["status"] == "CANCELLED"
    assert second.snapshot_data["unitAddress"]["nickname"] == "Updated rental"
    assert RegistrationSnapshot.find_latest_snapshot(registration.id).id == second.id


def test_snapshot_lookup_and_versions_are_scoped_to_registration(registration_factory):
    """A snapshot cannot be fetched through a different registration's ID."""
    first_registration = registration_factory()
    first_snapshot = SnapshotService.snapshot_registration(first_registration)
    second_registration = registration_factory()
    second_snapshot = SnapshotService.snapshot_registration(second_registration)

    assert second_snapshot.version == 1
    assert SnapshotService.get_snapshot(first_registration.id, first_snapshot.id).id == first_snapshot.id
    assert SnapshotService.get_snapshot(second_registration.id, first_snapshot.id) is None
    assert SnapshotService.get_snapshot(first_registration.id, second_snapshot.id) is None
    assert SnapshotService.get_snapshot(first_registration.id, -1) is None
