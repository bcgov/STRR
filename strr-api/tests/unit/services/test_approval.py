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
from unittest.mock import MagicMock, patch

import pytest

from strr_api.enums.enum import OwnershipType
from strr_api.models import Application
from strr_api.responses.LTSAResponse import LtsaResponse
from strr_api.services import ApprovalService
from tests.unit.utils.mocks import fake_application, mock_json_file, no_op

MOCK_GEOCODER_RESPONSE = mock_json_file("geocoder_address")
MOCK_LTSA_RESPONSE = mock_json_file("ltsa_title_order")


def test_extract_longitude_and_latitude():
    """Assure the lat and log are extracted as expected."""

    with open(MOCK_GEOCODER_RESPONSE) as f:
        data = json.load(f)

    (lat, long) = ApprovalService.extract_longitude_and_latitude(data)

    assert lat == -123.3709161
    assert long == 48.4177006


def test_check_full_name_exists_in_ownership_groups():
    """Assure the full name exists in the ownership groups."""

    with open(MOCK_LTSA_RESPONSE) as f:
        data = json.load(f)

    fielded_data = data.get("order", {}).get("orderedProduct", {}).get("fieldedData", {})
    result = ApprovalService.check_full_name_exists_in_ownership_groups(LtsaResponse(**fielded_data), "FIRST LAST")
    assert result


@pytest.fixture(autouse=True)
def app_context(app):
    with app.app_context():
        yield


@pytest.mark.parametrize(
    "ownership_type, is_principal_residence, specified_service_provider, expected_status",
    [
        (OwnershipType.RENT, True, None, Application.Status.FULL_REVIEW),
        (OwnershipType.OWN, True, "some_provider", Application.Status.FULL_REVIEW),
        (OwnershipType.OWN, True, None, Application.Status.PROVISIONAL_REVIEW),
        (OwnershipType.OWN, False, None, Application.Status.AUTO_APPROVED),
        (OwnershipType.OWN, True, None, Application.Status.AUTO_APPROVED),
    ],
)
@patch("strr_api.services.EventsService.save_event", new=no_op)
@patch("strr_api.models.Application.save", new=no_op)
@patch("strr_api.services.AuthService.get_sbc_accounts_mailing_address")
@patch("strr_api.services.GeoCoderService.get_geocode_by_address")
@patch("strr_api.models.DSSOrganization.lookup_by_geocode")
@patch("strr_api.services.LtsaService.get_title_details_from_pid")
@patch("strr_api.services.LtsaService.build_ltsa_response")
@patch("strr_api.services.RegistrationService.create_registration")
def test_process_auto_approval(
    mock_create_registration,
    mock_build_ltsa,
    mock_get_title,
    mock_lookup_geocode,
    mock_get_geocode,
    mock_get_address,
    ownership_type,
    is_principal_residence,
    specified_service_provider,
    expected_status,
    app_context,
):
    """Test the auto-approval process for various scenarios."""
    mock_get_address.return_value = MagicMock(
        street="123 Main St",
        city="Vancouver",
        region="BC",
        postalCode="V41B35",
        country="Canada",
    )
    mock_get_geocode.return_value = {"features": [{"geometry": {"coordinates": [-123.1207, 49.2827]}}]}
    mock_lookup_geocode.return_value = {"is_business_licence_required": False, "is_principal_residence_required": False}
    mock_get_title.return_value = {"some": "data"}

    mock_ltsa_response = MagicMock(spec=LtsaResponse)
    mock_ltsa_response.ownershipGroups = [
        MagicMock(titleOwners=[MagicMock(lastNameOrCorpName1="GUY", givenName="THE FIRST")])
    ]
    mock_build_ltsa.return_value = mock_ltsa_response

    sample_token = "token"
    application = fake_application(ownership_type, is_principal_residence, specified_service_provider)

    if ownership_type == OwnershipType.OWN and is_principal_residence and not specified_service_provider:
        mock_get_address.return_value = MagicMock(
            street="456 Different St",
            city="Victoria",
            region="BC",
            postalCode="V41B35",
            country="Canada",
        )
        expected_status = Application.Status.FULL_REVIEW

    registration_status, _ = ApprovalService.process_auto_approval(token=sample_token, application=application)

    assert application.status == expected_status

    if expected_status == Application.Status.PROVISIONAL_REVIEW:
        assert registration_status == "PROVISIONAL_REVIEW"

    if expected_status == Application.Status.AUTO_APPROVED and is_principal_residence:
        assert registration_status == "AUTO_APPROVED"
