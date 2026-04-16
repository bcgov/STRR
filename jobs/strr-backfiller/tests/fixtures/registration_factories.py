"""Factories for integration tests against Registration / Application / RentalProperty."""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session
from strr_api.enums.enum import PropertyType, RegistrationStatus
from strr_api.models import Address, Application, Registration, RentalProperty, User


def utc_now():
    return datetime.now(UTC)


def create_user(session: Session) -> User:
    user = User()
    session.add(user)
    session.flush()
    return user


def create_host_registration(
    session: Session,
    random_string,
    random_integer,
    *,
    registration_json,
    registration_type=Registration.RegistrationType.HOST,
    rental_jurisdiction=None,
    include_rental=True,
) -> Registration:
    user = create_user(session)
    reg = Registration(
        registration_type=registration_type,
        registration_number=random_string(12),
        sbc_account_id=random_integer(999_999),
        status=RegistrationStatus.ACTIVE,
        user_id=user.id,
        start_date=utc_now(),
        expiry_date=(utc_now() + timedelta(days=365)).date(),
        registration_json=registration_json,
    )
    session.add(reg)
    session.flush()

    if include_rental:
        address = Address(
            country="CA",
            street_address="100 Main St",
            city="Victoria",
            province="BC",
            postal_code="V8V1A1",
        )
        session.add(address)
        session.flush()
        rental = RentalProperty(
            property_type=PropertyType.TOWN_HOME,
            is_principal_residence=True,
            rental_act_accepted=True,
            address_id=address.id,
            registration_id=reg.id,
            jurisdiction=rental_jurisdiction,
        )
        session.add(rental)

    session.commit()
    return reg


def attach_application(
    session: Session,
    random_string,
    random_integer,
    registration: Registration,
    *,
    application_json: dict,
    decision_date: datetime | None,
) -> Application:
    app_row = Application(
        id=random_integer(999_999_999),
        application_json=application_json,
        registration_id=registration.id,
        application_number=random_string(14),
        type="",
        registration_type=registration.registration_type,
        decision_date=decision_date,
    )
    session.add(app_row)
    session.commit()
    return app_row


def create_host_registration_null_json(session, random_string, random_integer) -> Registration:
    """HOST registration with registration_json=None (user committed)."""
    user = create_user(session)
    reg = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=random_string(12),
        sbc_account_id=random_integer(999_999),
        status=RegistrationStatus.ACTIVE,
        user_id=user.id,
        start_date=utc_now(),
        expiry_date=(utc_now() + timedelta(days=365)).date(),
        registration_json=None,
    )
    session.add(reg)
    session.flush()
    return reg
