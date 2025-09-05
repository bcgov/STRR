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
"""Tests to ensure that the snapshot service works as expected."""

import json
import os
from http import HTTPStatus
from unittest.mock import patch

from strr_api.enums.enum import PaymentStatus, RegistrationStatus
from strr_api.models import Application, Events
from strr_api.services import RegistrationService, SnapshotService
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, create_header

MOCK_INVOICE_RESPONSE = {"id": 123, "statusCode": "CREATED", "paymentAccount": {"accountId": 1234}}

CREATE_HOST_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration.json"
)


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_snapshot(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = 1234
        json_data = json.load(f)

        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None

        registration = RegistrationService.get_registration_by_id(response_json.get("header").get("registrationId"))
        snapshot_1 = SnapshotService.snapshot_registration(registration=registration)
        snapshot_1.version = 1
        snapshot_2 = SnapshotService.snapshot_registration(registration=registration)
        snapshot_2.version = 2
        all_snapshots = registration.snapshots
        assert len(all_snapshots) == 2
