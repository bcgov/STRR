from unittest.mock import MagicMock
from unittest.mock import patch

from flask import Flask
import pytest
from simple_cloudevent import SimpleCloudEvent
from strr_api.enums.enum import RegistrationNocStatus
from strr_api.models import Registration

from strr_email.resources import email_listener as el


@pytest.fixture
def cfg_app():
    app = Flask(__name__)
    app.config.update(
        EMAIL_HOUSING_RECIPIENT_EMAIL="housing@test.gov",
        TAC_URL_HOST="https://host-tac.registry.gov.bc.ca",
        TAC_URL_PLATFORM="https://plat-tac.registry.gov.bc.ca",
        EMAIL_HOUSING_OPS_EMAIL="ops@test.gov",
        EMAIL_STRR_REQUEST_BY="STRR",
        EMAIL_SUBJECT_PREFIX="[TEST]",
    )
    return app


def test_dict_keys_to_snake_case():
    assert el.dict_keys_to_snake_case({"fooBar": "x", "Baz": "y"}) == {"foo_bar": "x", "baz": "y"}
    assert el.dict_keys_to_snake_case({"applicationNumber": "A1"}) == {"application_number": "A1"}


def test_get_email_info():
    ce = SimpleCloudEvent(
        id="1",
        source="s",
        subject="sub",
        type="t",
        data={"emailType": "HOST_DECLINED", "applicationNumber": "APP"},
    )
    info = el.get_email_info(ce)
    assert (
        info is not None and info.email_type == "HOST_DECLINED" and info.application_number == "APP"
    )


@pytest.mark.parametrize("data", ["not-a-dict", None])
def test_get_email_info_none(data):
    ce = SimpleCloudEvent(id="1", source="s", subject="sub", type="t", data=data)
    assert el.get_email_info(ce) is None


def test_get_address_detail():
    host = {"registration": {"unitAddress": {"streetNumber": "123", "city": "Vancouver"}}}
    assert el._get_address_detail(host, Registration.RegistrationType.HOST, "streetNumber") == "123"
    assert el._get_address_detail(host, Registration.RegistrationType.HOST, "missing") == ""
    non = {"registration": {"unitAddress": {}}}
    assert el._get_address_detail(non, Registration.RegistrationType.PLATFORM, "streetNumber") == ""


def test_get_expiry_date():
    assert "2026" in el._get_expiry_date(
        {"header": {"registrationEndDate": "2026-06-15T12:00:00+00:00"}}
    )
    assert el._get_expiry_date({}) == el._get_expiry_date({"header": {}}) == ""


def test_get_service_provider_and_rental_nickname():
    app_dict = {
        "registration": {
            "businessDetails": {"legalName": "Acme Ltd"},
            "unitAddress": {"nickname": "Sea"},
        }
    }
    assert el._get_service_provider(app_dict, Registration.RegistrationType.PLATFORM) == "Acme Ltd"
    assert el._get_service_provider(app_dict, Registration.RegistrationType.HOST) == ""
    assert el._get_rental_nickname(app_dict, Registration.RegistrationType.HOST) == "Sea"
    assert el._get_rental_nickname(app_dict, Registration.RegistrationType.PLATFORM) is None


def test_get_email_recipients(cfg_app):
    host = {
        "registrationType": Registration.RegistrationType.HOST.value,
        "primaryContact": {"emailAddress": "host@example.com"},
    }
    with cfg_app.app_context():
        out = el._get_email_recipients(
            {
                "registration": {
                    **host,
                    "propertyManager": {"contact": {"emailAddress": "pm@example.com"}},
                }
            }
        )
    assert "housing@test.gov" in out and "host@example.com" in out and "pm@example.com" in out

    cfg_app.config["EMAIL_HOUSING_RECIPIENT_EMAIL"] = ""
    with cfg_app.app_context():
        biz = el._get_email_recipients(
            {
                "registration": {
                    **host,
                    "propertyManager": {
                        "business": {"primaryContact": {"emailAddress": "biz@example.com"}}
                    },
                }
            }
        )
    assert "biz@example.com" in biz

    plat = {
        "registrationType": Registration.RegistrationType.PLATFORM.value,
        "platformRepresentatives": [{"emailAddress": "rep1@example.com"}],
        "completingParty": {"emailAddress": "rep1@example.com"},
    }
    with cfg_app.app_context():
        assert "rep1@example.com" in el._get_email_recipients({"registration": plat})

    plat2 = {**plat, "completingParty": {"emailAddress": "complete@example.com"}}
    with cfg_app.app_context():
        r = el._get_email_recipients({"registration": plat2})
    assert "complete@example.com" in r and "rep1@example.com" in r


def test_get_client_recipients(cfg_app):
    with cfg_app.app_context():
        assert (
            el._get_client_recipients(
                {"registration": {"registrationType": Registration.RegistrationType.PLATFORM.value}}
            )
            == ""
        )

    cfg_app.config["EMAIL_HOUSING_RECIPIENT_EMAIL"] = ""
    with cfg_app.app_context():
        out = el._get_client_recipients(
            {
                "registration": {
                    "registrationType": Registration.RegistrationType.HOST.value,
                    "primaryContact": {"emailAddress": "host@example.com"},
                    "propertyManager": {
                        "business": {"primaryContact": {"emailAddress": "pm-biz@example.com"}},
                    },
                }
            }
        )
    assert "host@example.com" in out and "pm-biz@example.com" in out


def test_tac_urls(cfg_app):
    mock_app = MagicMock()
    reg = MagicMock(spec=Registration)
    for rt in (
        Registration.RegistrationType.HOST,
        Registration.RegistrationType.PLATFORM,
        Registration.RegistrationType.STRATA_HOTEL,
    ):
        mock_app.registration_type = reg.registration_type = rt
        if rt == Registration.RegistrationType.HOST:
            want = "https://host-tac.registry.gov.bc.ca"
        elif rt == Registration.RegistrationType.PLATFORM:
            want = "https://plat-tac.registry.gov.bc.ca"
        else:
            want = ""
        with cfg_app.app_context():
            assert el._get_tac_url(mock_app) == want
            assert el._get_registration_tac_url(reg) == want


@pytest.mark.parametrize("with_pm", [False, True])
def test_get_registration_email_recipients(cfg_app, with_pm):
    primary_contact = MagicMock(is_primary=True, contact=MagicMock(email="primary@example.com"))
    secondary = MagicMock(is_primary=False)
    rp = MagicMock(contacts=[primary_contact, secondary])
    if with_pm:
        rp.contacts = [primary_contact]
        rp.property_manager = MagicMock(primary_contact=MagicMock(email="pm@example.com"))
    else:
        rp.property_manager = None

    reg = MagicMock(registration_type=Registration.RegistrationType.HOST.value, rental_property=rp)
    with cfg_app.app_context():
        out = el._get_registration_email_recipients(reg)
    assert "primary@example.com" in out and "housing@test.gov" in out
    if with_pm:
        assert "pm@example.com" in out


@patch.object(el.ApplicationSerializer, "to_dict")
def test_get_application_update_email_content_with_noc(mock_to_dict, cfg_app):
    mock_to_dict.return_value = {
        "header": {"registrationNumber": "RN1", "registrationEndDate": "2026-01-01T00:00:00+00:00"},
        "registration": {
            "registrationType": Registration.RegistrationType.HOST.value,
            "unitAddress": {"streetNumber": "1", "city": "Vic"},
            "primaryContact": {"emailAddress": "a@b.c"},
        },
    }
    noc = MagicMock(
        content="NOC body",
        end_date=MagicMock(strftime=MagicMock(return_value="March 1, 2026")),
        creation_date=MagicMock(strftime=MagicMock(return_value="February 1, 2026")),
    )
    application = MagicMock(
        application_number="APP-1",
        registration_type=Registration.RegistrationType.HOST,
        noc=noc,
    )
    jinja_template = MagicMock(render=MagicMock(return_value="<html>ok</html>"))
    email_info = MagicMock(email_type="HOST_DECLINED", custom_content="")
    with cfg_app.app_context():
        email = el._get_application_update_email_content(application, email_info, jinja_template)
    assert "NOC body" in str(jinja_template.render.call_args)
    assert email["content"]["body"] == "<html>ok</html>"


def test_get_registration_update_email_content_for_host_noc_pending(cfg_app):
    noc1 = MagicMock(
        start_date=MagicMock(),
        content="Pending NOC",
        end_date=MagicMock(strftime=MagicMock(return_value="April 1, 2026")),
    )
    pc = MagicMock(is_primary=True, contact=MagicMock(email="host@example.com"))
    rp = MagicMock(
        contacts=[pc],
        property_manager=None,
        address=MagicMock(
            street_number="10",
            unit_number="",
            street_address="Oak",
            street_address_additional="",
            city="Vic",
            postal_code="V8V1A1",
        ),
        nickname="Cottage",
    )
    reg = MagicMock(
        registration_type=Registration.RegistrationType.HOST,
        registration_number="R-1",
        noc_status=RegistrationNocStatus.NOC_PENDING,
        nocs=[noc1],
        rental_property=rp,
        expiry_date=MagicMock(strftime=MagicMock(return_value="January 1, 2028")),
    )
    jinja_template = MagicMock(render=MagicMock(return_value="<html>host</html>"))
    email_info = MagicMock(email_type="HOST_RENEWAL_REMINDER", custom_content="")
    with cfg_app.app_context():
        email = el._get_registration_update_email_content_for_host(reg, email_info, jinja_template)
    assert "Pending NOC" in str(jinja_template.render.call_args)
    assert email["content"]["body"] == "<html>host</html>"


@pytest.mark.parametrize(
    "fn,email,extra",
    [
        (
            el._get_platform_notification_recipients,
            "rep@platform.com",
            lambda: MagicMock(
                representatives=[MagicMock(contact=MagicMock(email="rep@platform.com"))]
            ),
        ),
        (
            el._get_strata_hotel_notification_recipients,
            "rep@strata.com",
            lambda: MagicMock(
                representatives=[MagicMock(contact=MagicMock(email="rep@strata.com"))]
            ),
        ),
    ],
    ids=["platform", "strata_hotel"],
)
def test_platform_and_strata_notification_recipients(cfg_app, fn, email, extra):
    with cfg_app.app_context():
        out = fn(extra())
    assert "housing@test.gov" in out and email in out
