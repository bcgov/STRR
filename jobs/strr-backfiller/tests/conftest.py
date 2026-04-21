from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session
from strr_api.enums.enum import RegistrationStatus
from strr_api.models import Application, Registration, User

from backfiller.config import TestConfig
from backfiller.job import create_app

pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
]


@pytest.fixture
def setup_parents(session: Session, random_string, random_integer):
    """
    Creates one parent record in each table so integration tests have valid IDs
    to link to.
    """
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
        start_date=datetime.now(UTC),
        expiry_date=(datetime.now(UTC) + timedelta(days=365)).date(),
    )
    session.add(reg)
    session.flush()

    application = Application(
        id=random_integer(),
        application_json={},
        registration_id=reg.id,
        application_number=random_string(10),
        type="",
        registration_type=Registration.RegistrationType.HOST,
    )

    session.add(application)
    session.commit()

    return {
        "application_id": application.id,
        "customer_id": customer.id,
        "registration_id": reg.id,
        "user_id": user.id,
    }


@pytest.fixture(scope="session")
def app(db_engine):
    """
    Flask app for integration tests.

    The job package is ``backfiller`` while the repo folder is ``strr-backfiller``,
    so strr_test_utils cannot discover ``create_app`` automatically; we wire it here
    (same pattern as a manually registered app in other jobs).
    """
    TestConfig.SQLALCHEMY_DATABASE_URI = str(db_engine.url)
    _app = create_app("test")
    with _app.app_context():
        yield _app
