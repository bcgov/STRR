# pylint: disable=C0114, C0116
"""Integration tests for interactions-update job (Postgres + migrations via strr-test-utils)."""

import json

import pytest
import responses
from sqlalchemy import select
from sqlalchemy import update

from interactions_update.database import get_session
from interactions_update.job import run
from strr_api.enums.enum import InteractionStatus
from strr_api.models import CustomerInteraction
from strr_api.models import User

pytestmark = pytest.mark.integration


def test_db_session_smoke(session):
    """Docker Postgres, migrations, and the transactional ``session`` fixture work."""
    user = User()
    session.add(user)
    session.flush()
    assert user.id


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 20}], indirect=True)
def test_full_job_roundtrip_pooled(
    db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch
):
    """
    End-to-end: seed -> multi-threaded job -> Notify mock -> assertions via pooled session.
    """
    notify_svc = notify_job_integration_env["notify_svc"]
    auth_url = notify_job_integration_env["auth_url"]
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", "123")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", "secret")
    monkeypatch.setenv("MAX_WORKERS", "5")

    interaction_ids = setup_bulk_interactions["interaction_ids"]

    db_session.execute(
        update(CustomerInteraction)
        .where(CustomerInteraction.id.in_(interaction_ids))
        .values(notify_reference="test-ref-xyz")
    )
    db_session.commit()

    responses.add(
        responses.POST, auth_url, json={"access_token": "mock-token"}, status=200
    )

    def notify_callback(request):
        return (
            200,
            {},
            json.dumps(
                {
                    "id": "provider-id-123",
                    "notifyStatus": "DELIVERED",
                    "notifyProvider": "GC_NOTIFY",
                }
            ),
        )

    responses.add_callback(
        responses.GET,
        url=f"{notify_svc}/notify/test-ref-xyz",
        callback=notify_callback,
        content_type="application/json",
    )

    run(max_workers=5)

    session_gen = get_session()
    verify_session = next(session_gen)

    try:
        stmt = select(CustomerInteraction).where(
            CustomerInteraction.id.in_(interaction_ids)
        )
        updated_records = verify_session.scalars(stmt).all()

        assert len(updated_records) == 20
        for record in updated_records:
            assert record.status == InteractionStatus.DELIVERED
            assert record.provider_reference == "provider-id-123"
            assert record.meta_data["notifyStatus"] == "DELIVERED"

    finally:
        verify_session.close()
