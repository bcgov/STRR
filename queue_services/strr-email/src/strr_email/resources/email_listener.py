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
# pylint: disable=R0911
"""This Module processes and sends email messages via the notify-api.
"""
from dataclasses import dataclass
from datetime import datetime
from http import HTTPStatus
from pathlib import Path
import re
from zoneinfo import ZoneInfo

from flask import Blueprint
from flask import current_app
from flask import jsonify
from flask import request
from jinja2 import Template
import requests
from simple_cloudevent import SimpleCloudEvent
from strr_api.enums.enum import RegistrationNocStatus
from strr_api.models import Application
from strr_api.models import Registration
from strr_api.models.application import ApplicationSerializer
from strr_api.services import AuthService
from strr_api.services import RegistrationService
from structured_logging import StructuredLogging

from strr_email.services import gcp_queue

bp = Blueprint("worker", __name__)

logger = StructuredLogging.get_logger()

EMAIL_SUBJECT = {
    "HOST_AUTO_APPROVED": "Short-Term Rental Registration Approved",
    "HOST_FULL_REVIEW_APPROVED": "Short-Term Rental Registration Approved",
    "HOST_PROVISIONAL_REVIEW": "Short-Term Rental Registration Provisionally Approved",
    "PLATFORM_AUTO_APPROVED": "Short-Term Rental Platform Registration Approved",
    "NOC": "Short-Term Rental Notice of Consideration",
    "PROVISIONAL_REVIEW_NOC": "Short-Term Rental Notice of Consideration",
    "REGISTRATION_NOC": "Short-Term Rental Notice of Consideration",
    "HOST_PROVISIONALLY_APPROVED": "Short-Term Rental Registration Fully Approved",
    "HOST_PROVISIONALLY_DECLINED": "Short-Term Rental Registration Cancelled",
    "HOST_REGISTRATION_CANCELLED": "Short-Term Rental Registration Cancelled",
    "HOST_REGISTRATION_ACTIVE": "Short-Term Rental Registration Approved",
    "HOST_RENEWAL_REMINDER_FORTY_DAYS": "Short-Term Rental Registration Renewal Reminder",
}


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

    logger.info(f"received ce: {str(ce)}")

    # 2. Get email information
    if not (email_info := get_email_info(ce)):
        # no email info or not an email event
        return {}, HTTPStatus.OK

    template = Path(
        f'{current_app.config["EMAIL_TEMPLATE_PATH"]}/strr-{email_info.email_type}.md'
    ).read_text("utf-8")
    filled_template = substitute_template_parts(template)
    jinja_template = Template(filled_template, autoescape=True)
    email = None

    # 3. Build email template for application updates
    if email_info.application_number:
        if not (
            application := Application.find_by_application_number(email_info.application_number)
        ):
            # no application matching the application number
            logger.error(f"Error: application {email_info.application_number} not found.")
            return (
                jsonify(
                    {"message": f"Application number ({email_info.application_number}) not found."}
                ),
                HTTPStatus.NOT_FOUND,
            )

        email = _get_application_update_email_content(application, email_info, jinja_template)

    elif email_info.registration_number:
        if not (
            registration := RegistrationService.find_by_registration_number(
                email_info.registration_number
            )
        ):
            # no application matching the application number
            logger.error(f"Error: Registration {email_info.registration_number} not found.")
            return (
                jsonify(
                    {
                        "message": f"Registration number ({email_info.registration_number}) not found."
                    }
                ),
                HTTPStatus.NOT_FOUND,
            )
        if registration.registration_type not in [Registration.RegistrationType.HOST]:
            return {}, HTTPStatus.OK

        email = _get_registration_update_email_content(registration, email_info, jinja_template)

    # 4. Send email via notify-api
    token = AuthService.get_service_client_token()
    resp = requests.post(
        current_app.config["NOTIFY_SVC_URL"],
        json=email,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        timeout=current_app.config["NOTIFY_API_TIMEOUT"],
    )

    if resp.status_code not in [HTTPStatus.OK, HTTPStatus.ACCEPTED, HTTPStatus.CREATED]:
        logger.info(f"Error {resp.status_code} - {str(resp.json())}")
        logger.error(f"Error posting email to notify-api for: {str(ce)}")
        return jsonify({"message": "Error posting email to notify-api."}), resp.status_code

    logger.info(f"completed ce: {str(ce)}")
    return {}, HTTPStatus.OK


def _get_registration_update_email_content(registration: Registration, email_info, jinja_template):
    noc_content = ""
    noc_expiry_date = ""
    if registration.noc_status == RegistrationNocStatus.NOC_PENDING:
        noc = max(registration.nocs, key=lambda noc: noc.start_date)
        noc_content = noc.content
        noc_expiry_date = noc.end_date.strftime("%B %d, %Y")
    recipients = _get_registration_email_recipients(registration)
    html_out = jinja_template.render(
        reg_num=registration.registration_number,
        street_number=registration.rental_property.address.street_number,
        unit_number=registration.rental_property.address.unit_number,
        street_name=registration.rental_property.address.street_address
        or registration.rental_property.address.street_address_additional,
        city=registration.rental_property.address.city,
        postal_code=registration.rental_property.address.postal_code,
        ops_email=current_app.config["EMAIL_HOUSING_OPS_EMAIL"],
        rental_nickname=registration.rental_property.nickname,
        custom_content=email_info.custom_content,
        noc_content=noc_content,
        noc_expiry_date=noc_expiry_date,
        expiry_date=registration.expiry_date.strftime("%B %d, %Y"),
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


def _get_application_update_email_content(application, email_info, jinja_template):
    app_dict = ApplicationSerializer.to_dict(application)
    noc_content = ""
    noc_expiry_date = ""
    noc_sent_date = ""
    if noc := application.noc:
        noc_content = noc.content
        noc_expiry_date = noc.end_date.strftime("%B %d, %Y")
        noc_sent_date = noc.creation_date.strftime("%B %d, %Y")
    recipients = _get_email_recipients(app_dict)
    client_recipients = _get_client_recipients(app_dict)
    html_out = jinja_template.render(
        application_num=application.application_number,
        reg_num=app_dict.get("header", {}).get("registrationNumber"),
        street_number=_get_address_detail(app_dict, application.registration_type, "streetNumber"),
        unit_number=_get_address_detail(app_dict, application.registration_type, "unitNumber"),
        street_name=_get_address_detail(app_dict, application.registration_type, "streetName")
        or _get_address_detail(app_dict, application.registration_type, "addressLineTwo"),
        city=_get_address_detail(app_dict, application.registration_type, "city"),
        postal_code=_get_address_detail(app_dict, application.registration_type, "postalCode"),
        expiry_date=_get_expiry_date(app_dict),
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
    """Return the unit, street number and street name of the application address as a string."""
    if reg_type != Registration.RegistrationType.HOST:
        return ""
    address = app_dict["registration"]["unitAddress"]
    return address.get(detail, "")


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


def _get_registration_email_recipients(registration: Registration) -> str:
    "Return the email recipients in a string separated by commas."
    recipients: list[str] = []

    if housing_recipient_email := current_app.config["EMAIL_HOUSING_RECIPIENT_EMAIL"]:
        recipients.append(housing_recipient_email)

    if registration.registration_type == Registration.RegistrationType.HOST.value:
        # Host recipients - completing party is always the host or property manager
        # the primary contact email should always be there (this is the primary host)
        primary_property_contact = list(
            filter(lambda x: x.is_primary is True, registration.rental_property.contacts)
        )[0]
        recipients.append(primary_property_contact.contact.email)
        if property_manager := registration.rental_property.property_manager:
            # will have a person or business email
            recipients.append(property_manager.primary_contact.email)
    return ",".join(recipients)


def _get_email_recipients(app_dict: dict) -> str:
    "Return the email recipients in a string separated by commas."
    recipients: list[str] = []

    if housing_recipient_email := current_app.config["EMAIL_HOUSING_RECIPIENT_EMAIL"]:
        recipients.append(housing_recipient_email)

    reg = app_dict["registration"]
    if reg["registrationType"] == Registration.RegistrationType.HOST.value:
        # Host recipients - completing party is always the host or property manager
        # the primary contact email should always be there (this is the primary host)
        recipients.append(reg["primaryContact"]["emailAddress"])
        if property_manager := reg.get("propertyManager"):
            # will have a person or business email
            email = (
                property_manager.get("contact", {}).get("emailAddress")
                or property_manager["business"]["primaryContact"]["emailAddress"]
            )
            recipients.append(email)

    elif reg["registrationType"] == Registration.RegistrationType.PLATFORM.value:
        # Platform recipients
        for rep in reg["platformRepresentatives"]:
            recipients.append(rep["emailAddress"])
        if (comp_party_email := reg["completingParty"]["emailAddress"]) not in recipients:
            recipients.append(comp_party_email)

    return ",".join(recipients)


def _get_client_recipients(app_dict: dict) -> str:
    "Return the client recipients in a string separated by commas."
    recipients: list[str] = []

    reg = app_dict["registration"]
    if reg["registrationType"] == Registration.RegistrationType.HOST.value:
        # Host recipients - completing party is always the host or property manager
        # the primary contact email should always be there (this is the primary host)
        recipients.append(reg["primaryContact"]["emailAddress"])
        if property_manager := reg.get("propertyManager"):
            # will have a person or business email
            email = (
                property_manager.get("contact", {}).get("emailAddress")
                or property_manager["business"]["primaryContact"]["emailAddress"]
            )
            recipients.append(email)
    return ",".join(recipients) if recipients else ""


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


@dataclass
class EmailInfo:
    """Email Info class"""

    application_number: str = None
    email_type: str = None
    custom_content: str = None
    registration_number: str = None


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
