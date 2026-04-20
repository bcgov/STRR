"""Unit tests for the payment worker route (mocked queue + Application)."""

from http import HTTPStatus
from unittest.mock import MagicMock

from simple_cloudevent import SimpleCloudEvent
from strr_api.models import Application

from strr_pay.resources.pay_listener import worker
from strr_pay.services import gcp_queue


def _payment_cloud_event(invoice_id=99, status_code="COMPLETED", ce_type="bc.registry.payment"):
    return SimpleCloudEvent(
        id="e1",
        source="src",
        subject="sub",
        type=ce_type,
        data={"Id": invoice_id, "StatusCode": status_code},
    )


def test_worker_empty_body_returns_200(app):
    with app.test_request_context("/", method="POST", data=b""):
        assert worker()[1] == HTTPStatus.OK


def test_worker_no_cloud_event_returns_200(app, mocker):
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=None)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.OK


def test_worker_non_completed_payment_returns_200(app, mocker):
    ce = _payment_cloud_event(status_code="PENDING")
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.OK


def test_worker_no_payment_token_returns_200(app, mocker):
    """Wrong cloud event type yields no PaymentToken; message is removed from queue."""
    ce = SimpleCloudEvent(
        id="e1",
        source="src",
        subject="sub",
        type="other.event",
        data={"Id": 1, "StatusCode": "COMPLETED"},
    )
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.OK


def test_worker_empty_payment_data_dict_returns_200(app, mocker):
    ce = SimpleCloudEvent(
        id="e1",
        source="src",
        subject="sub",
        type="bc.registry.payment",
        data={},
    )
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.OK


def test_worker_application_not_found_returns_404(app, mocker):
    ce = _payment_cloud_event(invoice_id=99999)
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    mocker.patch.object(Application, "find_by_invoice_id", return_value=None)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.NOT_FOUND


def test_worker_application_not_payment_due_returns_200_without_save(app, mocker):
    ce = _payment_cloud_event(invoice_id=1)
    app_row = MagicMock()
    # Stored status is the enum value string, not PAYMENT_DUE — worker removes from queue
    # without save
    app_row.status = Application.Status.PAID.value
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    mocker.patch.object(Application, "find_by_invoice_id", return_value=app_row)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.OK
    app_row.save.assert_not_called()


def test_worker_marks_application_paid(app, mocker):
    ce = _payment_cloud_event(invoice_id=55)
    app_row = MagicMock()
    app_row.status = Application.Status.PAYMENT_DUE.value
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    mocker.patch.object(Application, "find_by_invoice_id", return_value=app_row)
    with app.test_request_context("/", method="POST", data=b"{}"):
        body, status = worker()
    assert status == HTTPStatus.OK
    assert body == {}
    assert app_row.status == Application.Status.PAID
    assert app_row.payment_status_code == "COMPLETED"
    assert app_row.payment_completion_date is not None
    app_row.save.assert_called_once()
