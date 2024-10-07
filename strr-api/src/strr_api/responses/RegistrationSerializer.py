"""
Registration response objects.
"""

from strr_api.enums.enum import RegistrationType
from strr_api.models import Registration


class RegistrationSerializer:
    """Registration response serializer."""

    @classmethod
    def serialize(cls, registration: Registration):
        """Return a Registration object from a database model."""
        documents = []
        if registration.documents:
            for doc in registration.documents:
                documents.append({"fileKey": doc.path, "fileName": doc.file_name, "fileType": doc.file_type})

        registration_data = {
            "id": registration.id,
            "user_id": registration.user_id,
            "sbc_account_id": registration.sbc_account_id,
            "updatedDate": registration.updated_date,
            "startDate": registration.start_date if registration.start_date else None,
            "expiryDate": registration.expiry_date if registration.expiry_date else None,
            "status": registration.status.name,
            "registration_number": registration.registration_number,
            "documents": documents,
        }

        if registration.registration_type == RegistrationType.HOST.value:
            RegistrationSerializer.populate_host_registration_details(registration_data, registration)

        return registration_data

    @classmethod
    def populate_host_registration_details(cls, registration_data: dict, registration: Registration):
        """Host Registration response object."""
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
            "businessLicenseExpiryDate": registration.rental_property.local_business_licence_expiry_date,
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
