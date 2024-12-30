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
# pylint: disable=R0917
"""Manages registration model interactions."""
import random
from datetime import datetime, time, timezone

from dateutil.relativedelta import relativedelta
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
    PlatformRegistration,
    PlatformRepresentative,
    PropertyContact,
    PropertyListing,
    PropertyManager,
    Registration,
    RentalProperty,
    StrataHotel,
    StrataHotelBuilding,
    StrataHotelRegistration,
    StrataHotelRepresentative,
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
        start_date = datetime.combine(datetime.now(), time(8, 0, 0))
        expiry_date = datetime.combine(start_date + relativedelta(years=1) - relativedelta(days=1), time(23, 59, 59))
        registration_details = registration_request.get("registration")
        registration_type = registration_details.get("registrationType")
        registration_number = RegistrationService._get_registration_number(registration_details)

        registration = Registration(
            user_id=user_id,
            sbc_account_id=sbc_account_id,
            status=RegistrationStatus.ACTIVE,
            registration_number=registration_number,
            start_date=start_date,
            expiry_date=expiry_date,
            registration_type=registration_type,
        )

        documents = []
        for doc in registration_details.get("documents", []):
            document = Document(
                file_name=doc.get("fileName"),
                file_type=doc.get("fileType"),
                path=doc.get("fileKey"),
                document_type=doc.get("documentType"),
            )
            documents.append(document)
        if documents:
            registration.documents = documents

        if registration_type == RegistrationType.HOST.value:
            registration.rental_property = cls._create_host_registration(registration_request)
        elif registration_type == RegistrationType.PLATFORM.value:
            registration.platform_registration = cls._create_platform_registration(registration_details)
        elif registration_type == RegistrationType.STRATA_HOTEL.value:
            registration.strata_hotel_registration = cls._create_strata_hotel_registration(registration_details)

        registration.save()
        return registration

    @classmethod
    def _create_strata_hotel_registration(cls, registration_request: dict) -> StrataHotelRegistration:
        business_details_dict = registration_request.get("businessDetails")
        mailing_address = business_details_dict.get("mailingAddress")

        representatives = [
            StrataHotelRepresentative(
                contact=Contact(
                    firstname=representative.get("firstName"),
                    lastname=representative.get("lastName"),
                    middlename=representative.get("middleName"),
                    email=representative.get("emailAddress"),
                    phone_extension=representative.get("extension"),
                    fax_number=representative.get("faxNumber"),
                    phone_number=representative.get("phoneNumber"),
                    phone_country_code=representative.get("phoneCountryCode"),
                    job_title=representative.get("jobTitle"),
                )
            )
            for representative in registration_request.get("strataHotelRepresentatives")
        ]

        strata_hotel_details_dict = registration_request.get("strataHotelDetails")
        strata_hotel_location_dict = strata_hotel_details_dict.get("location")

        strata_hotel_buildings = [
            StrataHotelBuilding(
                address=Address(
                    country=building.get("country"),
                    street_address=building.get("address"),
                    street_address_additional=building.get("addressLineTwo"),
                    city=building.get("city"),
                    province=building.get("province"),
                    postal_code=building.get("postalCode"),
                    location_description=building.get("locationDescription"),
                ),
            )
            for building in strata_hotel_details_dict.get("buildings")
        ]

        strata_hotel = StrataHotel(
            legal_name=business_details_dict.get("legalName"),
            home_jurisdiction=business_details_dict.get("homeJurisdiction"),
            business_number=business_details_dict.get("businessNumber"),
            attorney_name=business_details_dict.get("legalName"),
            mailingAddress=Address(
                country=mailing_address.get("country"),
                street_address=mailing_address.get("address"),
                street_address_additional=mailing_address.get("addressLineTwo"),
                city=mailing_address.get("city"),
                province=mailing_address.get("province"),
                postal_code=mailing_address.get("postalCode"),
                location_description=mailing_address.get("locationDescription"),
            ),
            brand_name=strata_hotel_details_dict.get("brand").get("name"),
            website=strata_hotel_details_dict.get("brand").get("website"),
            number_of_units=strata_hotel_details_dict.get("numberOfUnits"),
            location=Address(
                country=strata_hotel_location_dict.get("country"),
                street_address=strata_hotel_location_dict.get("address"),
                street_address_additional=strata_hotel_location_dict.get("addressLineTwo"),
                city=strata_hotel_location_dict.get("city"),
                province=strata_hotel_location_dict.get("province"),
                postal_code=strata_hotel_location_dict.get("postalCode"),
                location_description=strata_hotel_location_dict.get("locationDescription"),
            ),
            buildings=strata_hotel_buildings,
            representatives=representatives,
        )

        if attorney_details_dict := business_details_dict.get("registeredOfficeOrAttorneyForServiceDetails"):
            strata_hotel.attorney_name = attorney_details_dict.get("attorneyName")
            if attorney_mailing_address_dict := attorney_details_dict.get("mailingAddress"):
                strata_hotel.registered_office_attorney_mailing_address = Address(
                    country=attorney_mailing_address_dict.get("country"),
                    street_address=attorney_mailing_address_dict.get("address"),
                    street_address_additional=attorney_mailing_address_dict.get("addressLineTwo"),
                    city=attorney_mailing_address_dict.get("city"),
                    province=attorney_mailing_address_dict.get("province"),
                    postal_code=attorney_mailing_address_dict.get("postalCode"),
                    location_description=mailing_address.get("locationDescription"),
                )

        strata_hotel_registration = StrataHotelRegistration(strata_hotel=strata_hotel)
        return strata_hotel_registration

    @classmethod
    def _create_platform_registration(cls, registration_request: dict) -> PlatformRegistration:
        business_details_dict = registration_request.get("businessDetails")
        mailing_address = business_details_dict.get("mailingAddress")

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
                    phone_country_code=representative.get("phoneCountryCode"),
                    job_title=representative.get("jobTitle"),
                )
            )
            for representative in registration_request.get("platformRepresentatives")
        ]

        platform_brands = [
            PlatformBrand(name=brand.get("name"), website=brand.get("website"))
            for brand in registration_request.get("platformDetails").get("brands")
        ]

        platform = Platform(
            legal_name=business_details_dict.get("legalName"),
            home_jurisdiction=business_details_dict.get("homeJurisdiction"),
            business_number=business_details_dict.get("businessNumber"),
            cpbc_licence_number=business_details_dict.get("consumerProtectionBCLicenceNumber"),
            primary_non_compliance_notice_email=business_details_dict.get("noticeOfNonComplianceEmail"),
            secondary_non_compliance_notice_email=business_details_dict.get("noticeOfNonComplianceOptionalEmail"),
            primary_take_down_request_email=business_details_dict.get("takeDownRequestEmail"),
            secondary_take_down_request_email=business_details_dict.get("takeDownRequestOptionalEmail"),
            attorney_name=business_details_dict.get("legalName"),
            listing_size=registration_request.get("platformDetails").get("listingSize"),
            mailingAddress=Address(
                country=mailing_address.get("country"),
                street_address=mailing_address.get("address"),
                street_address_additional=mailing_address.get("addressLineTwo"),
                city=mailing_address.get("city"),
                province=mailing_address.get("province"),
                postal_code=mailing_address.get("postalCode"),
                location_description=mailing_address.get("locationDescription"),
            ),
            brands=platform_brands,
            representatives=representatives,
        )

        if attorney_details_dict := business_details_dict.get("registeredOfficeOrAttorneyForServiceDetails"):
            platform.attorney_name = attorney_details_dict.get("attorneyName")
            if attorney_mailing_address_dict := attorney_details_dict.get("mailingAddress"):
                platform.registered_office_attorney_mailing_address = Address(
                    country=attorney_mailing_address_dict.get("country"),
                    street_address=attorney_mailing_address_dict.get("address"),
                    street_address_additional=attorney_mailing_address_dict.get("addressLineTwo"),
                    city=attorney_mailing_address_dict.get("city"),
                    province=attorney_mailing_address_dict.get("province"),
                    postal_code=attorney_mailing_address_dict.get("postalCode"),
                    location_description=mailing_address.get("locationDescription"),
                )

        platform_registration = PlatformRegistration(platform=platform)
        return platform_registration

    @classmethod
    def _create_host_registration(cls, registration_request: dict) -> RentalProperty:
        registration_request = RegistrationRequest(**registration_request).registration

        rental_property = RentalProperty(
            address=Address(
                country=registration_request.unitAddress.country,
                street_address=registration_request.unitAddress.streetName,
                street_number=registration_request.unitAddress.streetNumber,
                unit_number=registration_request.unitAddress.unitNumber,
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
            space_type=registration_request.unitDetails.rentalUnitSpaceType,
            host_residence=registration_request.unitDetails.hostResidence,
            is_unit_on_principal_residence_property=registration_request.unitDetails.isUnitOnPrincipalResidenceProperty,
            number_of_rooms_for_rent=registration_request.unitDetails.numberOfRoomsForRent,
            property_type=registration_request.unitDetails.propertyType,
            ownership_type=registration_request.unitDetails.ownershipType,
            pr_exempt_reason=registration_request.unitDetails.prExemptReason,
            property_listings=[PropertyListing(url=listing.url) for listing in registration_request.listingDetails],
            strata_hotel_registration_number=registration_request.unitDetails.strataHotelRegistrationNumber,
        )

        if property_manager_info := registration_request.propertyManager:
            property_manager = cls._create_property_manager(property_manager_info)
            rental_property.property_manager = property_manager

        primary_property_contact = PropertyContact()
        primary_property_contact.is_primary = True
        primary_property_contact.contact_type = registration_request.primaryContact.contactType
        primary_property_contact.business_legal_name = registration_request.primaryContact.businessLegalName
        primary_property_contact.contact = Contact(
            firstname=registration_request.primaryContact.firstName,
            lastname=registration_request.primaryContact.lastName,
            middlename=registration_request.primaryContact.middleName,
            email=registration_request.primaryContact.emailAddress,
            preferredname=registration_request.primaryContact.preferredName,
            phone_extension=registration_request.primaryContact.extension,
            fax_number=registration_request.primaryContact.faxNumber,
            phone_country_code=registration_request.primaryContact.phoneCountryCode,
            phone_number=registration_request.primaryContact.phoneNumber,
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
            secondary_property_contact.contact_type = registration_request.secondaryContact.contactType
            secondary_property_contact.business_legal_name = registration_request.secondaryContact.businessLegalName
            secondary_property_contact.contact = Contact(
                firstname=registration_request.secondaryContact.firstName,
                lastname=registration_request.secondaryContact.lastName,
                middlename=registration_request.secondaryContact.middleName,
                email=registration_request.secondaryContact.emailAddress,
                preferredname=registration_request.secondaryContact.preferredName,
                phone_extension=registration_request.secondaryContact.extension,
                fax_number=registration_request.secondaryContact.faxNumber,
                phone_country_code=registration_request.secondaryContact.phoneCountryCode,
                phone_number=registration_request.secondaryContact.phoneNumber,
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
    def _create_property_manager(cls, property_manager_info):
        property_manager = PropertyManager(property_manager_type=property_manager_info.propertyManagerType)

        if property_manager_info.propertyManagerType == PropertyManager.PropertyManagerType.BUSINESS:
            property_manager.business_legal_name = (property_manager_info.business.legalName,)
            property_manager.business_number = (property_manager_info.business.businessNumber,)
            property_manager.business_mailing_address = Address(
                country=property_manager_info.business.mailingAddress.country,
                street_address=property_manager_info.business.mailingAddress.address,
                street_address_additional=property_manager_info.business.mailingAddress.addressLineTwo,
                city=property_manager_info.business.mailingAddress.city,
                province=property_manager_info.business.mailingAddress.province,
                postal_code=property_manager_info.business.mailingAddress.postalCode,
            )
            primary_contact = property_manager_info.business.primaryContact
            property_manager_primary_contact = Contact(
                firstname=primary_contact.firstName,
                lastname=primary_contact.lastName,
                middlename=primary_contact.middleName,
                preferredname=primary_contact.preferredName,
                email=primary_contact.emailAddress,
                phone_country_code=primary_contact.phoneCountryCode,
                phone_number=primary_contact.phoneNumber,
                phone_extension=primary_contact.extension,
                fax_number=primary_contact.faxNumber,
            )
            property_manager.primary_contact = property_manager_primary_contact

        elif property_manager_info.propertyManagerType == PropertyManager.PropertyManagerType.INDIVIDUAL:
            property_manager_primary_contact = Contact(
                firstname=property_manager_info.contact.firstName,
                lastname=property_manager_info.contact.lastName,
                middlename=property_manager_info.contact.middleName,
                preferredname=property_manager_info.contact.preferredName,
                email=property_manager_info.contact.emailAddress,
                phone_country_code=property_manager_info.contact.phoneCountryCode,
                phone_number=property_manager_info.contact.phoneNumber,
                phone_extension=property_manager_info.contact.extension,
                fax_number=property_manager_info.contact.faxNumber,
            )

            if property_manager_info.contact.mailingAddress:
                property_manager_primary_contact.address = Address(
                    country=property_manager_info.contact.mailingAddress.country,
                    street_address=property_manager_info.contact.mailingAddress.address,
                    street_address_additional=property_manager_info.contact.mailingAddress.addressLineTwo,
                    city=property_manager_info.contact.mailingAddress.city,
                    province=property_manager_info.contact.mailingAddress.province,
                    postal_code=property_manager_info.contact.mailingAddress.postalCode,
                )

            property_manager.primary_contact = property_manager_primary_contact
        return property_manager

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
    def _get_registration_number(cls, registration_details: dict):
        registration_type = registration_details.get("registrationType")

        registration_code = None
        if registration_type == RegistrationType.HOST.value:
            is_application_initiated_by_property_manager = registration_details.get("propertyManager", {}).get(
                "initiatedByPropertyManager", False
            )
            if is_application_initiated_by_property_manager:
                registration_code = "PM"
            else:
                registration_code = "H"
        elif registration_type == RegistrationType.PLATFORM.value:
            registration_code = "PL"
        elif registration_type == RegistrationType.STRATA_HOTEL.value:
            registration_code = "ST"
        while True:
            random_digits = "".join(random.choices("0123456789", k=9))
            registration_number = f"{registration_code}{random_digits}"
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
    def get_registration_by_id(cls, registration_id):
        """Get registration by id."""
        return Registration.query.filter_by(id=registration_id).one_or_none()

    @classmethod
    def is_registration_valid(cls, registration_number) -> bool:
        """Returns whether a registration number is valid."""
        is_valid = False
        registration = Registration.query.filter_by(registration_number=registration_number).one_or_none()
        if registration and registration.status == RegistrationStatus.ACTIVE:
            is_valid = True
        return is_valid

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

    @classmethod
    def update_registration_status(cls, registration: Registration, status: str) -> Registration:
        """Updates the registration status."""
        event_status_map = {
            "EXPIRED": Events.EventName.REGISTRATION_EXPIRED,
            "SUSPENDED": Events.EventName.NON_COMPLIANCE_SUSPENDED,
            "CANCELLED": Events.EventName.REGISTRATION_CANCELLED,
        }
        registration.status = status
        registration.save()
        EventsService.save_event(
            event_type=Events.EventType.REGISTRATION,
            event_name=event_status_map.get(status),
            registration_id=registration.id,
            visible_to_applicant=True,
        )
        return registration
