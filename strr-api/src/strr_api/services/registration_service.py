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
from sqlalchemy import func

from strr_api import models, requests
from strr_api.enums.enum import RegistrationSortBy, RegistrationStatus
from strr_api.models import db
from strr_api.services.gcp_storage_service import GCPStorageService


class RegistrationService:
    """Service to save and load regristration details from the database."""

    @classmethod
    def save_registration(cls, user_id, sbc_account_id, registration_request: requests.Registration):
        """Save STRR property registration to database."""
        primary_contact = models.Contact(
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
            address=models.Address(
                country=registration_request.primaryContact.mailingAddress.country,
                street_address=registration_request.primaryContact.mailingAddress.address,
                street_address_additional=registration_request.primaryContact.mailingAddress.addressLineTwo,
                city=registration_request.primaryContact.mailingAddress.city,
                province=registration_request.primaryContact.mailingAddress.province,
                postal_code=registration_request.primaryContact.mailingAddress.postalCode,
            ),
        )
        db.session.add(primary_contact)
        db.session.flush()
        db.session.refresh(primary_contact)

        secondary_contact = None
        if registration_request.secondaryContact:
            secondary_contact = models.Contact(
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
                address=models.Address(
                    country=registration_request.primaryContact.mailingAddress.country,
                    street_address=registration_request.primaryContact.mailingAddress.address,
                    street_address_additional=registration_request.primaryContact.mailingAddress.addressLineTwo,
                    city=registration_request.primaryContact.mailingAddress.city,
                    province=registration_request.primaryContact.mailingAddress.province,
                    postal_code=registration_request.primaryContact.mailingAddress.postalCode,
                ),
            )
            db.session.add(secondary_contact)
            db.session.flush()
            db.session.refresh(secondary_contact)

        property_manager = models.PropertyManager(primary_contact_id=primary_contact.id)

        if secondary_contact:
            property_manager.secondary_contact_id = secondary_contact.id

        db.session.add(property_manager)
        db.session.flush()
        db.session.refresh(property_manager)

        registration = models.Registration(
            user_id=user_id,
            sbc_account_id=sbc_account_id,
            status=RegistrationStatus.PENDING,
            rental_property=models.RentalProperty(
                property_manager_id=property_manager.id,
                address=models.Address(
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
                property_type=registration_request.unitDetails.propertyType,
                ownership_type=registration_request.unitDetails.ownershipType,
                rental_platforms=[
                    models.RentalPlatform(url=listing.url) for listing in registration_request.listingDetails
                ],
            ),
            eligibility=models.Eligibility(
                is_principal_residence=registration_request.principalResidence.isPrincipalResidence,
                agreed_to_rental_act=registration_request.principalResidence.agreedToRentalAct,
                non_principal_option=registration_request.principalResidence.nonPrincipalOption,
                specified_service_provider=registration_request.principalResidence.specifiedServiceProvider,
                agreed_to_submit=registration_request.principalResidence.agreedToSubmit,
            ),
        )
        db.session.add(registration)
        db.session.commit()
        db.session.refresh(registration)

        return registration

    @classmethod
    def list_registrations(
        cls,
        jwt_oidc_token_info,
        account_id: int = None,
        search: str = None,
        filter_by_status: RegistrationStatus = None,
        sort_by: RegistrationSortBy = RegistrationSortBy.ID,
        sort_desc: bool = False,
        offset: int = 0,
        limit: int = 100,
    ):
        """List all registrations for current user."""
        user = models.User.get_or_create_user_by_jwt(jwt_oidc_token_info)
        if not user:
            return [], 0
        query = (
            models.Registration.query.join(
                models.RentalProperty, models.Registration.rental_property_id == models.RentalProperty.id
            )
            .join(models.Address, models.RentalProperty.address_id == models.Address.id)
            .join(models.PropertyManager, models.RentalProperty.property_manager_id == models.PropertyManager.id)
            .join(models.Contact, models.PropertyManager.primary_contact_id == models.Contact.id)
        )

        certificates_subquery = db.session.query(
            models.Certificate,
            func.row_number()
            .over(partition_by=models.Certificate.registration_id, order_by=models.Certificate.creation_date.desc())
            .label("rank"),
        ).subquery()

        query = query.join(
            certificates_subquery,
            (models.Registration.id == certificates_subquery.c.registration_id) & (certificates_subquery.c.rank == 1),
            isouter=True,
        )

        if search and len(search) >= 3:
            query = query.filter(
                func.concat(models.Contact.firstname, " ", models.Contact.lastname).ilike(f"%{search}%")
                | models.Address.city.ilike(f"%{search}%")
                | models.Address.street_address.ilike(f"%{search}%")
                | models.Address.postal_code.ilike(f"%{search}%")
                | certificates_subquery.c.registration_number.ilike(f"%{search}%")
            )

        if not user.is_examiner():
            query = query.filter(models.Registration.user_id == user.id)
            if account_id:
                query = query.filter(models.Registration.sbc_account_id == account_id)
        if filter_by_status is not None:
            query = query.filter(models.Registration.status == filter_by_status)

        count = query.count()
        sort_column = {
            RegistrationSortBy.ID: models.Registration.id,
            RegistrationSortBy.REGISTRATION_NUMBER: certificates_subquery.c.registration_number,
            RegistrationSortBy.LOCATION: models.Address.city,
            RegistrationSortBy.ADDRESS: models.Address.street_address,
            RegistrationSortBy.NAME: func.concat(models.Contact.firstname, " ", models.Contact.lastname),
            RegistrationSortBy.STATUS: models.Registration.status,
            RegistrationSortBy.SUBMISSION_DATE: models.Registration.submission_date,
        }
        query = query.order_by(sort_column[sort_by].desc() if sort_desc else sort_column[sort_by].asc())
        return query.offset(offset).limit(limit).all(), count

    @classmethod
    def get_registration_counts_by_status(cls):
        """Return all registration counts by status type."""

        query = models.Registration.query.with_entities(
            models.Registration.status.label("status"),
            func.count().label("count"),
        ).group_by(models.Registration.status)

        return query.all()

    @classmethod
    def get_registration(cls, jwt_oidc_token_info, registration_id):
        """Get registration by id for current user. Examiners are exempted from user_id check."""
        user = models.User.get_or_create_user_by_jwt(jwt_oidc_token_info)
        query = models.Registration.query.filter_by(id=registration_id)
        if not user.is_examiner():
            query = query.filter_by(user_id=user.id)
        return query.one_or_none()

    @classmethod
    def save_registration_document(cls, eligibility_id, file_name, file_type, file_contents):
        """Save STRR uploaded document to database."""

        blob_name = GCPStorageService.upload_registration_document(file_type, file_contents)
        path = blob_name

        registration_document = models.Document(
            eligibility_id=eligibility_id,
            file_name=file_name,
            file_type=file_type,
            path=path,
        )
        db.session.add(registration_document)
        db.session.commit()
        db.session.refresh(registration_document)
        return registration_document

    @classmethod
    def get_registration_documents(cls, registration_id):
        """Get registration documents by registration id."""
        return (
            models.Document.query.join(models.Eligibility, models.Eligibility.id == models.Document.eligibility_id)
            .filter(models.Eligibility.registration_id == registration_id)
            .all()
        )

    @classmethod
    def get_registration_document(cls, registration_id, document_id):
        """Get registration document by id."""
        return (
            models.Document.query.join(models.Eligibility, models.Eligibility.id == models.Document.eligibility_id)
            .filter(models.Eligibility.registration_id == registration_id)
            .filter(models.Document.id == document_id)
            .one_or_none()
        )

    @classmethod
    def delete_registration_document(cls, registration_id, document_id):
        """Delete registration document by id."""
        document = RegistrationService.get_registration_document(registration_id, document_id)
        if not document:
            return False
        GCPStorageService.delete_registration_document(document.path)
        db.session.delete(document)
        db.session.commit()
        return True
