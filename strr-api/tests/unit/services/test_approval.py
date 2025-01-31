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
"""Tests to assure the approval service."""
import json
import os
from unittest.mock import patch

import pytest

from strr_api.enums.enum import PaymentStatus
from strr_api.models import Application, Events
from strr_api.services import ApprovalService
from strr_api.services.email_service import EmailService
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, create_header
from tests.unit.utils.mocks import fake_application, mock_json_file, no_op

ACCOUNT_ID = 1234

MOCK_GEOCODER_RESPONSE = mock_json_file("geocoder_address")
MOCK_LTSA_RESPONSE = mock_json_file("ltsa_title_order")

CREATE_HOST_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration.json"
)

CREATE_PLATFORM_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/platform_registration.json"
)

MOCK_INVOICE_RESPONSE = {"id": 123, "statusCode": "CREATED", "paymentAccount": {"accountId": ACCOUNT_ID}}


def test_extract_longitude_and_latitude():
    """Assure the lat and log are extracted as expected."""

    with open(MOCK_GEOCODER_RESPONSE) as f:
        data = json.load(f)

    (lat, long) = ApprovalService.extract_longitude_and_latitude(data)

    assert lat == -123.3709161
    assert long == 48.4177006


@pytest.fixture(autouse=True)
def app_context(app):
    with app.app_context():
        yield


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_process_auto_approval_platform_application(session, client, jwt):
    """Test the auto-approval process for various scenarios."""
    with patch.object(EmailService, "send_application_status_update_email") as mock_email:
        with open(CREATE_PLATFORM_REGISTRATION_REQUEST) as f:
            headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
            headers["Account-Id"] = ACCOUNT_ID
            json_data = json.load(f)
            rv = client.post("/applications", json=json_data, headers=headers)
            response_json = rv.json
            application_number = response_json.get("header").get("applicationNumber")

            application = Application.find_by_application_number(application_number=application_number)
            application.payment_status = PaymentStatus.COMPLETED.value
            application.status = Application.Status.PAID
            application.save()

            application_status, registration_id = ApprovalService.process_auto_approval(application=application)

            assert application_status == "AUTO_APPROVED"
            assert registration_id
            assert mock_email.called


def test_process_auto_approval_host_application(session, client, jwt):
    """Test the auto-approval process for various scenarios."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE):
            with patch(
                "strr_api.services.approval_service.ApprovalService.getSTRDataForAddress",
                return_value={
                    "isBusinessLicenceRequired": False,
                    "isStrProhibited": False,
                    "organizationNm": "TEST",
                    "isPrincipalResidenceRequired": True,
                },
            ):
                headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
                headers["Account-Id"] = ACCOUNT_ID
                json_data = json.load(f)
                rv = client.post("/applications", json=json_data, headers=headers)
                response_json = rv.json
                application_number = response_json.get("header").get("applicationNumber")

                application = Application.find_by_application_number(application_number=application_number)
                application.payment_status = PaymentStatus.COMPLETED.value
                application.status = Application.Status.PAID
                application.save()

                application_status, registration_id = ApprovalService.process_auto_approval(application=application)

                # assert application_status == Application.Status.FULL_REVIEW
                assert not registration_id
