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

# pylint: disable=R0914
# pylint: disable=R0912
# pylint: disable=R0915
# pylint: disable=R1702
# pylint: disable=C0103

"""For a successfully paid registration, this service determines its auto-approval state."""
from datetime import datetime
from typing import Any, List, Tuple

import requests
from flask import current_app

from strr_api.enums.enum import RegistrationType
from strr_api.models import Application, AutoApprovalRecord, Document, Events, PropertyContact, RentalProperty
from strr_api.requests import Registration, RegistrationRequest
from strr_api.responses.AutoApprovalResponse import AutoApproval
from strr_api.responses.LTSAResponse import LtsaResponse
from strr_api.services import EventsService, LtsaService
from strr_api.services.email_service import EmailService
from strr_api.services.geocoder_service import GeoCoderService
from strr_api.services.registration_service import RegistrationService
from strr_api.services.rest_service import RestService


class ApprovalService:
    """
    A class that provides utility functions for granting provisional or automatic approval
    """

    @classmethod
    def extract_longitude_and_latitude(cls, geocode_response):
        """Extract longitude and latitude from the geocode response."""
        features = geocode_response.get("features", [])
        if features:
            first_feature = features[0]
            geometry = first_feature.get("geometry", {})
            coordinates = geometry.get("coordinates", [])
            if len(coordinates) == 2:
                longitude, latitude = coordinates
                return longitude, latitude
            else:
                return None, None
        else:
            return None, None

    @classmethod
    def check_full_name_exists_in_ownership_groups(cls, ltsa_response: LtsaResponse, full_name: str) -> bool:
        """Check if the full name exists in the ownership groups."""
        full_name_parts = full_name.split()
        if len(full_name_parts) < 2:
            return False
        first_name = " ".join(full_name_parts[:-1]).upper()
        last_name = full_name_parts[-1].upper()
        for ownership_group in ltsa_response.ownershipGroups:
            for title_owner in ownership_group.titleOwners:
                if title_owner.lastNameOrCorpName1.upper() == last_name and first_name in title_owner.givenName.upper():
                    return True
        return False

    @classmethod
    def process_auto_approval(cls, application: Application) -> Tuple[Any, Any]:
        """Process approval logic and produce output JSON to store in the DB."""
        try:
            application_json = application.application_json
            registration_type = application_json.get("registration", {}).get("registrationType")

            auto_approval = AutoApproval()
            registration_id = None

            if registration_type == RegistrationType.HOST.value:
                registration_request = RegistrationRequest(**application_json)
                registration = registration_request.registration
                address_line_1 = ""
                if unit_number := registration.unitAddress.unitNumber:
                    address_line_1 = f"{unit_number}-"
                address_line_1 = (
                    f"{address_line_1}{registration.unitAddress.streetNumber} {registration.unitAddress.streetName}"
                )
                address = f"{address_line_1}, {registration.unitAddress.city}, {registration.unitAddress.province}"

                organization = cls.getSTRDataForAddress(address)
                if organization:
                    auto_approval.businessLicenseRequired = organization.get("isBusinessLicenceRequired")
                    auto_approval.strProhibited = organization.get("isStrProhibited")
                    auto_approval.organizationNm = organization.get("organizationNm")
                    auto_approval.prExempt = not organization.get("isPrincipalResidenceRequired")
                    if auto_approval.businessLicenseRequired:
                        auto_approval.businessLicenseProvided = (
                            registration.unitDetails.businessLicense is not None
                            and ApprovalService._has_registration_documents(
                                registration, [Document.DocumentType.LOCAL_GOVT_BUSINESS_LICENSE]
                            )
                        )

                    if auto_approval.strProhibited:
                        auto_approval.suggestedAction = Application.Status.FULL_REVIEW
                    else:
                        if not auto_approval.prExempt:
                            auto_approval.suggestedAction = Application.Status.FULL_REVIEW
                        else:
                            if not auto_approval.businessLicenseRequired:
                                auto_approval.suggestedAction = Application.Status.AUTO_APPROVED

                            else:
                                if auto_approval.businessLicenseProvided:
                                    auto_approval.suggestedAction = Application.Status.PROVISIONALLY_APPROVED
                                else:
                                    auto_approval.suggestedAction = Application.Status.FULL_REVIEW

                auto_approval.renting = registration.unitDetails.ownershipType == RentalProperty.OwnershipType.RENT

                cls._check_title_match(application, auto_approval, registration)

                cls.save_approval_record_by_application(application.id, auto_approval)

                if auto_approval.suggestedAction == Application.Status.AUTO_APPROVED:
                    registration_id = cls.approve_application(
                        application=application,
                        status=Application.Status.AUTO_APPROVED,
                        event=Events.EventName.AUTO_APPROVAL_APPROVED,
                    )
                elif auto_approval.suggestedAction == Application.Status.PROVISIONALLY_APPROVED:
                    registration_id = cls.approve_application(
                        application=application,
                        status=Application.Status.PROVISIONAL_REVIEW,
                        event=Events.EventName.AUTO_APPROVAL_PROVISIONAL,
                    )
                else:
                    cls._update_application_status_to_full_review(application)

            elif registration_type == RegistrationType.PLATFORM.value:
                registration_id = cls.approve_application(
                    application=application,
                    status=Application.Status.AUTO_APPROVED,
                    event=Events.EventName.AUTO_APPROVAL_APPROVED,
                )
            elif registration_type == RegistrationType.STRATA_HOTEL.value:
                cls._update_application_status_to_full_review(application)
            return application.status, registration_id

        except Exception as default_exception:  # noqa: B902; log error
            current_app.logger.error("Error in auto approval process:", default_exception)
            current_app.logger.error(auto_approval)
            try:
                cls._update_application_status_to_full_review(application)
            except Exception as e:
                current_app.logger.error("Error while updating application status to full review:", e)
            return application.status, None

    @classmethod
    def approve_application(cls, application, status, event):
        """Creates the registration and creates the corresponding events."""
        registration = RegistrationService.create_registration(
            application.submitter_id, application.payment_account, application.application_json
        )
        application.status = status
        application.registration_id = registration.id
        application.decision_date = datetime.utcnow()
        application.save()
        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=event,
            application_id=application.id,
            visible_to_applicant=False,
        )
        EventsService.save_event(
            event_type=Events.EventType.REGISTRATION,
            event_name=Events.EventName.REGISTRATION_CREATED,
            application_id=application.id,
            registration_id=registration.id,
            visible_to_applicant=False,
        )
        EmailService.send_application_status_update_email(application)

        return registration.id

    @classmethod
    def _has_registration_documents(cls, registration: Registration, document_types: List[str]) -> bool:
        if not registration.documents:
            return False
        for doc_type in document_types:
            filtered_docs = [doc for doc in registration.documents if doc.documentType == doc_type]
            if not filtered_docs:
                return False
        return True

    @classmethod
    def _check_title_match(cls, application, auto_approval, registration):
        try:
            pid = registration.unitDetails.parcelIdentifier
            if pid and registration.primaryContact.contactType == PropertyContact.ContactType.INDIVIDUAL:
                owner_name = registration.primaryContact.lastName
                if first_name := registration.primaryContact.firstName:
                    owner_name = f"{first_name} {owner_name}"
                    ltsa_data = LtsaService.get_title_details_from_pid(pid)
                    if ltsa_data:
                        ltsa_response = LtsaService.build_ltsa_response(application.id, ltsa_data)
                        if ltsa_response:
                            auto_approval.titleCheck = cls.check_full_name_exists_in_ownership_groups(
                                ltsa_response, owner_name
                            )
        except Exception as e:
            current_app.logger.error("Error in title check:", e)

    @classmethod
    def getSTRDataForAddress(cls, address):
        """Gets the STR data from data portal API."""
        geocode_response = GeoCoderService.get_geocode_by_address(address)
        longitude, latitude = cls.extract_longitude_and_latitude(geocode_response)
        if not (latitude and longitude):
            return None
        client_id = current_app.config.get("STR_DATA_API_CLIENT_ID")
        client_secret = current_app.config.get("STR_DATA_API_CLIENT_SECRET")
        token_url = current_app.config.get("STR_DATA_API_TOKEN_URL")
        timeout = 20

        data = "grant_type=client_credentials"

        # get service account token
        res = requests.post(
            url=token_url,
            data=data,
            headers={"content-type": "application/x-www-form-urlencoded"},
            auth=(client_id, client_secret),
            timeout=timeout,
        )
        try:
            token = res.json().get("access_token")
            current_app.logger.info(f"Token: {token}")
            endpoint = f"{current_app.config.get('STR_DATA_API_URL')}/api/organizations/strrequirements?longitude={longitude}&latitude={latitude}"  # noqa: E501
            str_info_for_address = RestService.get(endpoint=endpoint, token=token).json()
            return str_info_for_address
        except Exception as exception:
            current_app.logger.error("Error while calling Data Portal API", exc_info=exception)
            raise exception

    @classmethod
    def _update_application_status_to_full_review(cls, application):
        application.status = Application.Status.FULL_REVIEW
        application.save()
        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=Events.EventName.AUTO_APPROVAL_FULL_REVIEW,
            application_id=application.id,
            visible_to_applicant=False,
        )

    @classmethod
    def save_approval_record_by_application(cls, application_id, approval: AutoApproval):
        """Saves approval record with application_id."""
        record = AutoApprovalRecord(application_id=application_id, record=approval.model_dump(mode="json"))
        record.save()
        return record

    @classmethod
    def get_approval_records_for_application(cls, application_id):
        """Get approval records for a given application by id."""
        return AutoApprovalRecord.get_application_auto_approval_records(application_id=application_id)
