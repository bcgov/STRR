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
# pylint: disable=R0913
# pylint: disable=E1102
"""Manages registration model interactions."""
import random
from datetime import datetime, timezone

from flask import render_template
from weasyprint import HTML

from strr_api.enums.enum import RegistrationSortBy, RegistrationStatus, RegistrationType
from strr_api.models import (
    Address,
    Certificate,
    Contact,
    Document,
    Events,
    Platform,
    PlatformBrand,
    PlatformBusinessDetails,
    PlatformRegistration,
    PlatformRepresentative,
    PropertyContact,
    PropertyListing,
    Registration,
    RentalProperty,
)
from strr_api.requests import RegistrationRequest
from strr_api.responses import RegistrationSerializer
from strr_api.services.events_service import EventsService
from strr_api.services.user_service import UserService


class RegistrationService:
    """Service to save and load registration details from the database."""

    @classmethod
    def create_registration(cls, user_id, sbc_account_id, registration_request: dict):
        """Creates registration from an application."""
        start_date = datetime.utcnow()
        registration_number = RegistrationService._get_registration_number()
        registration_details = registration_request.get("registration")
        registration_type = registration_details.get("registrationType")

        registration = Registration(
            user_id=user_id,
            sbc_account_id=sbc_account_id,
            status=RegistrationStatus.ACTIVE,
            registration_number=registration_number,
            start_date=start_date,
            expiry_date=start_date + Registration.DEFAULT_REGISTRATION_RENEWAL_PERIOD,
            registration_type=registration_type,
        )

        documents = []
        for doc in registration_details.get("documents", []):
            document = Document(file_name=doc.get("fileName"), file_type=doc.get("fileType"), path=doc.get("fileKey"))
            documents.append(document)
        if documents:
            registration.documents = documents

        if registration_type == RegistrationType.HOST.value:
            registration.rental_property = cls._create_host_registration(registration_request)
        elif registration_type == RegistrationType.PLATFORM.value:
            registration.platform_registration = cls._create_platform_registration(registration_details)

        registration.save()
        return registration

    @classmethod
    def _create_platform_registration(cls, registration_request: dict) -> PlatformRegistration:
        business_details_dict = registration_request.get("businessDetails")
        mailing_address = business_details_dict.get("mailingAddress")

        business_details = PlatformBusinessDetails(
            home_jurisdiction=business_details_dict.get("homeJurisdiction"),
            business_number=business_details_dict.get("businessNumber"),
            cpbc_licence_number=business_details_dict.get("consumerProtectionBCLicenceNumber"),
            primary_non_compliance_notice_email=business_details_dict.get("noticeOfNonComplianceEmail"),
            secondary_non_compliance_notice_email=business_details_dict.get("noticeOfNonComplianceOptionalEmail"),
            primary_take_down_request_email=business_details_dict.get("takeDownRequestEmail"),
            secondary_take_down_request_email=business_details_dict.get("takeDownRequestOptionalEmail"),
            attorney_name=business_details_dict.get("legalName"),
            mailingAddress=Address(
                country=mailing_address.get("country"),
                street_address=mailing_address.get("address"),
                street_address_additional=mailing_address.get("addressLineTwo"),
                city=mailing_address.get("city"),
                province=mailing_address.get("province"),
                postal_code=mailing_address.get("postalCode"),
            ),
        )

        # TODO:
        attorney_details = None

        representatives = [
            PlatformRepresentative(
                contact=Contact(
                    firstname=representative.get("firstName"),
                    lastname=representative.get("lastName"),
                    middlename=representative.get("middleName"),
                    email=representative.get("emailAddress"),
                    phone_extension=representative.get("extension"),
                    fax_number=representative.get("faxNumber"),
                    phone_number=representative.get("phoneNumber"),
                    job_title=representative.get("jobTitle"),
                )
            )
            for representative in registration_request.get("platformRepresentatives")
        ]

        platform_brands = [
            PlatformBrand(name=brand.get("name"), website=brand.get("website"))
            for brand in registration_request.get("platformDetails").get("brands")
        ]

        platform_registration = PlatformRegistration(
            platform=Platform(
                legal_name=business_details_dict.get("legalName"),
                business_details=business_details,
                brands=platform_brands,
                representatives=representatives,
            )
        )
        return platform_registration

    @classmethod
    def _create_host_registration(cls, registration_request: dict) -> RentalProperty:
        registration_request = RegistrationRequest(**registration_request).registration

        rental_property = RentalProperty(
            address=Address(
                country=registration_request.unitAddress.country,
                street_address=registration_request.unitAddress.address,
                street_address_additional=registration_request.unitAddress.addressLineTwo,
                city=registration_request.unitAddress.city,
                province=registration_request.unitAddress.province,
                postal_code=registration_request.unitAddress.postalCode,
            ),
            nickname=registration_request.unitAddress.nickname,
            parcel_identifier=registration_request.unitDetails.parcelIdentifier,
            local_business_licence=registration_request.unitDetails.businessLicense,
            local_business_licence_expiry_date=datetime.strptime(
                registration_request.unitDetails.businessLicenseExpiryDate, "%Y-%m-%d"
            ).date()
            if registration_request.unitDetails.businessLicenseExpiryDate
            else None,
            property_type=registration_request.unitDetails.propertyType,
            ownership_type=registration_request.unitDetails.ownershipType,
            is_principal_residence=registration_request.principalResidence.isPrincipalResidence,
            rental_act_accepted=registration_request.principalResidence.agreedToRentalAct,
            pr_exempt_reason=registration_request.principalResidence.nonPrincipalOption,
            service_provider=registration_request.principalResidence.specifiedServiceProvider,
            property_listings=[PropertyListing(url=listing.url) for listing in registration_request.listingDetails],
        )

        primary_property_contact = PropertyContact()
        primary_property_contact.is_primary = True
        primary_property_contact.contact = Contact(
            firstname=registration_request.primaryContact.name.firstName,
            lastname=registration_request.primaryContact.name.lastName,
            middlename=registration_request.primaryContact.name.middleName,
            email=registration_request.primaryContact.details.emailAddress,
            preferredname=registration_request.primaryContact.details.preferredName,
            phone_extension=registration_request.primaryContact.details.extension,
            fax_number=registration_request.primaryContact.details.faxNumber,
            phone_number=registration_request.primaryContact.details.phoneNumber,
            date_of_birth=registration_request.primaryContact.dateOfBirth,
            social_insurance_number=registration_request.primaryContact.socialInsuranceNumber,
            business_number=registration_request.primaryContact.businessNumber,
            address=Address(
                country=registration_request.primaryContact.mailingAddress.country,
                street_address=registration_request.primaryContact.mailingAddress.address,
                street_address_additional=registration_request.primaryContact.mailingAddress.addressLineTwo,
                city=registration_request.primaryContact.mailingAddress.city,
                province=registration_request.primaryContact.mailingAddress.province,
                postal_code=registration_request.primaryContact.mailingAddress.postalCode,
            ),
        )
        rental_property.contacts.append(primary_property_contact)
        if registration_request.secondaryContact:
            secondary_property_contact = PropertyContact()
            secondary_property_contact.is_primary = False
            secondary_property_contact.contact = Contact(
                firstname=registration_request.secondaryContact.name.firstName,
                lastname=registration_request.secondaryContact.name.lastName,
                middlename=registration_request.secondaryContact.name.middleName,
                email=registration_request.secondaryContact.details.emailAddress,
                preferredname=registration_request.secondaryContact.details.preferredName,
                phone_extension=registration_request.secondaryContact.details.extension,
                fax_number=registration_request.secondaryContact.details.faxNumber,
                phone_number=registration_request.secondaryContact.details.phoneNumber,
                date_of_birth=registration_request.secondaryContact.dateOfBirth,
                social_insurance_number=registration_request.secondaryContact.socialInsuranceNumber,
                business_number=registration_request.secondaryContact.businessNumber,
                address=Address(
                    country=registration_request.primaryContact.mailingAddress.country,
                    street_address=registration_request.primaryContact.mailingAddress.address,
                    street_address_additional=registration_request.primaryContact.mailingAddress.addressLineTwo,
                    city=registration_request.primaryContact.mailingAddress.city,
                    province=registration_request.primaryContact.mailingAddress.province,
                    postal_code=registration_request.primaryContact.mailingAddress.postalCode,
                ),
            )
            rental_property.contacts.append(secondary_property_contact)

        return rental_property

    @classmethod
    def list_registrations(
        cls,
        account_id: int = None,
        status: str = None,
        sort_by: str = RegistrationSortBy.ID,
        sort_desc: bool = False,
        offset: int = 1,
        limit: int = 50,
    ):
        """List registrations for current user in a paginated manner."""
        UserService.get_or_create_user_in_context()
        query = Registration.query

        if not UserService.is_strr_staff_or_system():
            query = query.filter(Registration.sbc_account_id == account_id)
        if status:
            query = query.filter(Registration.status == status.upper())

        sort_column_meta = {RegistrationSortBy.ID: Registration.id, RegistrationSortBy.STATUS: Registration.status}
        sort_column = sort_column_meta[sort_by.upper()] if sort_by else sort_column_meta[RegistrationSortBy.ID]
        query = query.order_by(sort_column.desc() if sort_desc else sort_column.asc())
        paginated_result = query.paginate(per_page=limit, page=offset)

        search_results = []
        for registration in paginated_result.items:
            search_results.append(RegistrationService.serialize(registration))

        return {
            "page": offset,
            "limit": limit,
            "registrations": search_results,
            "total": paginated_result.total,
        }

    @classmethod
    def _get_registration_number(cls):
        registration_number_prefix = f'BCH{datetime.now(timezone.utc).strftime("%y")}'
        while True:
            random_digits = "".join(random.choices("0123456789", k=9))
            registration_number = f"{registration_number_prefix}{random_digits}"
            if Registration.query.filter(Registration.registration_number == registration_number).one_or_none() is None:
                return registration_number

    @classmethod
    def get_registration(cls, account_id, registration_id):
        """Get registration by id for current user. Examiners are exempted from user_id check."""
        UserService.get_or_create_user_in_context()
        query = Registration.query.filter_by(id=registration_id)
        if not UserService.is_strr_staff_or_system():
            query = query.filter_by(sbc_account_id=account_id)
        return query.one_or_none()

    @classmethod
    def generate_registration_certificate(cls, registration: Registration):
        """Generate registration PDF certificate."""
        user = UserService.get_or_create_user_in_context()
        issued_date = datetime.now(timezone.utc)
        primary_property_contact = list(filter(lambda x: x.is_primary is True, registration.rental_property.contacts))[
            0
        ]
        data = {
            "registration_number": f"{registration.registration_number}",
            "creation_date": f'{registration.start_date.strftime("%B %d, %Y")}',
            "expiry_date": f'{registration.expiry_date.strftime("%B %d, %Y")}',
            "issued_date": f'{issued_date.strftime("%B %d, %Y")}',
            "rental_address": registration.rental_property.address.to_oneline_address(),
            "rental_type": registration.rental_property.property_type.value,
            "registrant": primary_property_contact.contact.full_name(),
            "host": primary_property_contact.contact.full_name(),
        }
        rendered_template = render_template("certificate.html", **data)
        pdf_binary = HTML(string=rendered_template).render().write_pdf()

        certificate = Certificate(
            registration_id=registration.id,
            issued_date=issued_date,
            issuer_id=user.id if user else None,
            certificate=pdf_binary,
        )

        certificate.save()

        EventsService.save_event(
            event_type=Events.EventType.REGISTRATION,
            event_name=Events.EventName.CERTIFICATE_ISSUED,
            registration_id=registration.id,
            visible_to_applicant=True,
        )
        return certificate

    @classmethod
    def get_latest_certificate(cls, registration: Registration):
        """Get latest PDF certificate for a given registration."""
        query = Certificate.query.filter(Certificate.registration_id == registration.id)
        return query.order_by(Certificate.issued_date.desc()).limit(1).one_or_none()

    @classmethod
    def serialize(cls, registration: Registration) -> dict:
        """Returns registration JSON."""
        return RegistrationSerializer.serialize(registration=registration)
