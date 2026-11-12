# Copyright © 2025 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
# pylint: disable=R0911, R0912
"""This Module processes and sends email messages via the notify-api."""

from datetime import datetime
from http import HTTPStatus
from pathlib import Path
import re
import traceback
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from flask import Blueprint
from flask import current_app
from flask import jsonify
from flask import request
from jinja2 import Template
from simple_cloudevent import SimpleCloudEvent
from strr_api.enums.enum import ChannelType
from strr_api.enums.enum import InteractionStatus
from strr_api.enums.enum import RegistrationNocStatus
from strr_api.models import Application
from strr_api.models import Platform
from strr_api.models import Registration
from strr_api.models import StrataHotel
from strr_api.models.application import ApplicationSerializer
from strr_api.services import InteractionService
from strr_api.services import RegistrationService
from strr_api.services.interaction import EmailInfo
from structured_logging import StructuredLogging

from strr_email.services import gcp_queue

bp = Blueprint("worker", __name__)

logger = StructuredLogging.get_logger()

SUBJECT_REGISTRATION_APPROVED = "Short-Term Rental Registration Approved"
SUBJECT_REGISTRATION_CANCELLED = "Short-Term Rental Registration Cancelled"
SUBJECT_REGISTRATION_SUSPENDED = "Short-Term Rental Registration Suspended"
SUBJECT_NOTICE_OF_CONSIDERATION = "Short-Term Rental Notice of Consideration"
SUBJECT_RENEWAL_REMINDER = "Short-Term Rental Registration Renewal Reminder"
DATE_FORMAT_LONG = "%B %d, %Y"

EMAIL_SUBJECT = {
    "HOST_AUTO_APPROVED": SUBJECT_REGISTRATION_APPROVED,
    "HOST_FULL_REVIEW_APPROVED": SUBJECT_REGISTRATION_APPROVED,
    "HOST_PROVISIONAL_REVIEW": "Short-Term Rental Registration Provisionally Approved",
    "PLATFORM_AUTO_APPROVED": "Short-Term Rental Platform Registration Approved",
    "NOC": SUBJECT_NOTICE_OF_CONSIDERATION,
    "PROVISIONAL_REVIEW_NOC": SUBJECT_NOTICE_OF_CONSIDERATION,
    "REGISTRATION_NOC": SUBJECT_NOTICE_OF_CONSIDERATION,
    "HOST_PROVISIONALLY_APPROVED": "Short-Term Rental Registration Fully Approved",
    "HOST_DECLINED": "Short-Term Rental Application Refused",
    "HOST_REGISTRATION_CANCELLED": SUBJECT_REGISTRATION_CANCELLED,
    "HOST_REGISTRATION_SUSPENDED": SUBJECT_REGISTRATION_SUSPENDED,
    "HOST_REGISTRATION_ACTIVE": SUBJECT_REGISTRATION_APPROVED,
    "STRATA_HOTEL_REGISTRATION_ACTIVE": SUBJECT_REGISTRATION_APPROVED,
    "STRATA_HOTEL_REGISTRATION_SUSPENDED": SUBJECT_REGISTRATION_SUSPENDED,
    "STRATA_HOTEL_REGISTRATION_CANCELLED": SUBJECT_REGISTRATION_CANCELLED,
    "STRATA_HOTEL_NOC": SUBJECT_NOTICE_OF_CONSIDERATION,
    "STRATA_HOTEL_REGISTRATION_NOC": SUBJECT_NOTICE_OF_CONSIDERATION,
    "HOST_RENEWAL_REMINDER": SUBJECT_RENEWAL_REMINDER,
    "STRATA_HOTEL_RENEWAL_REMINDER": SUBJECT_RENEWAL_REMINDER,
    "PLATFORM_RENEWAL_REMINDER": SUBJECT_RENEWAL_REMINDER,
    "REGISTRATION_CANCELLED": SUBJECT_REGISTRATION_CANCELLED,
    "REGISTRATION_SUSPENDED": SUBJECT_REGISTRATION_SUSPENDED,
    "REGISTRATION_ACTIVE": SUBJECT_REGISTRATION_APPROVED,
}


def _fail_orphaned_interaction(email_info, reason: str) -> None:
    """Mark a queued interaction as FAILED if interaction_uuid or interaction key is available."""
    try:
        interaction_uuid = getattr(email_info, "interaction_uuid", None)
        interaction_key = getattr(email_info, "interaction", None)
        interaction = None
        from strr_api.models import CustomerInteraction

        if interaction_uuid:
            interaction = CustomerInteraction.find_by_uuid(interaction_uuid)
        if not interaction and interaction_key:
            interaction = CustomerInteraction.query.filter_by(
                idempotency_key=interaction_key
            ).one_or_none()

        if interaction and interaction.status == InteractionStatus.QUEUED:
            interaction.status = InteractionStatus.FAILED
            meta = dict(interaction.meta_data or {})
            meta["failure_reason"] = reason
            meta["dispatch_error"] = reason
            meta["failed_at"] = datetime.now(ZoneInfo("UTC")).isoformat()
            interaction.meta_data = meta
            interaction.save()
            logger.warning(
                "strr.email.orphaned_interaction_failed interaction_uuid=%s reason=%s",
                interaction.interaction_uuid,
                reason,
            )
    except Exception as exc:
        logger.error("Failed to mark orphaned interaction as FAILED: %s", exc)


@bp.route("/", methods=("POST",))
def worker():
    """Process the incoming file uploaded event."""
    if not request.data:
        # logger(request, "INFO", f"No incoming raw msg.")
        return {}, HTTPStatus.OK

    logger.info(f"Incoming raw msg: {str(request.data)}")

    # 1. Get cloud event
    if not (ce := gcp_queue.get_simple_cloud_event(request, wrapped=True)):
        #
        # Decision here is to return a 200,
        # so the event is removed from the Queue
        logger.info("get_simple_cloud_event returned none")
        return {}, HTTPStatus.OK

    event_id = getattr(ce, "id", None)
    logger.info("received ce (event_id=%s): %s", event_id, ce)

    # 2. Get email information
    if not (email_info := get_email_info(ce)):
        # no email info or not an email event
        return {}, HTTPStatus.OK

    email = None
    application = None
    registration = None

    # 3. Lookup entity and build email content
    if email_info.application_number:
        if not (
            application := Application.find_by_application_number(email_info.application_number)
        ):
            # no application matching the application number
            logger.error(
                "Error: application %s not found (event_id=%s)",
                email_info.application_number,
                event_id,
            )
            return (
                jsonify(
                    {"message": f"Application number ({email_info.application_number}) not found."}
                ),
                HTTPStatus.NOT_FOUND,
            )

        template_type = _resolve_template_type(email_info.email_type, application.registration_type)
        try:
            jinja_template = _get_jinja_template(template_type)
        except Exception as exc:
            logger.error(
                "Failed to load email template: %s for email_type: %s", exc, email_info.email_type
            )
            _fail_orphaned_interaction(email_info, f"Template not found: {template_type}")
            return (
                jsonify({"message": f"Template not found: {template_type}"}),
                HTTPStatus.BAD_REQUEST,
            )

        email = _get_application_update_email_content(application, email_info, jinja_template)

    elif email_info.registration_number:
        if not (
            registration := RegistrationService.find_by_registration_number(
                email_info.registration_number
            )
        ):
            # no registration matching the registration number
            logger.error(
                "Error: Registration %s not found (event_id=%s)",
                email_info.registration_number,
                event_id,
            )
            return (
                jsonify(
                    {
                        "message": f"Registration number ({email_info.registration_number}) not found."
                    }
                ),
                HTTPStatus.NOT_FOUND,
            )

        template_type = _resolve_template_type(
            email_info.email_type, registration.registration_type
        )
        try:
            jinja_template = _get_jinja_template(template_type)
        except Exception as exc:
            logger.error(
                "Failed to load email template: %s for email_type: %s", exc, email_info.email_type
            )
            _fail_orphaned_interaction(email_info, f"Template not found: {template_type}")
            return (
                jsonify({"message": f"Template not found: {template_type}"}),
                HTTPStatus.BAD_REQUEST,
            )

        reg_type = getattr(registration.registration_type, "value", registration.registration_type)
        if reg_type == Registration.RegistrationType.HOST.value:
            if template_type in (
                "HOST_REGISTRATION_ACTIVE",
                "HOST_REGISTRATION_SUSPENDED",
                "HOST_REGISTRATION_CANCELLED",
                "HOST_RENEWAL_REMINDER",
                "REGISTRATION_NOC",
            ):
                email = _get_registration_update_email_content_for_host(
                    registration, email_info, jinja_template
                )
            else:
                logger.error(
                    "Unhandled email_type %s for Host registration %s",
                    email_info.email_type,
                    registration.registration_number,
                )
                _fail_orphaned_interaction(
                    email_info, f"Unhandled email_type: {email_info.email_type}"
                )
                return (
                    jsonify({"message": f"Unhandled email_type: {email_info.email_type}"}),
                    HTTPStatus.BAD_REQUEST,
                )
        elif reg_type == Registration.RegistrationType.STRATA_HOTEL.value:
            if template_type in (
                "STRATA_HOTEL_REGISTRATION_ACTIVE",
                "STRATA_HOTEL_REGISTRATION_SUSPENDED",
                "STRATA_HOTEL_REGISTRATION_CANCELLED",
                "STRATA_HOTEL_RENEWAL_REMINDER",
                "STRATA_HOTEL_REGISTRATION_NOC",
                "STRATA_HOTEL_NOC",
            ):
                email = _get_registration_update_email_content_for_strata_hotel(
                    registration, email_info, jinja_template
                )
            else:
                logger.error(
                    "Unhandled email_type %s for Strata Hotel registration %s",
                    email_info.email_type,
                    registration.registration_number,
                )
                _fail_orphaned_interaction(
                    email_info, f"Unhandled email_type: {email_info.email_type}"
                )
                return (
                    jsonify({"message": f"Unhandled email_type: {email_info.email_type}"}),
                    HTTPStatus.BAD_REQUEST,
                )
        elif reg_type == Registration.RegistrationType.PLATFORM.value:
            if template_type == "PLATFORM_RENEWAL_REMINDER":
                email = _get_registration_update_email_content_for_platform(
                    registration, email_info, jinja_template
                )
            else:
                logger.error(
                    "Unhandled email_type %s for Platform registration %s",
                    email_info.email_type,
                    registration.registration_number,
                )
                _fail_orphaned_interaction(
                    email_info, f"Unhandled email_type: {email_info.email_type}"
                )
                return (
                    jsonify({"message": f"Unhandled email_type: {email_info.email_type}"}),
                    HTTPStatus.BAD_REQUEST,
                )
        else:
            logger.error(
                "Unhandled registration_type %s for email_type %s",
                reg_type,
                email_info.email_type,
            )
            _fail_orphaned_interaction(email_info, f"Unhandled registration_type: {reg_type}")
            return (
                jsonify({"message": f"Unhandled registration_type: {reg_type}"}),
                HTTPStatus.BAD_REQUEST,
            )
    else:
        logger.error("Missing application or registration number (event_id=%s)", event_id)
        _fail_orphaned_interaction(email_info, "Missing application or registration number")
        return (
            jsonify({"message": "Missing application or registration number."}),
            HTTPStatus.BAD_REQUEST,
        )

    if not email:
        logger.error(
            "Email content could not be generated for email_type: %s",
            email_info.email_type,
        )
        _fail_orphaned_interaction(
            email_info, f"Email content could not be generated for {email_info.email_type}"
        )
        return (
            jsonify({"message": "Email content could not be generated."}),
            HTTPStatus.BAD_REQUEST,
        )

    # 4. InteractionService splits comma-separated recipients before sending to Notify.
    try:
        email_info.email = email
        resp = InteractionService.dispatch(
            channel_type=ChannelType.EMAIL,
            payload=email_info,
            idempotency_key=email_info.interaction,
            interaction_uuid=email_info.interaction_uuid,
            application_id=application.id if application else None,
            registration_id=registration.id if registration else None,
        )
        logger.info("completed ce (event_id=%s): %s", event_id, ce)
        return jsonify({"interaction": resp.interaction_uuid}), HTTPStatus.OK

    except Exception as err:
        logger.error(
            "strr.email.notify.failed Error posting email to notify-api "
            "cloud_event_id=%s email_type=%s application_number=%s registration_number=%s "
            "interaction_uuid=%s interaction_key=%s error=%s traceback=%s",
            getattr(ce, "id", None),
            email_info.email_type,
            email_info.application_number,
            email_info.registration_number,
            email_info.interaction_uuid,
            email_info.interaction,
            err,
            traceback.format_exc(),
        )
        return jsonify({"message": "Error posting email to notify-api."}), HTTPStatus.BAD_REQUEST


_TEMPLATE_TYPE_MAP = {
    Registration.RegistrationType.STRATA_HOTEL.value: {
        "NOC": "STRATA_HOTEL_NOC",
        "STRATA_HOTEL_NOC": "STRATA_HOTEL_NOC",
        "REGISTRATION_NOC": "STRATA_HOTEL_REGISTRATION_NOC",
        "STRATA_HOTEL_REGISTRATION_NOC": "STRATA_HOTEL_REGISTRATION_NOC",
        "REGISTRATION_CANCELLED": "STRATA_HOTEL_REGISTRATION_CANCELLED",
        "STRATA_HOTEL_REGISTRATION_CANCELLED": "STRATA_HOTEL_REGISTRATION_CANCELLED",
        "REGISTRATION_SUSPENDED": "STRATA_HOTEL_REGISTRATION_SUSPENDED",
        "STRATA_HOTEL_REGISTRATION_SUSPENDED": "STRATA_HOTEL_REGISTRATION_SUSPENDED",
        "REGISTRATION_ACTIVE": "STRATA_HOTEL_REGISTRATION_ACTIVE",
        "STRATA_HOTEL_REGISTRATION_ACTIVE": "STRATA_HOTEL_REGISTRATION_ACTIVE",
        "RENEWAL_REMINDER": "STRATA_HOTEL_RENEWAL_REMINDER",
        "STRATA_HOTEL_RENEWAL_REMINDER": "STRATA_HOTEL_RENEWAL_REMINDER",
    },
    Registration.RegistrationType.HOST.value: {
        "REGISTRATION_CANCELLED": "HOST_REGISTRATION_CANCELLED",
        "HOST_REGISTRATION_CANCELLED": "HOST_REGISTRATION_CANCELLED",
        "REGISTRATION_SUSPENDED": "HOST_REGISTRATION_SUSPENDED",
        "HOST_REGISTRATION_SUSPENDED": "HOST_REGISTRATION_SUSPENDED",
        "REGISTRATION_ACTIVE": "HOST_REGISTRATION_ACTIVE",
        "HOST_REGISTRATION_ACTIVE": "HOST_REGISTRATION_ACTIVE",
        "RENEWAL_REMINDER": "HOST_RENEWAL_REMINDER",
        "HOST_RENEWAL_REMINDER": "HOST_RENEWAL_REMINDER",
    },
    Registration.RegistrationType.PLATFORM.value: {
        "RENEWAL_REMINDER": "PLATFORM_RENEWAL_REMINDER",
        "PLATFORM_RENEWAL_REMINDER": "PLATFORM_RENEWAL_REMINDER",
    },
}


def _resolve_template_type(email_type: str, reg_type) -> str:
    """Resolve the template type, mapping generic NOCs and cancellations to specific templates."""
    reg_type_str = getattr(reg_type, "value", reg_type)
    return _TEMPLATE_TYPE_MAP.get(reg_type_str, {}).get(email_type, email_type)


def _get_jinja_template(template_type: str) -> Template:
    """Load and prepare a Jinja template from a markdown file."""
    template = Path(
        f'{current_app.config["EMAIL_TEMPLATE_PATH"]}/strr-{template_type}.md'
    ).read_text("utf-8")
    filled_template = substitute_template_parts(template)
    return Template(filled_template, autoescape=True)


def _get_registration_update_email_content_for_host(
    registration: Registration, email_info, jinja_template
):
    noc_content = ""
    noc_expiry_date = ""
    if registration.nocs and (
        registration.noc_status
        in [RegistrationNocStatus.NOC_PENDING, RegistrationNocStatus.NOC_EXPIRED]
        or "NOC" in email_info.email_type
    ):
        noc = max(
            registration.nocs,
            key=lambda n: getattr(n, "start_date", None) or getattr(n, "created_date", None) or 0,
        )
        noc_content = getattr(noc, "content", "") or getattr(noc, "notice_of_consideration", "")
        if end_date := getattr(noc, "end_date", None):
            noc_expiry_date = end_date.strftime(DATE_FORMAT_LONG)
    noc_content = noc_content or email_info.custom_content or ""
    recipients = _get_registration_email_recipients(registration)
    html_out = jinja_template.render(
        reg_num=registration.registration_number,
        street_number=registration.rental_property.address.street_number,
        unit_number=registration.rental_property.address.unit_number,
        street_name=registration.rental_property.address.street_address
        or registration.rental_property.address.street_address_additional,
        city=registration.rental_property.address.city,
        province=registration.rental_property.address.province,
        postal_code=registration.rental_property.address.postal_code,
        ops_email=current_app.config["EMAIL_HOUSING_OPS_EMAIL"],
        rental_nickname=registration.rental_property.nickname,
        custom_content=email_info.custom_content,
        noc_content=noc_content,
        noc_expiry_date=noc_expiry_date,
        expiry_date=registration.expiry_date.strftime(DATE_FORMAT_LONG),
        registration_url=_get_registration_deep_link(registration),
        tac_url=_get_registration_tac_url(registration),
    )
    subject_number = registration.registration_number
    subject = (
        f"{current_app.config['EMAIL_SUBJECT_PREFIX']} "
        + f"{subject_number} - {EMAIL_SUBJECT.get(email_info.email_type, '')}"
    ).strip()
    email = {
        "recipients": recipients,
        # requestBy is how the notify-api determines which GC Notify account to use
        "requestBy": current_app.config["EMAIL_STRR_REQUEST_BY"],
        "content": {"subject": subject, "body": f"{html_out}"},
    }
    return email


def _get_registration_update_email_content_for_platform(
    registration: Registration, email_info, jinja_template
):
    platform = registration.platform_registration.platform
    recipients = _get_platform_notification_recipients(platform)
    html_out = jinja_template.render(
        reg_num=registration.registration_number,
        ops_email=current_app.config["EMAIL_HOUSING_OPS_EMAIL"],
        expiry_date=registration.expiry_date.strftime(DATE_FORMAT_LONG),
        registration_url=_get_registration_deep_link(registration),
        tac_url=_get_registration_tac_url(registration),
        service_provider=platform.legal_name,
    )
    subject_number = registration.registration_number
    subject = (
        f"{current_app.config['EMAIL_SUBJECT_PREFIX']} "
        + f"{subject_number} - {EMAIL_SUBJECT.get(email_info.email_type, '')}"
    ).strip()
    email = {
        "recipients": recipients,
        "requestBy": current_app.config["EMAIL_STRR_REQUEST_BY"],
        "content": {"subject": subject, "body": f"{html_out}"},
    }
    return email


def _get_registration_update_email_content_for_strata_hotel(
    registration: Registration, email_info, jinja_template
):
    noc_content = ""
    noc_expiry_date = ""
    if registration.nocs and (
        registration.noc_status
        in [RegistrationNocStatus.NOC_PENDING, RegistrationNocStatus.NOC_EXPIRED]
        or "NOC" in email_info.email_type
    ):
        noc = max(
            registration.nocs,
            key=lambda n: getattr(n, "start_date", None) or getattr(n, "created_date", None) or 0,
        )
        noc_content = getattr(noc, "content", "") or getattr(noc, "notice_of_consideration", "")
        if end_date := getattr(noc, "end_date", None):
            noc_expiry_date = end_date.strftime(DATE_FORMAT_LONG)
    noc_content = noc_content or email_info.custom_content or ""

    strata_hotel = registration.strata_hotel_registration.strata_hotel
    recipients = _get_strata_hotel_notification_recipients(strata_hotel)
    expiry_date_str = (
        registration.expiry_date.strftime(DATE_FORMAT_LONG) if registration.expiry_date else ""
    )
    html_out = jinja_template.render(
        reg_num=registration.registration_number,
        street_address=strata_hotel.location.street_address
        or strata_hotel.location.street_address_additional,
        city=strata_hotel.location.city,
        postal_code=strata_hotel.location.postal_code,
        ops_email=current_app.config["EMAIL_HOUSING_OPS_EMAIL"],
        expiry_date=expiry_date_str,
        custom_content=email_info.custom_content,
        noc_content=noc_content,
        noc_expiry_date=noc_expiry_date,
        registration_url=_get_registration_deep_link(registration),
        tac_url=_get_registration_tac_url(registration),
    )
    subject_number = registration.registration_number
    subject = (
        f"{current_app.config['EMAIL_SUBJECT_PREFIX']} "
        + f"{subject_number} - {EMAIL_SUBJECT.get(email_info.email_type, '')}"
    ).strip()
    email = {
        "recipients": recipients,
        # requestBy is how the notify-api determines which GC Notify account to use
        "requestBy": current_app.config["EMAIL_STRR_REQUEST_BY"],
        "content": {"subject": subject, "body": f"{html_out}"},
    }
    return email


def _normalize_and_deduplicate_emails(emails: list[Any]) -> list[str]:
    """Strip, lowercase, and deduplicate a list of email strings preserving order."""
    seen = set()
    result = []
    for email in emails:
        if email and isinstance(email, str) and email.strip():
            normalized = email.strip().lower()
            if normalized not in seen:
                seen.add(normalized)
                result.append(normalized)
    return result


def _get_strata_hotel_notification_recipients(strata_hotel: StrataHotel) -> str:
    raw_recipients: list[str] = []

    if housing_recipient_email := current_app.config.get("EMAIL_HOUSING_RECIPIENT_EMAIL"):
        raw_recipients.append(housing_recipient_email)

    for representative in getattr(strata_hotel, "representatives", []) or []:
        if representative.contact and representative.contact.email:
            raw_recipients.append(representative.contact.email)

    return ",".join(_normalize_and_deduplicate_emails(raw_recipients))


def _get_platform_notification_recipients(platform: Platform) -> str:
    raw_recipients: list[str] = []

    if housing_recipient_email := current_app.config.get("EMAIL_HOUSING_RECIPIENT_EMAIL"):
        raw_recipients.append(housing_recipient_email)

    for representative in getattr(platform, "representatives", []) or []:
        if representative.contact and representative.contact.email:
            raw_recipients.append(representative.contact.email)

    return ",".join(_normalize_and_deduplicate_emails(raw_recipients))


def _get_application_update_email_content(application, email_info, jinja_template):
    app_dict = ApplicationSerializer.to_dict(application)
    noc_content = ""
    noc_expiry_date = ""
    noc_sent_date = ""
    if noc := application.noc:
        noc_content = noc.content
        noc_expiry_date = noc.end_date.strftime(DATE_FORMAT_LONG)
        noc_sent_date = noc.creation_date.strftime(DATE_FORMAT_LONG)
    recipients = _get_email_recipients(app_dict)
    client_recipients = _get_client_recipients(app_dict)
    html_out = jinja_template.render(
        application_num=application.application_number,
        reg_num=app_dict.get("header", {}).get("registrationNumber"),
        street_address=_get_address_detail(
            app_dict, application.registration_type, "street_address"
        ),
        street_number=_get_address_detail(app_dict, application.registration_type, "streetNumber"),
        unit_number=_get_address_detail(app_dict, application.registration_type, "unitNumber"),
        street_name=_get_address_detail(app_dict, application.registration_type, "streetName")
        or _get_address_detail(app_dict, application.registration_type, "addressLineTwo"),
        city=_get_address_detail(app_dict, application.registration_type, "city"),
        province=_get_address_detail(app_dict, application.registration_type, "province"),
        postal_code=_get_address_detail(app_dict, application.registration_type, "postalCode"),
        expiry_date=_get_expiry_date(app_dict),
        registration_url=_get_registration_deep_link_for_type(
            application.registration_type,
            app_dict.get("header", {}).get("registrationNumber"),
            application.payment_account,
            getattr(application.submitter, "login_source", None),
        ),
        application_url=_get_application_deep_link(
            application.registration_type,
            application.application_number,
            application.payment_account,
            getattr(application.submitter, "login_source", None),
        ),
        service_provider=_get_service_provider(app_dict, application.registration_type),
        tac_url=_get_tac_url(application),
        ops_email=current_app.config["EMAIL_HOUSING_OPS_EMAIL"],
        noc_content=noc_content,
        noc_expiry_date=noc_expiry_date,
        noc_sent_date=noc_sent_date,
        rental_nickname=_get_rental_nickname(app_dict, application.registration_type),
        custom_content=email_info.custom_content,
        client_recipients=client_recipients,
    )
    subject_number = (
        app_dict.get("header", {}).get("registrationNumber") or application.application_number
    )
    subject = (
        f"{current_app.config['EMAIL_SUBJECT_PREFIX']} "
        + f"{subject_number} - {EMAIL_SUBJECT.get(email_info.email_type, '')}"
    ).strip()
    email = {
        "recipients": recipients,
        # requestBy is how the notify-api determines which GC Notify account to use
        "requestBy": current_app.config["EMAIL_STRR_REQUEST_BY"],
        "content": {"subject": subject, "body": f"{html_out}"},
    }
    return email


def _get_rental_nickname(app_dict, reg_type: Registration.RegistrationType) -> str | None:
    """Return the rental unit nick name."""
    if reg_type == Registration.RegistrationType.HOST:
        if nick_name := app_dict.get("registration").get("unitAddress").get("nickname"):
            return nick_name
    return None


def _get_address_detail(
    app_dict: dict, reg_type: Registration.RegistrationType, detail: str
) -> str | None:
    """Return address details for host or strata hotel."""
    reg = app_dict.get("registration", {})
    if reg_type == Registration.RegistrationType.HOST:
        address = reg.get("unitAddress", {})
        return address.get(detail, "")
    if reg_type == Registration.RegistrationType.STRATA_HOTEL:
        location = reg.get("strataHotelDetails", {}).get("location", {})
        if detail == "street_address":
            return location.get("address") or location.get("addressLineTwo") or ""
        return location.get(detail, "")
    return ""


def _get_expiry_date(app_dict: dict) -> str:
    """Return the expiry date as a formatted string."""
    if app_dict.get("header", {}).get("registrationEndDate"):
        date_time = datetime.fromisoformat(app_dict["header"]["registrationEndDate"]).astimezone(
            ZoneInfo("America/Vancouver")
        )
        return date_time.strftime("%B %-d, %Y")
    return ""


def _get_service_provider(app_dict: dict, reg_type: Registration.RegistrationType) -> str:
    """Return the service provider as a string."""
    if reg_type != Registration.RegistrationType.PLATFORM:
        return ""
    return app_dict["registration"]["businessDetails"]["legalName"]


def _extract_property_manager_email(property_manager) -> str | None:
    """Extract email address from property manager entity."""
    if not property_manager:
        return None
    pm_contact = getattr(property_manager, "primary_contact", None) or getattr(
        property_manager, "contact", None
    )
    if pm_contact:
        return getattr(pm_contact, "email", None) or getattr(pm_contact, "email_address", None)
    return None


def _extract_host_registration_emails(registration: Registration) -> list[str]:
    """Extract emails for host rental property contacts, property manager, and applicant."""
    emails: list[str] = []
    if not registration.rental_property:
        return emails

    for property_contact in registration.rental_property.contacts or []:
        contact = getattr(property_contact, "contact", None)
        if contact and contact.email:
            emails.append(contact.email)

    if pm_email := _extract_property_manager_email(registration.rental_property.property_manager):
        emails.append(pm_email)

    applicant = getattr(registration, "user", None)
    applicant_email = getattr(applicant, "email", None) if applicant else None
    if applicant_email:
        emails.append(applicant_email)

    return emails


def _get_registration_email_recipients(registration: Registration) -> str:
    """Return the email recipients in a string separated by commas, normalized and deduplicated."""
    raw_recipients: list[str] = []

    if housing_recipient_email := current_app.config.get("EMAIL_HOUSING_RECIPIENT_EMAIL"):
        raw_recipients.append(housing_recipient_email)

    reg_type = getattr(registration.registration_type, "value", registration.registration_type)
    if reg_type == Registration.RegistrationType.HOST.value:
        raw_recipients.extend(_extract_host_registration_emails(registration))

    return ",".join(_normalize_and_deduplicate_emails(raw_recipients))


def _get_host_client_recipients(reg: dict) -> list[str]:
    raw = []
    if primary := reg.get("primaryContact"):
        if email := primary.get("emailAddress"):
            raw.append(email)
    if property_manager := reg.get("propertyManager"):
        email = property_manager.get("contact", {}).get("emailAddress") or property_manager.get(
            "business", {}
        ).get("primaryContact", {}).get("emailAddress")
        if email:
            raw.append(email)
    return _normalize_and_deduplicate_emails(raw)


def _get_platform_client_recipients(reg: dict) -> list[str]:
    raw = [
        rep.get("emailAddress")
        for rep in reg.get("platformRepresentatives", [])
        if rep.get("emailAddress")
    ]
    if comp_party := reg.get("completingParty", {}).get("emailAddress"):
        raw.append(comp_party)
    return _normalize_and_deduplicate_emails(raw)


def _get_strata_hotel_client_recipients(reg: dict) -> list[str]:
    raw = []
    for rep in reg.get("strataHotelRepresentatives", []):
        if rep_email := rep.get("emailAddress"):
            raw.append(rep_email)

    for rep in reg.get("strataHotelDetails", {}).get("representatives", []):
        rep_email = (
            rep.get("emailAddress")
            or rep.get("contact", {}).get("email")
            or rep.get("contact", {}).get("emailAddress")
        )
        if rep_email:
            raw.append(rep_email)

    if comp_party := reg.get("completingParty", {}).get("emailAddress"):
        raw.append(comp_party)
    return _normalize_and_deduplicate_emails(raw)


def _get_client_recipients(app_dict: dict) -> str:
    "Return the client recipients in a string separated by commas."
    reg = app_dict["registration"]
    reg_type = reg.get("registrationType")

    if reg_type == Registration.RegistrationType.HOST.value:
        recipients = _get_host_client_recipients(reg)
    elif reg_type == Registration.RegistrationType.PLATFORM.value:
        recipients = _get_platform_client_recipients(reg)
    elif reg_type == Registration.RegistrationType.STRATA_HOTEL.value:
        recipients = _get_strata_hotel_client_recipients(reg)
    else:
        recipients = []

    return ",".join(recipients) if recipients else ""


def _get_email_recipients(app_dict: dict) -> str:
    """Return the email recipients in a string separated by commas, normalized and deduplicated."""
    raw_recipients: list[str] = []

    if housing_recipient_email := current_app.config.get("EMAIL_HOUSING_RECIPIENT_EMAIL"):
        raw_recipients.append(housing_recipient_email)

    if client_recipients := _get_client_recipients(app_dict):
        raw_recipients.extend(client_recipients.split(","))

    return ",".join(_normalize_and_deduplicate_emails(raw_recipients))


def _get_tac_url(application: Application) -> str:
    """Return the relevant terms and conditions url for the application."""
    if application.registration_type == Registration.RegistrationType.HOST:
        return current_app.config["TAC_URL_HOST"]
    if application.registration_type == Registration.RegistrationType.PLATFORM:
        return current_app.config["TAC_URL_PLATFORM"]
    return ""


def _get_registration_tac_url(registration: Registration) -> str:
    """Return the relevant terms and conditions url for the registration."""
    if registration.registration_type == Registration.RegistrationType.HOST:
        return current_app.config["TAC_URL_HOST"]
    if registration.registration_type == Registration.RegistrationType.PLATFORM:
        return current_app.config["TAC_URL_PLATFORM"]
    return ""


def _get_registration_deep_link(registration: Registration) -> str:
    """Return the relevant app deep link for the registration."""
    return _get_registration_deep_link_for_type(
        registration.registration_type,
        registration.registration_number,
        registration.sbc_account_id,
        getattr(registration.user, "login_source", None),
    )


def _get_registration_deep_link_for_type(
    registration_type,
    registration_number: str | None,
    account_id: int | str | None = None,
    login_source: str | None = None,
) -> str:
    """Return a deep link from a registration type and number."""
    if not registration_number:
        return ""
    registration_type = getattr(registration_type, "value", registration_type)
    if registration_type == Registration.RegistrationType.HOST.value:
        route = f"/en-CA/dashboard/registration/{registration_number}"
        return _append_deep_link_params(
            f"{current_app.config['HOST_APP_URL'].rstrip('/')}{route}", account_id, login_source
        )
    if registration_type == Registration.RegistrationType.PLATFORM.value:
        route = f"/en-CA/platform/dashboard/registration/{registration_number}"
        return _append_deep_link_params(
            f"{current_app.config['PLATFORM_APP_URL'].rstrip('/')}{route}", account_id, login_source
        )
    if registration_type == Registration.RegistrationType.STRATA_HOTEL.value:
        route = f"/en-CA/strata-hotel/dashboard/registration/{registration_number}"
        return _append_deep_link_params(
            f"{current_app.config['STRATA_HOTEL_APP_URL'].rstrip('/')}{route}",
            account_id,
            login_source,
        )
    return ""


def _get_application_deep_link(
    registration_type,
    application_number: str | None,
    account_id: int | str | None = None,
    login_source: str | None = None,
) -> str:
    """Return a deep link to an application in the relevant app."""
    if not application_number:
        return ""
    registration_type = getattr(registration_type, "value", registration_type)
    routes = {
        Registration.RegistrationType.HOST.value: f"/en-CA/dashboard/application/{application_number}",
        Registration.RegistrationType.PLATFORM.value: f"/en-CA/platform/application/{application_number}",
        Registration.RegistrationType.STRATA_HOTEL.value: f"/en-CA/strata-hotel/application/{application_number}",
    }
    app_urls = {
        Registration.RegistrationType.HOST.value: "HOST_APP_URL",
        Registration.RegistrationType.PLATFORM.value: "PLATFORM_APP_URL",
        Registration.RegistrationType.STRATA_HOTEL.value: "STRATA_HOTEL_APP_URL",
    }
    if registration_type not in routes:
        return ""
    return _append_deep_link_params(
        f"{current_app.config[app_urls[registration_type]].rstrip('/')}{routes[registration_type]}",
        account_id,
        login_source,
    )


def _append_deep_link_params(
    url: str, account_id: int | str | None, login_source: str | None
) -> str:
    """Append safe account and supported login-provider hints to a deep link."""
    params = {}
    if account_id is not None and str(account_id).isdigit():
        params["accountId"] = str(account_id)
    login_hints = {"BCSC": "bcsc", "BCEID": "bceid", "IDIR": "idir", "STAFF": "idir"}
    if isinstance(login_source, str) and login_source.upper() in login_hints:
        params["idp"] = login_hints[login_source.upper()]
    if not params:
        return url
    return f"{url}?{urlencode(params)}"


def get_email_info(ce: SimpleCloudEvent) -> EmailInfo | None:
    """Return an EmailInfo if enclosed in the cloud event."""
    if (data := ce.data) and isinstance(data, dict):
        converted = dict_keys_to_snake_case(data)
        return EmailInfo(**converted)
    return None


def dict_keys_to_snake_case(d: dict) -> dict[str, str]:
    """Convert the keys of a dict to snake_case"""
    pattern = re.compile(r"(?<!^)(?=[A-Z])")
    converted = {}
    for k, v in d.items():
        converted[pattern.sub("_", k).lower()] = v
    return converted


def substitute_template_parts(template_code: str) -> str:
    """Substitute template parts in main template.

    Template parts are marked by [[partname.md]] in templates.

    This functionality is restricted by:
    - markup must be exactly [[partname.md]] and have no extra spaces around file name
    - template parts should only be one level deep
    parts. There is no recursive search and replace.
    """
    template_parts = [
        "strr-host-approval",
        "strr-host-approval-body",
        "strr-footer",
        "strr-important-deadlines",
        "strr-important-next-steps",
        "strr-tac",
        "strr-provisional-approval-info",
    ]

    # substitute template parts - marked up by [[filename.md]]
    for template_part in template_parts:
        template_part_code = Path(
            f"{current_app.config['EMAIL_TEMPLATE_PATH']}/common/{template_part}.md"
        ).read_text("utf-8")
        template_code = template_code.replace(f"[[{template_part}.md]]", template_part_code)

    return template_code
