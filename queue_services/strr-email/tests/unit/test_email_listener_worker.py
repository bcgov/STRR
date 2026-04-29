from http import HTTPStatus
import json
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
import responses
from simple_cloudevent import SimpleCloudEvent
from strr_api.enums.enum import RegistrationNocStatus
from strr_api.models import Registration

from strr_email import create_app
from strr_email.config import UnitTestConfig
from strr_email.resources.email_listener import worker
from strr_email.services import gcp_queue


class _UnitTestConfigNoSentry(UnitTestConfig):
    SENTRY_DSN = None


@pytest.fixture
def app(mocker):
    mocker.patch("strr_email.sentry_sdk.init")
    application = create_app(environment=_UnitTestConfigNoSentry)
    application.config.update(
        EMAIL_TEMPLATE_PATH="/templates",
        NOTIFY_SVC_URL="https://notify.test/notify",
        NOTIFY_API_TIMEOUT=30,
        KEYCLOAK_AUTH_TOKEN_URL="https://auth.test/token",
    )
    gcp_queue.init_app(application)
    return application


@pytest.fixture
def ce_factory():
    def _make(**data):
        return SimpleCloudEvent(id="e1", source="src", subject="sub", type="email", data=data)

    return _make


def _patch_read_pipeline(mocker, ce, reg, template: str):
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    mocker.patch("strr_email.resources.email_listener.Path.read_text", return_value=template)
    mocker.patch(
        "strr_email.resources.email_listener.substitute_template_parts", side_effect=lambda t: t
    )
    mocker.patch(
        "strr_email.resources.email_listener.RegistrationService.find_by_registration_number",
        return_value=reg,
    )


def _host_reg():
    reg = MagicMock()
    reg.registration_type = Registration.RegistrationType.HOST.value
    reg.id = 99
    reg.rental_property = MagicMock()
    reg.rental_property.address = MagicMock(
        street_number="1",
        unit_number="",
        street_address="Main",
        street_address_additional="",
        city="Vic",
        postal_code="V8V1A1",
    )
    reg.rental_property.nickname = None
    reg.rental_property.property_manager = None
    pc = MagicMock(is_primary=True, contact=MagicMock(email="host@example.com"))
    reg.rental_property.contacts = [pc]
    reg.expiry_date = MagicMock(strftime=MagicMock(return_value="January 1, 2027"))
    reg.registration_number = "H1"
    reg.noc_status = RegistrationNocStatus.NOC_EXPIRED
    reg.nocs = []
    return reg


_HOST_TPL = "\n".join(
    [
        "{{ reg_num }}",
        "{{ street_number }}",
        "{{ unit_number }}",
        "{{ street_name }}",
        "{{ city }}",
        "{{ postal_code }}",
        "{{ ops_email }}",
        "{{ rental_nickname }}",
        "{{ custom_content }}",
        "{{ noc_content }}",
        "{{ noc_expiry_date }}",
        "{{ expiry_date }}",
        "{{ tac_url }}",
    ]
)
_PLAT_TPL = "\n".join(
    [
        "{{ reg_num }}",
        "{{ ops_email }}",
        "{{ expiry_date }}",
        "{{ tac_url }}",
        "{{ service_provider }}",
    ]
)
_STRATA_TPL = "\n".join(
    [
        "{{ reg_num }}",
        "{{ street_address }}",
        "{{ city }}",
        "{{ postal_code }}",
        "{{ ops_email }}",
        "{{ expiry_date }}",
        "{{ tac_url }}",
    ]
)


def test_worker_empty_body_returns_200(app):
    with app.test_request_context("/", method="POST", data=b""):
        assert worker()[1] == HTTPStatus.OK


def test_worker_no_cloud_event_returns_200(app, mocker):
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=None)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.OK


def test_worker_no_email_info_returns_200(app, mocker, ce_factory):
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce_factory(foo="bar"))
    mocker.patch("strr_email.resources.email_listener.get_email_info", return_value=None)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.OK


def test_worker_application_not_found(app, mocker, ce_factory):
    ce = ce_factory(applicationNumber="A-404", emailType="HOST_DECLINED")
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    mocker.patch("strr_email.resources.email_listener.Path.read_text", return_value="# x\n")
    mocker.patch(
        "strr_email.resources.email_listener.substitute_template_parts", side_effect=lambda t: t
    )
    mocker.patch(
        "strr_email.resources.email_listener.Application.find_by_application_number",
        return_value=None,
    )
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.NOT_FOUND


def test_worker_registration_not_found(app, mocker, ce_factory):
    ce = ce_factory(registrationNumber="R-404", emailType="HOST_RENEWAL_REMINDER")
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    mocker.patch("strr_email.resources.email_listener.Path.read_text", return_value="# x\n")
    mocker.patch(
        "strr_email.resources.email_listener.substitute_template_parts", side_effect=lambda t: t
    )
    mocker.patch(
        "strr_email.resources.email_listener.RegistrationService.find_by_registration_number",
        return_value=None,
    )
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == HTTPStatus.NOT_FOUND


@pytest.mark.parametrize(
    "reg_num,email_type,reg_type,reg_id",
    [
        ("S1", "HOST_DECLINED", Registration.RegistrationType.STRATA_HOTEL, 1),
        ("P1", "NOC", Registration.RegistrationType.PLATFORM, 2),
        ("U1", "HOST_RENEWAL_REMINDER", "UNKNOWN", 3),
    ],
)
def test_worker_registration_branch_returns_empty_ok(
    app, mocker, ce_factory, reg_num, email_type, reg_type, reg_id
):
    ce = ce_factory(registrationNumber=reg_num, emailType=email_type)
    reg = MagicMock(registration_type=reg_type, id=reg_id)
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    mocker.patch("strr_email.resources.email_listener.Path.read_text", return_value="# x\n")
    mocker.patch(
        "strr_email.resources.email_listener.substitute_template_parts", side_effect=lambda t: t
    )
    mocker.patch(
        "strr_email.resources.email_listener.RegistrationService.find_by_registration_number",
        return_value=reg,
    )
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker() == ({}, HTTPStatus.OK)


def test_worker_renewal_dispatch_success(app, mocker, ce_factory):
    ce = ce_factory(registrationNumber="H1", emailType="HOST_RENEWAL_REMINDER")
    reg = _host_reg()
    mocker.patch(
        "strr_email.resources.email_listener.InteractionService.dispatch",
        return_value=MagicMock(interaction_uuid="uuid-1"),
    )
    _patch_read_pipeline(mocker, ce, reg, _HOST_TPL)
    with app.test_request_context("/", method="POST", data=b"{}"):
        resp = worker()
    assert resp[1] == HTTPStatus.OK and resp[0].get_json().get("interaction") == "uuid-1"


def test_worker_platform_renewal_dispatch_success(app, mocker, ce_factory):
    ce = ce_factory(registrationNumber="P1", emailType="PLATFORM_RENEWAL_REMINDER")
    rep = MagicMock(contact=MagicMock(email="plat-rep@example.com"))
    platform = MagicMock(legal_name="Platform Co", representatives=[rep])
    reg = MagicMock(
        registration_type=Registration.RegistrationType.PLATFORM,
        id=42,
        platform_registration=MagicMock(platform=platform),
        registration_number="P1",
        expiry_date=MagicMock(strftime=MagicMock(return_value="June 1, 2027")),
    )
    mocker.patch(
        "strr_email.resources.email_listener.InteractionService.dispatch",
        return_value=MagicMock(interaction_uuid="uuid-plat"),
    )
    _patch_read_pipeline(mocker, ce, reg, _PLAT_TPL)
    with app.test_request_context("/", method="POST", data=b"{}"):
        resp = worker()
    assert resp[0].get_json().get("interaction") == "uuid-plat"


def test_worker_strata_renewal_dispatch_success(app, mocker, ce_factory):
    ce = ce_factory(registrationNumber="S1", emailType="STRATA_HOTEL_RENEWAL_REMINDER")
    loc = MagicMock(
        street_address="50 Main", street_address_additional="", city="Vic", postal_code="V8V1A1"
    )
    sh = MagicMock(
        location=loc,
        representatives=[MagicMock(contact=MagicMock(email="strata-rep@example.com"))],
    )
    reg = MagicMock(
        registration_type=Registration.RegistrationType.STRATA_HOTEL,
        id=43,
        strata_hotel_registration=MagicMock(strata_hotel=sh),
        registration_number="S1",
        expiry_date=MagicMock(strftime=MagicMock(return_value="August 1, 2027")),
    )
    mocker.patch(
        "strr_email.resources.email_listener.InteractionService.dispatch",
        return_value=MagicMock(interaction_uuid="uuid-strata"),
    )
    _patch_read_pipeline(mocker, ce, reg, _STRATA_TPL)
    with app.test_request_context("/", method="POST", data=b"{}"):
        resp = worker()
    assert resp[0].get_json().get("interaction") == "uuid-strata"


def test_worker_renewal_dispatch_raises_returns_400(app, mocker, ce_factory):
    ce = ce_factory(registrationNumber="H1", emailType="HOST_RENEWAL_REMINDER")
    reg = _host_reg()
    mocker.patch(
        "strr_email.resources.email_listener.InteractionService.dispatch",
        side_effect=RuntimeError("notify down"),
    )
    _patch_read_pipeline(mocker, ce, reg, _HOST_TPL)
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == 400


def _minimal_app_dict():
    return {
        "header": {"registrationNumber": "RN1", "registrationEndDate": "2026-01-01T00:00:00+00:00"},
        "registration": {
            "registrationType": Registration.RegistrationType.HOST.value,
            "unitAddress": {"streetNumber": "1", "city": "Vic", "postalCode": "V8V1A1"},
            "primaryContact": {"emailAddress": "a@b.c"},
        },
    }


def _minimal_application_template():
    return "\n".join(
        [
            "{{ application_num }}",
            "{{ reg_num }}",
            "{{ street_number }}",
            "{{ unit_number }}",
            "{{ street_name }}",
            "{{ city }}",
            "{{ province }}",
            "{{ postal_code }}",
            "{{ expiry_date }}",
            "{{ service_provider }}",
            "{{ tac_url }}",
            "{{ ops_email }}",
            "{{ noc_content }}",
            "{{ noc_expiry_date }}",
            "{{ noc_sent_date }}",
            "{{ rental_nickname }}",
            "{{ custom_content }}",
            "{{ client_recipients }}",
        ]
    )


def _patch_legacy_application_flow(mocker, app_obj, ce):
    mocker.patch.object(gcp_queue, "get_simple_cloud_event", return_value=ce)
    mocker.patch(
        "strr_email.resources.email_listener.Path.read_text",
        return_value=_minimal_application_template(),
    )
    mocker.patch(
        "strr_email.resources.email_listener.substitute_template_parts", side_effect=lambda t: t
    )
    mocker.patch(
        "strr_email.resources.email_listener.Application.find_by_application_number",
        return_value=app_obj,
    )
    mocker.patch(
        "strr_email.resources.email_listener.ApplicationSerializer.to_dict",
        return_value=_minimal_app_dict(),
    )
    mocker.patch(
        "strr_email.resources.email_listener.AuthService.get_service_client_token",
        return_value="tok",
    )


@pytest.mark.parametrize(
    "notify_status,expected_status",
    [
        (HTTPStatus.OK, HTTPStatus.OK),
        (HTTPStatus.ACCEPTED, HTTPStatus.OK),
        (HTTPStatus.CREATED, HTTPStatus.OK),
        (502, HTTPStatus.BAD_REQUEST),
    ],
)
@responses.activate
def test_worker_legacy_notify_status(app, mocker, ce_factory, notify_status, expected_status):
    ce = ce_factory(applicationNumber="APP-1", emailType="HOST_DECLINED")
    app_obj = MagicMock(
        application_number="APP-1",
        registration_type=Registration.RegistrationType.HOST,
        noc=None,
    )
    _patch_legacy_application_flow(mocker, app_obj, ce)
    body = {"ok": True} if expected_status == HTTPStatus.OK else {"error": "bad"}
    responses.add(
        responses.POST, app.config["NOTIFY_SVC_URL"], json=body, status=int(notify_status)
    )
    with app.test_request_context("/", method="POST", data=b"{}"):
        assert worker()[1] == expected_status


def _multi_recipient_app_dict():
    return {
        "header": {"registrationNumber": "RN1", "registrationEndDate": "2026-01-01T00:00:00+00:00"},
        "registration": {
            "registrationType": Registration.RegistrationType.HOST.value,
            "unitAddress": {"streetNumber": "1", "city": "Vic", "postalCode": "V8V1A1"},
            "primaryContact": {"emailAddress": "host@example.com"},
            "propertyManager": {"contact": {"emailAddress": "bas@ba$.com"}},
        },
    }


@responses.activate
def test_worker_legacy_sends_one_request_per_recipient(app, mocker, ce_factory):
    """Each recipient gets its own notify-api request so a bad email does not block the others."""
    ce = ce_factory(applicationNumber="APP-1", emailType="HOST_DECLINED")
    app_obj = MagicMock(
        application_number="APP-1",
        registration_type=Registration.RegistrationType.HOST,
        noc=None,
    )
    _patch_legacy_application_flow(mocker, app_obj, ce)
    mocker.patch(
        "strr_email.resources.email_listener.ApplicationSerializer.to_dict",
        return_value=_multi_recipient_app_dict(),
    )

    responses.add(responses.POST, app.config["NOTIFY_SVC_URL"], json={"id": 1}, status=200)
    responses.add(
        responses.POST,
        app.config["NOTIFY_SVC_URL"],
        json={"message": "bad email"},
        status=400,
    )

    with app.test_request_context("/", method="POST", data=b"{}"):
        status = worker()[1]

    assert status == HTTPStatus.OK  # at least one recipient succeeded
    assert len(responses.calls) == 3
    sent_recipients = [json.loads(call.request.body)["recipients"] for call in responses.calls]
    assert sent_recipients == [
        app.config["EMAIL_HOUSING_RECIPIENT_EMAIL"],
        "host@example.com",
        "bas@ba$.com",
    ]


@responses.activate
def test_worker_legacy_all_recipients_fail(app, mocker, ce_factory):
    """If every recipient send fails, the worker returns the failing notify-api status."""
    ce = ce_factory(applicationNumber="APP-1", emailType="HOST_DECLINED")
    app_obj = MagicMock(
        application_number="APP-1",
        registration_type=Registration.RegistrationType.HOST,
        noc=None,
    )
    _patch_legacy_application_flow(mocker, app_obj, ce)
    mocker.patch(
        "strr_email.resources.email_listener.ApplicationSerializer.to_dict",
        return_value=_multi_recipient_app_dict(),
    )

    responses.add(responses.POST, app.config["NOTIFY_SVC_URL"], json={"message": "bad"}, status=400)
    responses.add(responses.POST, app.config["NOTIFY_SVC_URL"], json={"message": "bad"}, status=400)
    responses.add(responses.POST, app.config["NOTIFY_SVC_URL"], json={"message": "bad"}, status=400)

    with app.test_request_context("/", method="POST", data=b"{}"):
        status = worker()[1]

    assert status == 400
    assert len(responses.calls) == 3


def test_worker_legacy_request_exception_returns_400(app, mocker, ce_factory):
    """A request exception should be treated as recipient failure and return 400 if all fail."""
    ce = ce_factory(applicationNumber="APP-1", emailType="HOST_DECLINED")
    app_obj = MagicMock(
        application_number="APP-1",
        registration_type=Registration.RegistrationType.HOST,
        noc=None,
    )
    _patch_legacy_application_flow(mocker, app_obj, ce)
    mocker.patch(
        "strr_email.resources.email_listener.ApplicationSerializer.to_dict",
        return_value=_multi_recipient_app_dict(),
    )

    with patch(
        "strr_email.resources.email_listener.requests.post",
        side_effect=RuntimeError("network timeout"),
    ) as mock_post:
        with app.test_request_context("/", method="POST", data=b"{}"):
            status = worker()[1]

    assert status == HTTPStatus.BAD_REQUEST
    assert mock_post.call_count == 3
