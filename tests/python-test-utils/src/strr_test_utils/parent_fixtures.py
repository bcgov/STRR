"""Pytest fixtures that seed User / Registration / Application rows for tests."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from sqlalchemy.orm import Session
from strr_api.enums.enum import RegistrationStatus
from strr_api.models import Application
from strr_api.models import Registration
from strr_api.models import User


def seed_parent_user_registration_application(
    session: Session,
    random_string: Callable[..., str],
    random_integer: Callable[..., int],
    *,
    commit: bool = False,
    application_kwargs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Insert User, Registration, Application; return IDs and ORM instances.

    ``application_kwargs`` are merged into ``Application`` (e.g. ``invoice_id``, ``status``).
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
        start_date=datetime.now(timezone.utc),
        expiry_date=(datetime.now(timezone.utc) + timedelta(days=365)).date(),
    )
    session.add(reg)
    session.flush()

    app_fields: dict[str, Any] = {
        "id": random_integer(),
        "application_json": {},
        "registration_id": reg.id,
        "application_number": random_string(10),
        "type": "",
        "registration_type": Registration.RegistrationType.HOST,
    }
    if application_kwargs:
        app_fields.update(application_kwargs)

    app = Application(**app_fields)

    session.add(app)
    if commit:
        session.commit()
    else:
        session.flush()

    return {
        "application_id": app.id,
        "customer_id": customer.id,
        "registration_id": reg.id,
        "user_id": user.id,
        "application": app,
        "customer": customer,
        "registration": reg,
        "user": user,
    }


@pytest.fixture
def setup_parents(session: Session, random_string, random_integer):
    """
    Creates parent User, Registration, and Application rows; flushes only.

    Use with transactional test sessions (outer rollback). For tests that must
    ``commit`` on the session, use ``setup_parents_committed`` instead.
    """
    return seed_parent_user_registration_application(
        session, random_string, random_integer, commit=False
    )


@pytest.fixture
def setup_parents_committed(session: Session, random_string, random_integer):
    """
    Same as ``setup_parents`` but commits the session so rows persist past the
    fixture when no wrapping transaction rolls them back.
    """
    return seed_parent_user_registration_application(
        session, random_string, random_integer, commit=True
    )
