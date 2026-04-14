import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from strr_api.enums.enum import ChannelType, InteractionStatus
from strr_api.models import Application, Registration, User
from strr_api.models.interactions import CustomerInteraction


@pytest.fixture
def setup_parents(session: Session, random_string):
    """
    Creates one parent record in each table so we have valid IDs
    to link our interactions to.

    TODO: this should be part of a session wide set of fixture strategy
    """
    customer = User(id=2)
    user = User(id=1)
    app = Application(
        id=1,
        application_json={},
        application_number=random_string(10),
        type="",
        registration_type=Registration.RegistrationType.HOST,
    )
    reg = Registration(
        id=1,
        registration_type=Registration.RegistrationType.HOST,
        registration_number=random_string(10),
        sbc_account_id=1,
        status="ACTIVE",
        user_id=user.id,
        start_date=datetime.now(timezone.utc),
        expiry_date=(datetime.now(timezone.utc) + timedelta(days=365)).date(),
    )

    session.add_all([user, app, customer, reg])
    session.commit()

    return {
        "app_id": app.id,
        "customer_id": customer.id,
        "reg_id": reg.id,
        "user_id": user.id,
    }


def generate_interaction_data(**kwargs):
    """Helper to generate valid interaction payloads"""
    defaults = {
        "interaction_uuid": str(uuid.uuid4()),
        "channel": ChannelType.EMAIL,
        "body_content": "Test content",
    }
    defaults.update(kwargs)
    return CustomerInteraction(**defaults)


# -------------------------------------------------------------------
# Happy Path Tests
# -------------------------------------------------------------------


def test_create_interaction_with_customer(session, setup_parents):
    """Test creating an interaction linked ONLY to a Customer."""
    interaction = generate_interaction_data(user_id=setup_parents["user_id"], customer_id=setup_parents["customer_id"])

    session.add(interaction)
    session.commit()

    # Verify data persistence
    stored = session.scalar(select(CustomerInteraction).where(CustomerInteraction.id == interaction.id))
    assert stored is not None
    assert stored.user_id == setup_parents["user_id"]
    assert stored.customer_id == setup_parents["customer_id"]
    assert stored.application_id is None
    assert stored.registration_id is None
    assert stored.status == InteractionStatus.SENT
    assert stored.created_at is not None  # Verify server default func.now()


def test_create_interaction_with_application(session, setup_parents):
    """Test creating an interaction linked ONLY to an Application."""
    interaction = generate_interaction_data(application_id=setup_parents["app_id"])
    session.add(interaction)
    session.commit()

    assert interaction.id is not None
    assert interaction.application_id == setup_parents["app_id"]


def test_find_by_uuid_returns_requested_interaction(session, setup_parents):
    """Test that UUID lookup does not match unrelated interaction rows."""
    interaction_one = generate_interaction_data(customer_id=setup_parents["customer_id"])
    interaction_two = generate_interaction_data(application_id=setup_parents["app_id"])
    session.add_all([interaction_one, interaction_two])
    session.commit()

    stored = CustomerInteraction.find_by_uuid(interaction_two.interaction_uuid)

    assert stored.id == interaction_two.id


def test_find_by_id_idempotency_key_respects_key(session, setup_parents):
    """Test that idempotency lookup filters by the requested key."""
    interaction_one = generate_interaction_data(registration_id=setup_parents["reg_id"], idempotency_key="job-key-one")
    interaction_two = generate_interaction_data(registration_id=setup_parents["reg_id"], idempotency_key="job-key-two")
    session.add_all([interaction_one, interaction_two])
    session.commit()

    stored = CustomerInteraction.find_by_id_idempotency_key("job-key-two", registration_id=setup_parents["reg_id"])

    assert stored.id == interaction_two.id


def test_jsonb_metadata_storage(session, setup_parents):
    """Test that the JSONB column correctly stores and retrieves dictionaries."""
    meta = {"campaign_id": 123, "tags": ["urgent", "promo"]}
    interaction = generate_interaction_data(customer_id=setup_parents["customer_id"], meta_data=meta)
    session.add(interaction)
    session.commit()

    session.refresh(interaction)
    assert interaction.meta_data == meta
    assert interaction.meta_data["tags"][0] == "urgent"


# -------------------------------------------------------------------
# Constraint Tests (The "Exclusive" Logic)
# -------------------------------------------------------------------


def test_constraint_fails_if_multiple_parents(session, setup_parents):
    """
    Ensure the DB rejects rows that have MORE than 1 parent set.
    (e.g., customer_id AND application_id are both set)
    """
    interaction = generate_interaction_data(
        customer_id=setup_parents["customer_id"], application_id=setup_parents["app_id"]  # Invalid: Can't have both
    )
    session.add(interaction)

    with pytest.raises(IntegrityError) as excinfo:
        session.commit()

    # Verify it was the specific check constraint
    assert "check_exclusive_owner_interaction" in str(excinfo.value)


def test_constraint_fails_if_zero_parents(session):
    """
    Ensure the DB rejects rows that have ZERO parents set.
    (Because the constraint is `== 1`, not `<= 1`)
    """
    interaction = generate_interaction_data(customer_id=None, application_id=None, registration_id=None)
    session.add(interaction)

    with pytest.raises(IntegrityError) as excinfo:
        session.commit()

    assert "check_exclusive_owner_interaction" in str(excinfo.value)


# -------------------------------------------------------------------
# Unique Constraint Tests
# -------------------------------------------------------------------


def test_unique_interaction_uuid(session, setup_parents):
    """Test that interaction_uuid must be unique."""
    uid = str(uuid.uuid4())

    # First one
    i1 = generate_interaction_data(interaction_uuid=uid, customer_id=setup_parents["customer_id"])
    session.add(i1)
    session.commit()

    # Second one with same UUID
    i2 = generate_interaction_data(interaction_uuid=uid, customer_id=setup_parents["customer_id"])
    session.add(i2)

    with pytest.raises(IntegrityError):
        session.commit()
