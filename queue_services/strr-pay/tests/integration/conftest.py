"""Fixtures for strr-pay integration tests (Docker Postgres + migrated schema)."""

from datetime import datetime
from datetime import timedelta
from datetime import timezone

import pytest
from sqlalchemy.orm import Session
from strr_api.enums.enum import RegistrationStatus
from strr_api.models import Application
from strr_api.models import Registration
from strr_api.models import User


@pytest.fixture
def setup_payment_application(session: Session, random_string, random_integer):
    """User, registration, and application in PAYMENT_DUE with a known invoice_id."""

    customer = User()
    user = User()
    session.add_all([user, customer])
    session.flush()

    reg = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=random_string(10),
        sbc_account_id=random_integer(),
        status=RegistrationStatus.ACTIVE,
        user_id=user.id,
        start_date=datetime.now(timezone.utc),
        expiry_date=(datetime.now(timezone.utc) + timedelta(days=365)).date(),
    )
    session.add(reg)
    session.flush()

    invoice_id = random_integer(999999)

    app_row = Application(
        id=random_integer(),
        application_json={},
        registration_id=reg.id,
        application_number=random_string(10),
        type="",
        registration_type=Registration.RegistrationType.HOST,
        invoice_id=invoice_id,
        status=Application.Status.PAYMENT_DUE.value,
    )

    session.add(app_row)
    session.commit()

    return {
        "application": app_row,
        "customer": customer,
        "invoice_id": invoice_id,
        "registration": reg,
        "user": user,
    }
