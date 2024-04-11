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
from http import HTTPStatus

import requests
from flask import Flask
from flask_jwt_oidc import JwtManager

from str_api.exceptions import ExternalServiceException


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
        self.svc_url = app.config.get('PAYMENT_SVC_URL')
        self.timeout = app.config.get('PAY_API_TIMEOUT', 20)

    def create_invoice(self, account_id: str, user_jwt: JwtManager, details: dict) -> requests.Response:
        """Create the invoice via the pay-api."""
        payload = deepcopy(self.default_invoice_payload)
        # update payload details
        if folio_number := details.get('folioNumber', None):
            payload['filingInfo']['folioNumber'] = folio_number

        if identifier := details.get('businessIdentifier', None):
            label_name = 'Registration Number' if identifier[:2] == 'FM' else 'Incorporation Number'
            payload['details'] = [{'label': f'{label_name}: ', 'value': identifier}]
            payload['businessInfo']['businessIdentifier'] = identifier

        try:
            # make api call
            token = user_jwt.get_token_auth_header()
            headers = {'Authorization': 'Bearer ' + token,
                       'Content-Type': 'application/json',
                       'Account-Id': account_id}
            resp = requests.post(url=self.svc_url + '/payment-requests',
                                 json=payload, headers=headers,
                                 timeout=self.timeout)

            if resp.status_code not in [HTTPStatus.OK, HTTPStatus.CREATED] or not (resp.json()).get('id', None):
                error = f'{resp.status_code} - {str(resp.json())}'
                self.app.logger.debug('Invalid response from pay-api: %s', error)
                raise ExternalServiceException(error=error, status_code=HTTPStatus.PAYMENT_REQUIRED)

            return resp

        except ExternalServiceException as exc:
            # pass along
            raise exc
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as err:
            self.app.logger.debug('Pay-api connection failure:', repr(err))
            raise ExternalServiceException(error=repr(err), status_code=HTTPStatus.PAYMENT_REQUIRED) from err
        except Exception as err:
            self.app.logger.debug('Pay-api integration (create invoice) failure:', repr(err))
            raise ExternalServiceException(error=repr(err), status_code=HTTPStatus.PAYMENT_REQUIRED) from err
