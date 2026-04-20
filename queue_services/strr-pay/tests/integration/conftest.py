"""Fixtures for strr-pay integration tests (Docker Postgres + migrated schema)."""

import pytest
from sqlalchemy.orm import Session
from strr_api.models import Application
from strr_test_utils.parent_fixtures import seed_parent_user_registration_application


@pytest.fixture
def setup_payment_application(session: Session, random_string, random_integer):
    """User, registration, and application in PAYMENT_DUE with a known invoice_id."""

    invoice_id = random_integer(999999)
    data = seed_parent_user_registration_application(
        session,
        random_string,
        random_integer,
        commit=True,
        application_kwargs={
            "invoice_id": invoice_id,
            "status": Application.Status.PAYMENT_DUE.value,
        },
    )
    return {
        "application": data["application"],
        "customer": data["customer"],
        "invoice_id": invoice_id,
        "registration": data["registration"],
        "user": data["user"],
    }
