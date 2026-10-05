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
        HOST_APP_URL="https://host.test.registry.gov.bc.ca/",
        PLATFORM_APP_URL="https://platform.test.registry.gov.bc.ca/",
        STRATA_HOTEL_APP_URL="https://strata.test.registry.gov.bc.ca/",
        EMAIL_HOUSING_OPS_EMAIL="ops@test.gov",
        EMAIL_STRR_REQUEST_BY="STRR",
        EMAIL_SUBJECT_PREFIX="[TEST]",
        EMAIL_TEMPLATE_PATH="email-templates",
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

    strata = {
        "registration": {
            "strataHotelDetails": {
                "location": {
                    "address": "200 Resort Way",
                    "city": "Whistler",
                    "postalCode": "V0N 1B2",
                }
            }
        }
    }
    assert el._get_address_detail(strata, Registration.RegistrationType.STRATA_HOTEL, "street_address") == "200 Resort Way"
    assert el._get_address_detail(strata, Registration.RegistrationType.STRATA_HOTEL, "city") == "Whistler"
    assert el._get_address_detail(strata, Registration.RegistrationType.STRATA_HOTEL, "postalCode") == "V0N 1B2"
    assert el._get_address_detail(strata, Registration.RegistrationType.STRATA_HOTEL, "missing") == ""

    strata_line_two = {"registration": {"strataHotelDetails": {"location": {"addressLineTwo": "Suite 100"}}}}
    assert el._get_address_detail(strata_line_two, Registration.RegistrationType.STRATA_HOTEL, "street_address") == "Suite 100"


def test_resolve_template_type():
    assert el._resolve_template_type("NOC", Registration.RegistrationType.STRATA_HOTEL) == "STRATA_HOTEL_NOC"
    assert el._resolve_template_type("REGISTRATION_NOC", Registration.RegistrationType.STRATA_HOTEL) == "STRATA_HOTEL_REGISTRATION_NOC"
    assert el._resolve_template_type("STRATA_HOTEL_NOC", Registration.RegistrationType.STRATA_HOTEL) == "STRATA_HOTEL_NOC"
    assert el._resolve_template_type("STRATA_HOTEL_REGISTRATION_NOC", Registration.RegistrationType.STRATA_HOTEL) == "STRATA_HOTEL_REGISTRATION_NOC"
    assert el._resolve_template_type("STRATA_HOTEL_REGISTRATION_ACTIVE", Registration.RegistrationType.STRATA_HOTEL) == "STRATA_HOTEL_REGISTRATION_ACTIVE"
    assert el._resolve_template_type("NOC", Registration.RegistrationType.HOST) == "NOC"
    assert el._resolve_template_type("REGISTRATION_NOC", Registration.RegistrationType.HOST) == "REGISTRATION_NOC"
    assert el._resolve_template_type("PLATFORM_RENEWAL_REMINDER", Registration.RegistrationType.PLATFORM) == "PLATFORM_RENEWAL_REMINDER"


def test_get_jinja_template(cfg_app):
    with cfg_app.app_context():
        tpl_noc = el._get_jinja_template("STRATA_HOTEL_NOC")
        assert tpl_noc is not None
        assert "Notice of Consideration" in tpl_noc.render(application_num="123")

        tpl_reg_noc = el._get_jinja_template("STRATA_HOTEL_REGISTRATION_NOC")
        assert tpl_reg_noc is not None
        assert "Notice of Consideration" in tpl_reg_noc.render(reg_num="SH-12345")


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

    strata = {
        "registrationType": Registration.RegistrationType.STRATA_HOTEL.value,
        "strataHotelDetails": {"representatives": [{"contact": {"email": "rep@strata.com"}}]},
        "completingParty": {"emailAddress": "complete@strata.com"},
    }
    with cfg_app.app_context():
        s = el._get_email_recipients({"registration": strata})
    assert "complete@strata.com" in s and "rep@strata.com" in s


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


@pytest.mark.parametrize(
    "registration_type,registration_url",
    [
        (
            Registration.RegistrationType.HOST,
            "https://host.test.registry.gov.bc.ca/en-CA/dashboard/registration/R123456789",
        ),
        (
            Registration.RegistrationType.PLATFORM,
            "https://platform.test.registry.gov.bc.ca/en-CA/platform/dashboard/registration/R123456789",
        ),
        (
            Registration.RegistrationType.STRATA_HOTEL,
            "https://strata.test.registry.gov.bc.ca/en-CA/strata-hotel/dashboard/registration/R123456789",
        ),
    ],
)
def test_get_registration_deep_link(cfg_app, registration_type, registration_url):
    reg = MagicMock(
        registration_type=registration_type,
        registration_number="R123456789",
    )
    with cfg_app.app_context():
        assert el._get_registration_deep_link(reg) == registration_url


def test_get_registration_deep_link_includes_account_id(cfg_app):
    reg = MagicMock(
        registration_type=Registration.RegistrationType.HOST,
        registration_number="H123456789",
        sbc_account_id=2623,
    )
    with cfg_app.app_context():
        assert el._get_registration_deep_link(reg).endswith(
            "/en-CA/dashboard/registration/H123456789?accountId=2623"
        )


@pytest.mark.parametrize(
    "login_source,login_hint", [("BCSC", "bcsc"), ("BCEID", "bceid"), ("IDIR", "idir")]
)
def test_get_registration_deep_link_includes_login_hint(cfg_app, login_source, login_hint):
    reg = MagicMock(
        registration_type=Registration.RegistrationType.HOST,
        registration_number="H123456789",
        sbc_account_id=2623,
        user=MagicMock(login_source=login_source),
    )
    with cfg_app.app_context():
        assert (
            el._get_registration_deep_link(reg)
            == f"https://host.test.registry.gov.bc.ca/en-CA/dashboard/registration/H123456789"
            f"?accountId=2623&idp={login_hint}"
        )


@pytest.mark.parametrize(
    "registration_type,application_number,expected_url",
    [
        (
            Registration.RegistrationType.HOST,
            "A123",
            "https://host.test.registry.gov.bc.ca/en-CA/dashboard/application/A123",
        ),
        (
            Registration.RegistrationType.PLATFORM,
            "A123",
            "https://platform.test.registry.gov.bc.ca/en-CA/platform/application/A123",
        ),
        (
            Registration.RegistrationType.STRATA_HOTEL,
            "A123",
            "https://strata.test.registry.gov.bc.ca/en-CA/strata-hotel/application/A123",
        ),
        (Registration.RegistrationType.HOST, None, ""),
        (Registration.RegistrationType.HOST, "", ""),
        ("UNKNOWN", "A123", ""),
    ],
)
def test_get_application_deep_link(cfg_app, registration_type, application_number, expected_url):
    with cfg_app.app_context():
        assert el._get_application_deep_link(registration_type, application_number) == expected_url


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
    assert (
        jinja_template.render.call_args.kwargs["registration_url"]
        == "https://host.test.registry.gov.bc.ca/en-CA/dashboard/registration/R-1"
    )
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


def test_get_registration_update_email_content_for_strata_hotel_noc(cfg_app):
    noc = MagicMock(
        content="Strata NOC Notice",
        start_date=MagicMock(),
        end_date=MagicMock(strftime=MagicMock(return_value="December 15, 2026")),
    )
    loc = MagicMock(
        street_address="100 Main St",
        street_address_additional="",
        city="Kelowna",
        postal_code="V1Y1Y1",
    )
    sh = MagicMock(
        location=loc,
        representatives=[MagicMock(contact=MagicMock(email="rep@strata.com"))],
    )
    reg = MagicMock(
        registration_type=Registration.RegistrationType.STRATA_HOTEL,
        registration_number="S-12345",
        sbc_account_id=None,
        user=None,
        noc_status=RegistrationNocStatus.NOC_PENDING,
        strata_hotel_registration=MagicMock(strata_hotel=sh),
        nocs=[noc],
        expiry_date=None,
    )
    jinja_template = MagicMock(render=MagicMock(return_value="<html>strata noc</html>"))
    email_info = MagicMock(email_type="STRATA_HOTEL_REGISTRATION_NOC", custom_content="")

    with cfg_app.app_context():
        email = el._get_registration_update_email_content_for_strata_hotel(
            reg, email_info, jinja_template
        )

    kwargs = jinja_template.render.call_args.kwargs
    assert kwargs["reg_num"] == "S-12345"
    assert kwargs["street_address"] == "100 Main St"
    assert kwargs["city"] == "Kelowna"
    assert kwargs["postal_code"] == "V1Y1Y1"
    assert kwargs["noc_content"] == "Strata NOC Notice"
    assert kwargs["noc_expiry_date"] == "December 15, 2026"
    assert (
        kwargs["registration_url"]
        == "https://strata.test.registry.gov.bc.ca/en-CA/strata-hotel/dashboard/registration/S-12345"
    )
    assert email["content"]["body"] == "<html>strata noc</html>"


@patch.object(el.ApplicationSerializer, "to_dict")
def test_get_application_update_email_content_for_strata_hotel_noc(mock_to_dict, cfg_app):
    mock_to_dict.return_value = {
        "header": {"applicationNumber": "SH-9999"},
        "registration": {
            "registrationType": Registration.RegistrationType.STRATA_HOTEL.value,
            "strataHotelDetails": {
                "location": {
                    "address": "200 Resort Way",
                    "city": "Whistler",
                    "province": "BC",
                    "postalCode": "V0N1B2",
                },
                "representatives": [
                    {"contact": {"email": "rep1@strata.com"}},
                ],
            },
            "completingParty": {"emailAddress": "completing@strata.com"},
        },
    }
    noc = MagicMock(
        content="Application NOC details",
        end_date=MagicMock(strftime=MagicMock(return_value="January 10, 2027")),
        creation_date=MagicMock(strftime=MagicMock(return_value="December 10, 2026")),
    )
    application = MagicMock(
        application_number="SH-9999",
        registration_type=Registration.RegistrationType.STRATA_HOTEL,
        payment_account=None,
        submitter=None,
        noc=noc,
    )
    jinja_template = MagicMock(render=MagicMock(return_value="<html>sh app noc</html>"))
    email_info = MagicMock(email_type="STRATA_HOTEL_NOC", custom_content="")

    with cfg_app.app_context():
        email = el._get_application_update_email_content(
            application, email_info, jinja_template
        )

    kwargs = jinja_template.render.call_args.kwargs
    assert kwargs["street_address"] == "200 Resort Way"
    assert kwargs["city"] == "Whistler"
    assert kwargs["postal_code"] == "V0N1B2"
    assert kwargs["noc_content"] == "Application NOC details"
    assert kwargs["noc_expiry_date"] == "January 10, 2027"
    assert (
        kwargs["application_url"]
        == "https://strata.test.registry.gov.bc.ca/en-CA/strata-hotel/application/SH-9999"
    )
    assert email["content"]["body"] == "<html>sh app noc</html>"
