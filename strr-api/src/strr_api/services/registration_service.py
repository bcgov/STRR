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
from sqlalchemy import func
from weasyprint import HTML

from strr_api import requests
from strr_api.enums.enum import RegistrationSortBy, RegistrationStatus
from strr_api.models import (
    Address,
    Certificate,
    Contact,
    Eligibility,
    Events,
    PropertyManager,
    Registration,
    RentalPlatform,
    RentalProperty,
    User,
    db,
)
from strr_api.services.events_service import EventsService
from strr_api.utils.user_context import UserContext, user_context


class RegistrationService:
    """Service to save and load registration details from the database."""

    @classmethod
    def create_registration(cls, user_id, sbc_account_id, registration_request: requests.Registration):
        """Creates registration from an application."""
        primary_contact = Contact(
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
        db.session.add(primary_contact)
        db.session.flush()
        db.session.refresh(primary_contact)

        secondary_contact = None
        if registration_request.secondaryContact:
            secondary_contact = Contact(
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
            db.session.add(secondary_contact)
            db.session.flush()
            db.session.refresh(secondary_contact)

        property_manager = PropertyManager(primary_contact_id=primary_contact.id)

        if secondary_contact:
            property_manager.secondary_contact_id = secondary_contact.id

        db.session.add(property_manager)
        db.session.flush()
        db.session.refresh(property_manager)

        start_date = datetime.utcnow()
        registration_number = RegistrationService._get_registration_number()
        registration = Registration(
            user_id=user_id,
            sbc_account_id=sbc_account_id,
            status=RegistrationStatus.PENDING,
            registration_number=registration_number,
            start_date=start_date,
            expiry_date=start_date + Registration.DEFAULT_REGISTRATION_RENEWAL_PERIOD,
            rental_property=RentalProperty(
                property_manager_id=property_manager.id,
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
                property_type=registration_request.unitDetails.propertyType,
                ownership_type=registration_request.unitDetails.ownershipType,
                rental_platforms=[RentalPlatform(url=listing.url) for listing in registration_request.listingDetails],
            ),
            eligibility=Eligibility(
                is_principal_residence=registration_request.principalResidence.isPrincipalResidence,
                agreed_to_rental_act=registration_request.principalResidence.agreedToRentalAct,
                non_principal_option=registration_request.principalResidence.nonPrincipalOption,
                specified_service_provider=registration_request.principalResidence.specifiedServiceProvider,
                agreed_to_submit=registration_request.principalResidence.agreedToSubmit,
            ),
        )
        registration.save()
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
        user = User.get_or_create_user_by_jwt(jwt_oidc_token_info)
        if not user:
            return [], 0
        query = (
            Registration.query.join(RentalProperty, Registration.rental_property_id == RentalProperty.id)
            .join(Address, RentalProperty.address_id == Address.id)
            .join(PropertyManager, RentalProperty.property_manager_id == PropertyManager.id)
            .join(Contact, PropertyManager.primary_contact_id == Contact.id)
        )

        certificates_subquery = db.session.query(
            Certificate,
            func.row_number()
            .over(partition_by=Certificate.registration_id, order_by=Certificate.issued_date.desc())
            .label("rank"),
        ).subquery()

        query = query.join(
            certificates_subquery,
            (Registration.id == certificates_subquery.c.registration_id) & (certificates_subquery.c.rank == 1),
            isouter=True,
        )

        if search and len(search) >= 3:
            query = query.filter(
                func.concat(Contact.firstname, " ", Contact.lastname).ilike(f"%{search}%")
                | Address.city.ilike(f"%{search}%")
                | Address.street_address.ilike(f"%{search}%")
                | Address.postal_code.ilike(f"%{search}%")
            )

        if not user.is_examiner():
            query = query.filter(Registration.user_id == user.id)
            if account_id:
                query = query.filter(Registration.sbc_account_id == account_id)
        if filter_by_status is not None:
            query = query.filter(Registration.status == filter_by_status)

        count = query.count()
        sort_column = {
            RegistrationSortBy.ID: Registration.id,
            RegistrationSortBy.LOCATION: Address.city,
            RegistrationSortBy.ADDRESS: Address.street_address,
            RegistrationSortBy.NAME: func.concat(Contact.firstname, " ", Contact.lastname),
            RegistrationSortBy.STATUS: Registration.status,
            RegistrationSortBy.SUBMISSION_DATE: Registration.submission_date,
        }
        query = query.order_by(sort_column[sort_by].desc() if sort_desc else sort_column[sort_by].asc())
        return query.offset(offset).limit(limit).all(), count

    @classmethod
    def _get_registration_number(cls):
        registration_number_prefix = f'BCH{datetime.now(timezone.utc).strftime("%y")}'
        while True:
            random_digits = "".join(random.choices("0123456789", k=9))
            registration_number = f"{registration_number_prefix}{random_digits}"
            if Registration.query.filter(Registration.registration_number == registration_number).one_or_none() is None:
                return registration_number

    @classmethod
    def get_registration_counts_by_status(cls):
        """Return all registration counts by status type."""

        query = Registration.query.with_entities(
            Registration.status.label("status"),
            func.count().label("count"),
        ).group_by(Registration.status)

        return query.all()

    @classmethod
    def get_registration(cls, jwt_oidc_token_info, registration_id):
        """Get registration by id for current user. Examiners are exempted from user_id check."""
        user = User.get_or_create_user_by_jwt(jwt_oidc_token_info)
        query = Registration.query.filter_by(id=registration_id)
        if not user.is_examiner():
            query = query.filter_by(user_id=user.id)
        return query.one_or_none()

    @classmethod
    @user_context
    def generate_registration_certificate(cls, registration: Registration, **kwargs):
        """Generate registration PDF certificate."""
        usr_context: UserContext = kwargs["user_context"]
        user = User.get_or_create_user_by_jwt(usr_context.token_info)
        issued_date = datetime.now(timezone.utc)
        data = {
            "registration_number": f"{registration.registration_number}",
            "creation_date": f'{registration.start_date.strftime("%B %d, %Y")}',
            "expiry_date": f'{registration.expiry_date.strftime("%B %d, %Y")}',
            "issued_date": f'{issued_date.strftime("%B %d, %Y")}',
            "rental_address": registration.rental_property.address.to_oneline_address(),
            "rental_type": registration.rental_property.property_type.value,
            "registrant": registration.rental_property.property_manager.primary_contact.full_name(),
            "host": registration.rental_property.property_manager.primary_contact.full_name(),
        }
        rendered_template = render_template("certificate.html", **data)
        pdf_binary = HTML(string=rendered_template).render().write_pdf()

        certificate = Certificate(
            registration_id=registration.id,
            issued_date=issued_date,
            issuer_id=user.id,
            certificate=pdf_binary,
        )

        certificate.save()

        EventsService.save_event(
            event_type=Events.EventType.REGISTRATION,
            event_name=Events.EventName.CERTIFICATE_ISSUED,
            registration_id=registration.id,
        )
        return certificate

    @classmethod
    def get_latest_certificate(cls, registration: Registration):
        """Get latest PDF certificate for a given registration."""
        query = Certificate.query.filter(Certificate.registration_id == registration.id)
        return query.order_by(Certificate.issued_date.desc()).limit(1).one_or_none()
