"""
Registration response objects.
"""

from strr_api.enums.enum import RegistrationType
from strr_api.models import Platform, PropertyManager, Registration, StrataHotel


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

        documents = []
        if registration.documents:
            for doc in registration.documents:
                documents.append(
                    {
                        "fileKey": doc.path,
                        "fileName": doc.file_name,
                        "fileType": doc.file_type,
                        "documentType": doc.document_type,
                    }
                )
        registration_data["documents"] = documents

        if registration.registration_type == RegistrationType.HOST.value:
            RegistrationSerializer.populate_host_registration_details(registration_data, registration)

        elif registration.registration_type == RegistrationType.PLATFORM.value:
            RegistrationSerializer.populate_platform_registration_details(registration_data, registration)

        elif registration.registration_type == RegistrationType.STRATA_HOTEL.value:
            RegistrationSerializer.populate_strata_hotel_registration_details(registration_data, registration)

        return registration_data

    @classmethod
    def populate_strata_hotel_registration_details(cls, registration_data: dict, registration: Registration):
        """Populates strata hotel registration details into response object."""
        strata_hotel: StrataHotel = registration.strata_hotel_registration.strata_hotel
        registration_data["businessDetails"] = {
            "legalName": strata_hotel.legal_name,
            "homeJurisdiction": strata_hotel.home_jurisdiction,
            "businessNumber": strata_hotel.business_number,
            "mailingAddress": {
                "address": strata_hotel.mailingAddress.street_address,
                "addressLineTwo": strata_hotel.mailingAddress.street_address_additional,  # noqa: E501
                "city": strata_hotel.mailingAddress.city,
                "postalCode": strata_hotel.mailingAddress.postal_code,
                "province": strata_hotel.mailingAddress.province,
                "country": strata_hotel.mailingAddress.country,
                "locationDescription": strata_hotel.mailingAddress.location_description,
            },
        }
        if strata_hotel.registered_office_attorney_mailing_address_id:
            attorney_mailing_address = strata_hotel.registered_office_attorney_mailing_address
            registration_data["businessDetails"]["registeredOfficeOrAttorneyForServiceDetails"] = {
                "attorneyName": strata_hotel.attorney_name,
                "mailingAddress": {
                    "address": attorney_mailing_address.street_address,
                    "addressLineTwo": attorney_mailing_address.street_address_additional,  # noqa: E501
                    "city": attorney_mailing_address.city,
                    "postalCode": attorney_mailing_address.postal_code,
                    "province": attorney_mailing_address.province,
                    "country": attorney_mailing_address.country,
                    "locationDescription": attorney_mailing_address.location_description,
                },
            }

        registration_data["strataHotelRepresentatives"] = [
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
            for representative in strata_hotel.representatives
        ]

        buildings = [
            {
                "address": building.address.street_address,
                "addressLineTwo": building.address.street_address_additional,  # noqa: E501
                "city": building.address.city,
                "postalCode": building.address.postal_code,
                "province": building.address.province,
                "country": building.address.country,
                "locationDescription": building.address.location_description,
            }
            for building in strata_hotel.buildings
        ]
        registration_data["strataHotelDetails"] = {
            "brand": {"name": strata_hotel.brand_name, "website": strata_hotel.website},
            "location": {
                "address": strata_hotel.location.street_address,
                "addressLineTwo": strata_hotel.location.street_address_additional,  # noqa: E501
                "city": strata_hotel.location.city,
                "postalCode": strata_hotel.location.postal_code,
                "province": strata_hotel.location.province,
                "country": strata_hotel.location.country,
                "locationDescription": strata_hotel.location.location_description,
            },
            "numberOfUnits": strata_hotel.number_of_units,
            "buildings": buildings,
        }

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
                "locationDescription": platform.mailingAddress.location_description,
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
                    "locationDescription": attorney_mailing_address.location_description,
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

        primary_property_contact = list(filter(lambda x: x.is_primary is True, registration.rental_property.contacts))[
            0
        ]
        secondary_property_contacts = list(
            filter(lambda x: x.is_primary is False, registration.rental_property.contacts)
        )
        secondary_property_contact = secondary_property_contacts[0] if secondary_property_contacts else None

        registration_data["primaryContact"] = {
            "firstName": primary_property_contact.contact.firstname,
            "middleName": primary_property_contact.contact.middlename,
            "lastName": primary_property_contact.contact.lastname,
            "dateOfBirth": primary_property_contact.contact.date_of_birth.strftime("%Y-%m-%d")
            if primary_property_contact.contact.date_of_birth
            else None,
            "socialInsuranceNumber": primary_property_contact.contact.social_insurance_number,
            "businessNumber": primary_property_contact.contact.business_number,
            "contactType": primary_property_contact.contact_type,
            "businessLegalName": primary_property_contact.business_legal_name,
            "preferredName": primary_property_contact.contact.preferredname,
            "phoneNumber": primary_property_contact.contact.phone_number,
            "phoneCountryCode": primary_property_contact.contact.phone_country_code,
            "extension": primary_property_contact.contact.phone_extension,
            "faxNumber": primary_property_contact.contact.fax_number,
            "emailAddress": primary_property_contact.contact.email,
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
                "firstName": secondary_property_contact.contact.firstname,
                "middleName": secondary_property_contact.contact.middlename,
                "lastName": secondary_property_contact.contact.lastname,
                "dateOfBirth": secondary_property_contact.contact.date_of_birth.strftime("%Y-%m-%d")
                if secondary_property_contact.contact.date_of_birth
                else None,
                "socialInsuranceNumber": secondary_property_contact.contact.social_insurance_number,
                "contactType": secondary_property_contact.contact_type,
                "businessNumber": secondary_property_contact.contact.business_number,
                "preferredName": secondary_property_contact.contact.preferredname,
                "phoneNumber": secondary_property_contact.contact.phone_number,
                "phoneCountryCode": secondary_property_contact.contact.phone_country_code,
                "extension": secondary_property_contact.contact.phone_extension,
                "faxNumber": secondary_property_contact.contact.fax_number,
                "emailAddress": secondary_property_contact.contact.email,
                "mailingAddress": {
                    "address": secondary_property_contact.contact.address.street_address,
                    "addressLineTwo": secondary_property_contact.contact.address.street_address_additional,
                    # noqa: E501
                    "city": secondary_property_contact.contact.address.city,
                    "postalCode": secondary_property_contact.contact.address.postal_code,
                    "province": secondary_property_contact.contact.address.province,
                    "country": secondary_property_contact.contact.address.country,
                },
            }

        registration_data["unitAddress"] = {
            "unitNumber": registration.rental_property.address.unit_number,
            "streetNumber": registration.rental_property.address.street_number,
            "streetName": registration.rental_property.address.street_address,
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
            "blExemptReason": registration.rental_property.bl_exempt_reason,
            "propertyType": registration.rental_property.property_type.name,
            "ownershipType": registration.rental_property.ownership_type.name,
            "rentalUnitSpaceType": registration.rental_property.space_type,
            "hostResidence": registration.rental_property.host_residence,
            "isUnitOnPrincipalResidenceProperty": registration.rental_property.is_unit_on_principal_residence_property,
            "numberOfRoomsForRent": registration.rental_property.number_of_rooms_for_rent,
            "strataHotelRegistrationNumber": registration.rental_property.strata_hotel_registration_number,
            "prExemptReason": registration.rental_property.pr_exempt_reason,
        }

        registration_data["listingDetails"] = [
            {"url": platform.url} for platform in registration.rental_property.property_listings
        ]

        if property_manager := registration.rental_property.property_manager:
            if property_manager.property_manager_type == PropertyManager.PropertyManagerType.BUSINESS:
                registration_data["propertyManager"] = {
                    "business": {
                        "legalName": property_manager.business_legal_name,
                        "businessNumber": property_manager.business_number,
                        "mailingAddress": {
                            "address": property_manager.business_mailing_address.street_address,
                            "city": property_manager.business_mailing_address.city,
                            "postalCode": property_manager.business_mailing_address.postal_code,
                            "province": property_manager.business_mailing_address.province,
                            "country": property_manager.business_mailing_address.country,
                        },
                        "primaryContact": {
                            "firstName": property_manager.primary_contact.firstname,
                            "lastName": property_manager.primary_contact.lastname,
                            "middleName": property_manager.primary_contact.middlename,
                            "preferredName": property_manager.primary_contact.preferredname,
                            "phoneNumber": property_manager.primary_contact.phone_number,
                            "phoneCountryCode": property_manager.primary_contact.phone_country_code,
                            "extension": property_manager.primary_contact.phone_extension,
                            "faxNumber": property_manager.primary_contact.fax_number,
                            "emailAddress": property_manager.primary_contact.email,
                        },
                    }
                }
            else:
                registration_data["propertyManager"] = {
                    "contact": {
                        "firstName": property_manager.primary_contact.firstname,
                        "lastName": property_manager.primary_contact.lastname,
                        "middleName": property_manager.primary_contact.middlename,
                        "preferredName": property_manager.primary_contact.preferredname,
                        "phoneNumber": property_manager.primary_contact.phone_number,
                        "phoneCountrycode": property_manager.primary_contact.phone_country_code,
                        "extension": property_manager.primary_contact.phone_extension,
                        "faxNumber": property_manager.primary_contact.fax_number,
                        "emailAddress": property_manager.primary_contact.email,
                    }
                }
                if contact_mailing_address := property_manager.primary_contact.address:
                    registration_data["propertyManager"]["contact"]["mailingAddress"] = {
                        "address": contact_mailing_address.street_address,
                        "city": contact_mailing_address.city,
                        "postalCode": contact_mailing_address.postal_code,
                        "province": contact_mailing_address.province,
                        "country": contact_mailing_address.country,
                    }

            registration_data["propertyManager"]["propertyManagerType"] = property_manager.property_manager_type
