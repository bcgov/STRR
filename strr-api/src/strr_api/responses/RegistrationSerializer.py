"""
Registration response objects.
"""

from strr_api.enums.enum import RegistrationType
from strr_api.models import Platform, Registration


class RegistrationSerializer:
    """Registration response serializer."""

    @classmethod
    def serialize(cls, registration: Registration):
        """Return a Registration object from a database model."""
        registration_data = {
            "id": registration.id,
            "user_id": registration.user_id,
            "sbc_account_id": registration.sbc_account_id,
            "registrationType": registration.registration_type,
            "updatedDate": registration.updated_date,
            "startDate": registration.start_date if registration.start_date else None,
            "expiryDate": registration.expiry_date if registration.expiry_date else None,
            "status": registration.status.name,
            "registration_number": registration.registration_number,
        }

        if registration.registration_type == RegistrationType.HOST.value:
            RegistrationSerializer.populate_host_registration_details(registration_data, registration)

        elif registration.registration_type == RegistrationType.PLATFORM.value:
            RegistrationSerializer.populate_platform_registration_details(registration_data, registration)

        return registration_data

    @classmethod
    def populate_platform_registration_details(cls, registration_data: dict, registration: Registration):
        """Populates host registration details into response object."""
        platform: Platform = registration.platform_registration.platform
        registration_data["businessDetails"] = {
            "legalName": platform.legal_name,
            "homeJurisdiction": platform.home_jurisdiction,
            "businessNumber": platform.business_number,
            "consumerProtectionBCLicenceNumber": platform.cpbc_licence_number,
            "noticeOfNonComplianceEmail": platform.primary_non_compliance_notice_email,
            "noticeOfNonComplianceOptionalEmail": platform.secondary_non_compliance_notice_email,
            "takeDownRequestEmail": platform.primary_take_down_request_email,
            "takeDownRequestOptionalEmail": platform.secondary_take_down_request_email,
            "mailingAddress": {
                "address": platform.mailingAddress.street_address,
                "addressLineTwo": platform.mailingAddress.street_address_additional,  # noqa: E501
                "city": platform.mailingAddress.city,
                "postalCode": platform.mailingAddress.postal_code,
                "province": platform.mailingAddress.province,
                "country": platform.mailingAddress.country,
            },
        }
        if platform.registered_office_attorney_mailing_address_id:
            attorney_mailing_address = platform.registered_office_attorney_mailing_address
            registration_data["businessDetails"]["registeredOfficeOrAttorneyForServiceDetails"] = {
                "attorneyName": platform.attorney_name,
                "mailingAddress": {
                    "address": attorney_mailing_address.street_address,
                    "addressLineTwo": attorney_mailing_address.street_address_additional,  # noqa: E501
                    "city": attorney_mailing_address.city,
                    "postalCode": attorney_mailing_address.postal_code,
                    "province": attorney_mailing_address.province,
                    "country": attorney_mailing_address.country,
                },
            }

        registration_data["platformRepresentatives"] = [
            {
                "firstName": representative.contact.firstname,
                "middleName": representative.contact.middlename,
                "lastName": representative.contact.lastname,
                "phoneNumber": representative.contact.phone_number,
                "extension": representative.contact.phone_extension,
                "faxNumber": representative.contact.fax_number,
                "emailAddress": representative.contact.email,
                "jobTitle": representative.contact.job_title,
                "phoneCountryCode": representative.contact.phone_country_code,
            }
            for representative in platform.representatives
        ]

        platform_brands = [{"name": brand.name, "website": brand.website} for brand in platform.brands]
        registration_data["platformDetails"] = {"brands": platform_brands, "listingSize": platform.listing_size}

    @classmethod
    def populate_host_registration_details(cls, registration_data: dict, registration: Registration):
        """Populates host registration details into response object."""
        documents = []
        if registration.documents:
            for doc in registration.documents:
                documents.append({"fileKey": doc.path, "fileName": doc.file_name, "fileType": doc.file_type})
        registration_data["documents"] = documents

        primary_property_contact = list(filter(lambda x: x.is_primary is True, registration.rental_property.contacts))[
            0
        ]
        secondary_property_contacts = list(
            filter(lambda x: x.is_primary is False, registration.rental_property.contacts)
        )
        secondary_property_contact = secondary_property_contacts[0] if secondary_property_contacts else None

        registration_data["primaryContact"] = {
            "name": {
                "firstName": primary_property_contact.contact.firstname,
                "middleName": primary_property_contact.contact.middlename,
                "lastName": primary_property_contact.contact.lastname,
            },
            "dateOfBirth": primary_property_contact.contact.date_of_birth,
            "socialInsuranceNumber": primary_property_contact.contact.social_insurance_number,
            "businessNumber": primary_property_contact.contact.business_number,
            "details": {
                "preferredName": primary_property_contact.contact.preferredname,
                "phoneNumber": primary_property_contact.contact.phone_number,
                "extension": primary_property_contact.contact.phone_extension,
                "faxNumber": primary_property_contact.contact.fax_number,
                "emailAddress": primary_property_contact.contact.email,
            },
            "mailingAddress": {
                "address": primary_property_contact.contact.address.street_address,
                "addressLineTwo": primary_property_contact.contact.address.street_address_additional,  # noqa: E501
                "city": primary_property_contact.contact.address.city,
                "postalCode": primary_property_contact.contact.address.postal_code,
                "province": primary_property_contact.contact.address.province,
                "country": primary_property_contact.contact.address.country,
            },
        }

        registration_data["secondaryContact"] = None
        if secondary_property_contact:
            registration_data["secondaryContact"] = {
                "name": {
                    "firstName": secondary_property_contact.contact.firstname,
                    "middleName": secondary_property_contact.contact.middlename,
                    "lastName": secondary_property_contact.contact.lastname,
                },
                "dateOfBirth": secondary_property_contact.contact.date_of_birth,
                "socialInsuranceNumber": secondary_property_contact.contact.social_insurance_number,
                "businessNumber": secondary_property_contact.contact.business_number,
                "details": {
                    "preferredName": secondary_property_contact.contact.preferredname,
                    "phoneNumber": secondary_property_contact.contact.phone_number,
                    "extension": secondary_property_contact.contact.phone_extension,
                    "faxNumber": secondary_property_contact.contact.fax_number,
                    "emailAddress": secondary_property_contact.contact.email,
                },
                "mailingAddress": {
                    "address": secondary_property_contact.contact.address.street_address,
                    "addressLineTwo": secondary_property_contact.contact.address.street_address_additional,  # noqa: E501
                    "city": secondary_property_contact.contact.address.city,
                    "postalCode": secondary_property_contact.contact.address.postal_code,
                    "province": secondary_property_contact.contact.address.province,
                    "country": secondary_property_contact.contact.address.country,
                },
            }

        registration_data["unitAddress"] = {
            "address": registration.rental_property.address.street_address,
            "addressLineTwo": registration.rental_property.address.street_address_additional,
            "city": registration.rental_property.address.city,
            "postalCode": registration.rental_property.address.postal_code,
            "province": registration.rental_property.address.province,
            "country": registration.rental_property.address.country,
            "nickname": registration.rental_property.nickname,
        }

        registration_data["unitDetails"] = {
            "parcelIdentifier": registration.rental_property.parcel_identifier,
            "businessLicense": registration.rental_property.local_business_licence,
            "businessLicenseExpiryDate": registration.rental_property.local_business_licence_expiry_date.strftime(
                "%Y-%m-%d"
            )
            if registration.rental_property.local_business_licence_expiry_date
            else None,
            "propertyType": registration.rental_property.property_type.name,
            "ownershipType": registration.rental_property.ownership_type.name,
        }

        registration_data["listingDetails"] = [
            {"url": platform.url} for platform in registration.rental_property.property_listings
        ]

        registration_data["principalResidence"] = {
            "isPrincipalResidence": registration.rental_property.is_principal_residence,
            "agreedToRentalAct": registration.rental_property.rental_act_accepted,
            "nonPrincipalOption": registration.rental_property.pr_exempt_reason,
            "specifiedServiceProvider": registration.rental_property.service_provider,
        }

        if property_manager := registration.rental_property.property_manager:
            registration_data["propertyManager"] = {
                "businessLegalName": property_manager.business_legal_name,
                "businessNumber": property_manager.business_number,
                "businessMailingAddress": {
                    "address": property_manager.business_mailing_address.street_address,
                    "city": property_manager.business_mailing_address.city,
                    "postalCode": property_manager.business_mailing_address.postal_code,
                    "province": property_manager.business_mailing_address.province,
                    "country": property_manager.business_mailing_address.country,
                },
                "contact": {
                    "firstName": property_manager.contact.firstname,
                    "lastName": property_manager.contact.lastname,
                    "middleName": property_manager.contact.middlename,
                    "preferredName": property_manager.contact.preferredname,
                    "phoneNumber": property_manager.contact.phone_number,
                    "extension": property_manager.contact.phone_extension,
                    "faxNumber": property_manager.contact.fax_number,
                    "emailAddress": property_manager.contact.email,
                },
            }
