# Copyright © 2024 Province of British Columbia
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
"""Manages filing type codes and payment service interactions."""
from copy import deepcopy
from datetime import datetime, timezone
from http import HTTPStatus

import requests
from flask import Flask
from flask_jwt_oidc import JwtManager

from strr_api.enums.enum import PaymentStatus
from strr_api.exceptions import ExternalServiceException
from strr_api.models import Events, Invoice, db
from strr_api.services.events_service import EventsService


class PayService:
    """
    A class that provides utility functions for connecting with the BC Registries pay-api.
    """

    app: Flask = None
    default_invoice_payload: dict = {}
    svc_url: str = None
    timeout: int = None

    def __init__(self, app: Flask = None, default_invoice_payload: dict = None):
        """Initialize the pay service."""
        if app:
            self.init_app(app)
        if default_invoice_payload:
            self.default_invoice_payload = default_invoice_payload

    def init_app(self, app: Flask):
        """Initialize app dependent variables."""
        self.app = app
        self.svc_url = app.config.get("PAYMENT_SVC_URL")
        self.timeout = app.config.get("PAY_API_TIMEOUT", 20)

    def create_invoice(self, user_jwt: JwtManager, account_id, registration=None, application=None):
        """Create the invoice via the pay-api."""
        payload = deepcopy(self.default_invoice_payload)

        try:
            # make api call
            token = user_jwt.get_token_auth_header()
            headers = {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
                "Account-Id": str(account_id),
            }
            resp = requests.post(
                url=self.svc_url + "/payment-requests", json=payload, headers=headers, timeout=self.timeout
            )

            if resp.status_code not in [HTTPStatus.OK, HTTPStatus.CREATED] or not (resp.json()).get("id", None):
                error = f"{resp.status_code} - {str(resp.json())}"
                self.app.logger.debug("Invalid response from pay-api: %s", error)
                raise ExternalServiceException(error=error, status_code=HTTPStatus.PAYMENT_REQUIRED)
            if application:
                EventsService.save_event(
                    event_type=Events.EventType.APPLICATION,
                    event_name=Events.EventName.INVOICE_GENERATED,
                    application_id=application.id,
                )
                return resp.json()
            else:
                invoice_id = resp.json()["id"]
                invoice = Invoice(
                    registration_id=registration.id,
                    invoice_id=invoice_id,
                    payment_status_code=PaymentStatus.CREATED,
                    payment_account=account_id,
                )

                db.session.add(invoice)
                db.session.commit()
                db.session.refresh(invoice)
                db.session.refresh(registration)

                return invoice
        except ExternalServiceException as exc:
            # pass along
            raise exc
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as err:
            self.app.logger.debug("Pay-api connection failure:", repr(err))
            raise ExternalServiceException(error=repr(err), status_code=HTTPStatus.GATEWAY_TIMEOUT) from err
        except Exception as err:
            self.app.logger.debug("Pay-api integration (create invoice) failure:", repr(err))
            raise ExternalServiceException(error=repr(err), status_code=HTTPStatus.PAYMENT_REQUIRED) from err

    def get_payment_details_by_invoice_id(self, user_jwt: JwtManager, account_id, invoice_id: int):
        """Get payment details by invoice id."""
        token = user_jwt.get_token_auth_header()
        headers = {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "Account-Id": str(account_id),
        }
        payment_details = requests.get(
            url=self.svc_url + f"/payment-requests/{invoice_id}", headers=headers, timeout=self.timeout
        ).json()
        return payment_details

    def get_invoice_by_id(self, registration_id, invoice_id):
        """Get invoice by invoice id."""
        return (
            Invoice.query.filter(Invoice.invoice_id == invoice_id)
            .filter(Invoice.registration_id == registration_id)
            .one_or_none()
        )

    def update_invoice_payment_status(self, user_jwt: JwtManager, registration, invoice) -> requests.Response:
        """Update the invoice by checking status via the pay-api."""
        payment_details = self.get_payment_details_by_invoice_id(
            user_jwt, registration.sbc_account_id, invoice.invoice_id
        )
        status = payment_details.get("statusCode")
        if status in (PaymentStatus.COMPLETED.name, PaymentStatus.PAID.name, PaymentStatus.APPROVED.name):
            invoice.payment_status_code = PaymentStatus.COMPLETED
            invoice.payment_completion_date = datetime.now(timezone.utc)
        else:
            if status in (code.value for code in PaymentStatus):
                invoice.payment_status_code = PaymentStatus[status]

        db.session.commit()
        db.session.refresh(invoice)
        return invoice
