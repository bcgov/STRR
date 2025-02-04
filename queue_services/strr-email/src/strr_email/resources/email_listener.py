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
#
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
from strr_api.models import Application
from strr_api.models import Registration
from strr_api.models.application import ApplicationSerializer
from strr_api.services import AuthService
from structured_logging import StructuredLogging

from strr_email.services import gcp_queue

bp = Blueprint("worker", __name__)

logger = StructuredLogging.get_logger()

EMAIL_SUBJECT = {
    "HOST_AUTO_APPROVED": "Short-Term Rental Registration Approved",
    "HOST_FULL_REVIEW_APPROVED": "Short-Term Rental Registration Approved",
    "HOST_PROVISIONAL_REVIEW": "Short-Term Rental Registration Provisionally Approved",
    "PLATFORM_AUTO_APPROVED": "Short-Term Rental Platform Registration Approved",
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

    # 3. Build email template
    if not (application := Application.find_by_application_number(email_info.application_number)):
        # no application matching the application number
        logger.error(f"Error: application {email_info.application_number} not found.")
        return (
            jsonify(
                {"message": f"Application number ({email_info.application_number}) not found."}
            ),
            HTTPStatus.NOT_FOUND,
        )

    app_dict = ApplicationSerializer.to_dict(application)

    template = Path(
        f"{current_app.config["EMAIL_TEMPLATE_PATH"]}/strr-{email_info.email_type}.md"
    ).read_text("utf-8")
    filled_template = substitute_template_parts(template)
    jinja_template = Template(filled_template, autoescape=True)
    html_out = jinja_template.render(
        application_num=application.application_number,
        reg_num=app_dict.get("header", {}).get("registrationNumber"),
        address_street=_get_address_street(app_dict, application.registration_type),
        address_street_extra=_get_address_extra(app_dict, application.registration_type),
        address_region=_get_address_region(app_dict, application.registration_type),
        expiry_date=_get_expiry_date(app_dict, application.registration_type),
        service_provider=_get_service_provider(app_dict, application.registration_type),
        tac_url=_get_tac_url(application),
        ops_email=current_app.config["EMAIL_HOUSING_OPS_EMAIL"],
        registrar_name=current_app.config["STRR_REGISTRAR_NAME"],
    )
    subject_number = (
        app_dict.get("header", {}).get("registrationNumber") or application.application_number
    )
    subject = (
        f"{current_app.config['EMAIL_SUBJECT_PREFIX']}"
        + f"{subject_number} - {EMAIL_SUBJECT.get(email_info.email_type, '')}"
    ).strip()
    email = {
        "recipients": _get_email_recipients(app_dict),
        # requestBy is how the notify-api determines which GC Notify account to use
        "requestBy": current_app.config["EMAIL_STRR_REQUEST_BY"],
        "content": {"subject": subject, "body": f"{html_out}"},
    }

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


def _get_address_street(app_dict: dict, reg_type: Registration.RegistrationType) -> str | None:
    """Return the unit, street number and street name of the application address as a string."""
    if reg_type != Registration.RegistrationType.HOST:
        return ""
    address = app_dict["registration"]["unitAddress"]
    # addressLineTwo == 'locality' for this address and changes the required fields
    street_name = address.get("streetName") or address.get("addressLineTwo")
    street_num = address.get("streetNumber")
    if (unit := address.get("unitNumber")) and street_num:
        return f"{unit}-{street_num} {street_name}"
    if unit:
        # Not sure if this is valid but the UI currently allows this scenario
        return f"{street_name}, #{unit}"
    return f"{street_num or ''} {street_name}".strip()


def _get_address_extra(app_dict, reg_type: Registration.RegistrationType) -> str | None:
    """Return the locality if both a street name and locality were given in the address (rare edge case)."""
    if reg_type == Registration.RegistrationType.HOST:
        address = app_dict["registration"]["unitAddress"]
        if (locality := address.get("addressLineTwo")) and address.get("streetName"):
            return locality
    return None


def _get_address_region(app_dict: dict, reg_type: Registration.RegistrationType) -> str:
    """Return city, region and postal code of the application address as a string."""
    if reg_type != Registration.RegistrationType.HOST:
        return ""
    address = app_dict["registration"]["unitAddress"]
    return (
        f"{address.get("city", '')}, {address.get("province", '')} {address.get("postalCode", '')}"
    )


def _get_expiry_date(app_dict: dict, reg_type: Registration.RegistrationType) -> str:
    """Return the expiry date as a formatted string."""
    if reg_type != Registration.RegistrationType.PLATFORM:
        return ""
    date_time = datetime.fromisoformat(app_dict["header"]["registrationEndDate"]).astimezone(
        ZoneInfo("America/Vancouver")
    )

    return date_time.strftime("%B %-d, %Y")


def _get_service_provider(app_dict: dict, reg_type: Registration.RegistrationType) -> str:
    """Return the service provider as a string."""
    if reg_type != Registration.RegistrationType.PLATFORM:
        return ""
    return app_dict["registration"]["businessDetails"]["legalName"]


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


def _get_tac_url(application: Application) -> str:
    """Return the relevant terms and conditions url for the application."""
    if application.registration_type == Registration.RegistrationType.HOST:
        return current_app.config["TAC_URL_HOST"]
    if application.registration_type == Registration.RegistrationType.PLATFORM:
        return current_app.config["TAC_URL_PLATFORM"]
    return ""


@dataclass
class EmailInfo:
    """Email Info class"""

    application_number: str = None
    email_type: str = None


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
    ]

    # substitute template parts - marked up by [[filename.md]]
    for template_part in template_parts:
        template_part_code = Path(
            f"{current_app.config["EMAIL_TEMPLATE_PATH"]}/common/{template_part}.md"
        ).read_text("utf-8")
        template_code = template_code.replace(f"[[{template_part}.md]]", template_part_code)

    return template_code
