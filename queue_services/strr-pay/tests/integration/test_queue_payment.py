"""Integration tests: Pub/Sub-style envelope + real DB (Docker Postgres)."""

import base64
from http import HTTPStatus

import pytest
from simple_cloudevent import SimpleCloudEvent
from simple_cloudevent import to_queue_message
from sqlalchemy import select
from strr_api.models import Application


@pytest.fixture(scope="function")
def simple_cloud_event():
    """Build a SimpleCloudEvent for payment messages."""

    def _generate(
        id="fake-id",
        source="fake-for-tests",
        subject="fake-subject",
        type="bc.registry.payment",
        data=None,
    ):
        return SimpleCloudEvent(
            id=id,
            source=source,
            subject=subject,
            type=type,
            data=data or {},
        )

    return _generate


@pytest.fixture(scope="function")
def queue_envelope():
    """Mimic the GCP Pub/Sub push envelope (wrapped message)."""

    def _generate(
        pubsub_project_id: str = "PUBSUB_PROJECT_ID",
        subscription_id: str = "SUBSCRIPTION_ID",
        cloud_event=None,
        message_id: str = "10",
        attributes: dict | None = None,
        id: int = 1,
    ):
        if cloud_event is None:
            cloud_event = SimpleCloudEvent(
                id="x", source="s", subject="sub", type="bc.registry.payment", data={}
            )
        if attributes is None:
            attributes = {}
        return {
            "subscription": f"projects/{pubsub_project_id}/subscriptions/{subscription_id}",
            "message": {
                "data": base64.b64encode(to_queue_message(cloud_event)).decode("UTF-8"),
                "messageId": message_id,
                "attributes": attributes,
            },
            "id": id,
        }

    return _generate


@pytest.mark.integration
def test_payment_queue_nodata(client):
    """Empty POST is removed from the queue with 200."""
    response = client.post("/")
    assert response.status_code == HTTPStatus.OK


@pytest.mark.integration
def test_payment_queue_completes_application(
    client,
    session,
    setup_payment_application,
    simple_cloud_event,
    queue_envelope,
):
    """Completed payment cloud event marks the application PAID in the database."""
    ctx = setup_payment_application
    invoice_id = ctx["invoice_id"]
    app_id = ctx["application"].id

    ce = simple_cloud_event(
        data={
            "Id": invoice_id,
            "StatusCode": "COMPLETED",
        },
    )
    envelope = queue_envelope(cloud_event=ce)

    response = client.post("/", json=envelope)
    assert response.status_code == HTTPStatus.OK

    stored = session.scalar(select(Application).where(Application.id == app_id))
    assert stored is not None
    assert stored.status == Application.Status.PAID.value
    assert stored.payment_status_code == "COMPLETED"
    assert stored.payment_completion_date is not None
