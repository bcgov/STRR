"""Seed a minimal HOST registration graph so ``RegistrationService.serialize`` succeeds."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from strr_api.enums.enum import PropertyType, RegistrationStatus
from strr_api.models import (
    Address,
    Contact,
    Document,
    Events,
    PropertyContact,
    Registration,
    RegistrationSnapshot,
    RentalProperty,
    User,
)


def seed_serializable_host_registration(
    session: Session,
    *,
    account_id: int,
    registration_number: str,
) -> dict[str, Any]:
    """Insert User + Registration + RentalProperty + primary PropertyContact (flushed, not committed)."""
    owner = User()
    session.add(owner)
    session.flush()

    unit_address = Address(
        country="CA",
        street_address="100 Integration St",
        city="Victoria",
        province="BC",
        postal_code="V8V1A1",
        street_number="100",
        unit_number="",
    )
    mailing_address = Address(
        country="CA",
        street_address="200 Mail St",
        city="Victoria",
        province="BC",
        postal_code="V8V1B2",
    )
    session.add_all([unit_address, mailing_address])
    session.flush()

    contact = Contact(
        firstname="Int",
        lastname="Host",
        email="host@example.test",
        phone_number="250-555-0100",
        address_id=mailing_address.id,
        date_of_birth=datetime(1985, 5, 15).date(),
    )
    session.add(contact)
    session.flush()

    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=365)
    reg = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=registration_number,
        sbc_account_id=account_id,
        status=RegistrationStatus.ACTIVE,
        user_id=owner.id,
        start_date=now,
        expiry_date=expiry,
    )
    session.add(reg)
    session.flush()

    rental = RentalProperty(
        registration_id=reg.id,
        address_id=unit_address.id,
        property_type=PropertyType.SINGLE_FAMILY_HOME,
        ownership_type=RentalProperty.OwnershipType.OWN,
        is_principal_residence=True,
        rental_act_accepted=True,
        parcel_identifier="PID-INT-001",
        local_business_licence="BL-INT-001",
        local_business_licence_expiry_date=(now + timedelta(days=180)).date(),
        nickname="Integration Rental",
        jurisdiction="Victoria",
        space_type=RentalProperty.RentalUnitSpaceType.ENTIRE_HOME,
        host_residence=RentalProperty.HostResidence.SAME_UNIT,
        is_unit_on_principal_residence_property=True,
        number_of_rooms_for_rent=1,
        host_type=RentalProperty.HostType.OWNER,
        rental_space_option=RentalProperty.RentalSpaceOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE,
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

    return {
        "user_id": owner.id,
        "registration_id": reg.id,
        "registration_number": registration_number,
        "rental_property_id": rental.id,
    }


def seed_registration_snapshot(
    session: Session,
    registration_id: int,
    *,
    snapshot_data: dict | None = None,
) -> dict[str, Any]:
    """Insert a ``RegistrationSnapshot`` row (flushed, not committed)."""
    latest = RegistrationSnapshot.find_latest_snapshot(registration_id)
    version = (latest.version + 1) if latest else 1
    snap = RegistrationSnapshot(
        registration_id=registration_id,
        version=version,
        snapshot_datetime=datetime.now(timezone.utc),
        snapshot_data=snapshot_data or {"integration": True, "registrationId": registration_id},
    )
    session.add(snap)
    session.flush()
    return {"snapshot_id": snap.id, "registration_id": registration_id}


def seed_registration_document(
    session: Session,
    registration_id: int,
    *,
    file_key: str,
    file_name: str = "integration-doc.txt",
    file_type: str = "text/plain",
) -> dict[str, Any]:
    """Insert a ``Document`` row for a registration (flushed, not committed)."""
    doc = Document(
        registration_id=registration_id,
        path=file_key,
        file_name=file_name,
        file_type=file_type,
        document_type=Document.DocumentType.OTHERS,
        added_on=datetime.now(timezone.utc).date(),
    )
    session.add(doc)
    session.flush()
    return {"document_id": doc.id, "file_key": file_key, "registration_id": registration_id}


def seed_applicant_visible_registration_event(
    session: Session,
    registration_id: int,
    *,
    user_id: int | None = None,
) -> dict[str, Any]:
    """Insert a registration event visible to applicants (for ``GET .../events`` shape tests)."""
    ev = Events(
        registration_id=registration_id,
        user_id=user_id,
        event_type=Events.EventType.REGISTRATION,
        event_name=Events.EventName.REGISTRATION_CREATED,
        details="Integration seed event",
        visible_to_applicant=True,
    )
    session.add(ev)
    session.flush()
    return {"event_id": ev.id, "registration_id": registration_id}
