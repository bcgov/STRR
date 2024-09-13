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
from typing import Any, Tuple

from flask import current_app

from strr_api.common.utils import compare_addresses
from strr_api.enums.enum import OwnershipType
from strr_api.models import Address, Application, AutoApprovalRecord, DSSOrganization, Events
from strr_api.requests import RegistrationRequest
from strr_api.responses.AutoApprovalResponse import AutoApproval
from strr_api.responses.LTSAResponse import LtsaResponse
from strr_api.services import AuthService, EventsService, LtsaService, RegistrationService
from strr_api.services.geocoder_service import GeoCoderService


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
    def process_auto_approval(cls, token, application: Application) -> Tuple[Any, Any]:
        """Process approval logic and produce output JSON to store in the DB."""
        application_json = application.application_json
        registration_request = RegistrationRequest(**application_json)
        registration = registration_request.registration
        pid = registration.unitDetails.parcelIdentifier
        owner_name = registration.primaryContact.name.firstName + " " + registration.primaryContact.name.lastName
        address = (
            registration.unitAddress.address
            + (" " + registration.unitAddress.addressLineTwo if registration.unitAddress.addressLineTwo else "")
            + ", "
            + registration.unitAddress.city
            + ", "
            + registration.unitAddress.province
        )

        renting = registration.unitDetails.ownershipType == OwnershipType.RENT
        other_service_provider = (
            registration.principalResidence.specifiedServiceProvider is not None
            and registration.principalResidence.specifiedServiceProvider != "n/a"
        )
        pr_exempt = not registration.principalResidence.isPrincipalResidence
        bl_provided = registration.unitDetails.businessLicense is not None
        bcsc_address = AuthService.get_sbc_accounts_mailing_address(token, int(application.payment_account))
        # Status setting just temporary for visibility
        auto_approval = AutoApproval()
        registration_ident = None

        try:
            if renting:
                auto_approval.renting = True
                application.status = Application.Status.FULL_REVIEW
                application.save()
                EventsService.save_event(
                    event_type=Events.EventType.APPLICATION,
                    event_name=Events.EventName.AUTO_APPROVAL_FULL_REVIEW,
                    application_id=application.id,
                    visible_to_applicant=False,
                )
                cls.save_approval_record_by_application(application.id, auto_approval)
                return application.status, registration_ident
            else:
                auto_approval.renting = False
                if other_service_provider:
                    auto_approval.serviceProvider = True
                    application.status = Application.Status.FULL_REVIEW
                    application.save()
                    EventsService.save_event(
                        event_type=Events.EventType.APPLICATION,
                        event_name=Events.EventName.AUTO_APPROVAL_FULL_REVIEW,
                        application_id=application.id,
                        visible_to_applicant=False,
                    )
                    cls.save_approval_record_by_application(application.id, auto_approval)
                    return application.status, registration_ident
                else:
                    auto_approval.serviceProvider = False

                if not pr_exempt:
                    auto_approval.prExempt = False
                    rental_address = Address(
                        street_address=registration.unitAddress.address,
                        street_address_additional=registration.unitAddress.addressLineTwo,
                        city=registration.unitAddress.city,
                        province=registration.unitAddress.province,
                        postal_code=registration.unitAddress.postalCode,
                        country=registration.unitAddress.country,
                    )
                    if not compare_addresses(rental_address, bcsc_address):
                        auto_approval.addressMatch = False
                        application.status = Application.Status.FULL_REVIEW
                        application.save()
                        EventsService.save_event(
                            event_type=Events.EventType.APPLICATION,
                            event_name=Events.EventName.AUTO_APPROVAL_FULL_REVIEW,
                            application_id=application.id,
                            visible_to_applicant=False,
                        )
                        cls.save_approval_record_by_application(application.id, auto_approval)
                        return application.status, registration_ident
                    else:
                        auto_approval.addressMatch = True
                        geocode_response = GeoCoderService.get_geocode_by_address(address)
                        longitude, latitude = cls.extract_longitude_and_latitude(geocode_response)
                        organization = DSSOrganization.lookup_by_geocode(longitude, latitude)
                        if organization["is_business_licence_required"]:
                            auto_approval.businessLicenseRequired = True
                            if bl_provided:
                                auto_approval.businessLicenseRequiredProvided = True
                            else:
                                auto_approval.businessLicenseRequiredNotProvided = True
                                application.status = Application.Status.FULL_REVIEW
                                application.save()
                                EventsService.save_event(
                                    event_type=Events.EventType.APPLICATION,
                                    event_name=Events.EventName.AUTO_APPROVAL_FULL_REVIEW,
                                    application_id=application.id,
                                    visible_to_applicant=False,
                                )
                                cls.save_approval_record_by_application(application.id, auto_approval)
                                return application.status, registration_ident
                        else:
                            auto_approval.businessLicenseNotRequiredNotProvided = True

                        if pid:
                            ltsa_data = LtsaService.get_title_details_from_pid(pid)
                            ltsa_response = LtsaService.build_ltsa_response(application.id, ltsa_data)
                            owner_title_match = cls.check_full_name_exists_in_ownership_groups(
                                ltsa_response, owner_name
                            )
                        else:
                            owner_title_match = False
                        if owner_title_match:
                            auto_approval.titleCheck = True
                            application.status = Application.Status.PROVISIONALLY_APPROVED
                            application.save()
                            EventsService.save_event(
                                event_type=Events.EventType.APPLICATION,
                                event_name=Events.EventName.AUTO_APPROVAL_PROVISIONAL,
                                application_id=application.id,
                                visible_to_applicant=False,
                            )
                            registration = RegistrationService.create_registration(
                                application.submitter_id, application.payment_account, registration_request.registration
                            )
                            registration_ident = registration.id
                            EventsService.save_event(
                                event_type=Events.EventType.REGISTRATION,
                                event_name=Events.EventName.REGISTRATION_CREATED,
                                application_id=application.id,
                                registration_id=registration.id,
                                visible_to_applicant=False,
                            )
                        else:
                            auto_approval.titleCheck = False
                            application.status = Application.Status.FULL_REVIEW
                            application.save()
                            EventsService.save_event(
                                event_type=Events.EventType.APPLICATION,
                                event_name=Events.EventName.AUTO_APPROVAL_FULL_REVIEW,
                                application_id=application.id,
                                visible_to_applicant=False,
                            )
                        cls.save_approval_record_by_application(application.id, auto_approval)
                        return application.status, registration_ident
                else:
                    geocode_response = GeoCoderService.get_geocode_by_address(address)
                    longitude, latitude = cls.extract_longitude_and_latitude(geocode_response)
                    organization = DSSOrganization.lookup_by_geocode(longitude, latitude)
                    if organization["is_principal_residence_required"]:
                        auto_approval.prExempt = False
                        application.status = Application.Status.FULL_REVIEW
                        application.save()
                        EventsService.save_event(
                            event_type=Events.EventType.APPLICATION,
                            event_name=Events.EventName.AUTO_APPROVAL_FULL_REVIEW,
                            application_id=application.id,
                            visible_to_applicant=False,
                        )
                    else:
                        auto_approval.prExempt = True
                        application.status = Application.Status.AUTO_APPROVED
                        registration = RegistrationService.create_registration(
                            application.submitter_id, application.payment_account, registration_request.registration
                        )
                        registration_ident = registration.id
                        application.registration_id = registration.id
                        application.decision_date = datetime.utcnow()
                        application.save()

                        EventsService.save_event(
                            event_type=Events.EventType.APPLICATION,
                            event_name=Events.EventName.AUTO_APPROVAL_APPROVED,
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
                    cls.save_approval_record_by_application(application.id, auto_approval)
                    return application.status, registration_ident
        except Exception as default_exception:  # noqa: B902; log error
            current_app.logger.error("Error in auto approval process:", default_exception)
            current_app.logger.error(auto_approval)
            return None, None

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
