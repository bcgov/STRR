from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session


@pytest.fixture
def app_ctx(app):
    """Flask application context for service calls (avoids repeating app.app_context())."""
    with app.app_context():
        yield app


from strr_api.models import Application, Registration, User


@pytest.fixture
def setup_parents(session: Session, random_string, random_integer):
    """
    Creates one parent record in each table so we have valid IDs
    to link our interactions to.

    TODO: this should be part of a session wide set of fixture strategy
    """
    customer = User()
    user = User()
    session.add_all([user, customer])
    session.flush()

    reg = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=random_string(10),
        sbc_account_id=random_integer(),
        status="ACTIVE",
        user_id=user.id,
        start_date=datetime.now(timezone.utc),
        expiry_date=(datetime.now(timezone.utc) + timedelta(days=365)).date(),
    )
    session.add(reg)
    session.flush()

    app = Application(
        application_json={},
        registration_id=reg.id,
        application_number=random_string(10),
        type="",
        registration_type=Registration.RegistrationType.HOST,
    )

    session.add(app)
    session.commit()

    return {
        "application_id": app.id,
        "customer_id": customer.id,
        "registration_id": reg.id,
        "user_id": user.id,
    }
