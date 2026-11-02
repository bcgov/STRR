"""
Registration response objects.
"""

import re
from datetime import date, datetime
from typing import Any, Optional

from strr_api.enums.enum import RegistrationStatus, RegistrationType
from strr_api.models import Address, Application, Contact, Platform, PropertyManager, Registration, StrataHotel


class RegistrationSerializer:
    """Registration response serializer."""

    HOST_STATUSES = {
        RegistrationStatus.ACTIVE: "Registered",
        RegistrationStatus.EXPIRED: "Expired",
        RegistrationStatus.SUSPENDED: "Suspended",
        RegistrationStatus.CANCELLED: "Cancelled",
    }

    HOST_ACTIONS = {
        RegistrationStatus.EXPIRED: ["REAPPLY"],
    }

    EXAMINER_STATUSES = {
        RegistrationStatus.ACTIVE: "Registered",
        RegistrationStatus.EXPIRED: "Expired",
        RegistrationStatus.SUSPENDED: "Suspended",
        RegistrationStatus.CANCELLED: "Cancelled",
    }

    EXAMINER_ACTIONS = {
        RegistrationStatus.ACTIVE: ["APPROVE", "SUSPEND", "CANCEL", "SET_ASIDE"],
        RegistrationStatus.SUSPENDED: ["REINSTATE", "CANCEL", "SET_ASIDE"],
        RegistrationStatus.CANCELLED: ["SET_ASIDE"],
        RegistrationStatus.EXPIRED: [],
    }

    @classmethod
    def serialize(cls, registration: Registration):
        """Return a Registration object from a database model."""
        registration_data = {
            "id": registration.id,
            "user_id": registration.user_id,
            "sbc_account_id": registration.sbc_account_id,
            "registrationType": registration.registration_type,
            "updatedDate": registration.updated_date.isoformat(),
            "cancelledDate": registration.cancelled_date.isoformat() if registration.cancelled_date else None,
            "startDate": registration.start_date.isoformat() if registration.start_date else None,
            "expiryDate": registration.expiry_date.isoformat() if registration.expiry_date else None,
            "status": registration.status.name,
            "registrationNumber": registration.registration_number,
            "nocStatus": registration.noc_status.name if registration.noc_status else None,
            "provisionalExtensionApplied": registration.provisional_extension_applied,
        }

        if registration.noc_status and registration.nocs:
            latest_noc = max(registration.nocs, key=lambda noc: noc.start_date)
            registration_data["nocStartDate"] = latest_noc.start_date.isoformat()
            registration_data["nocEndDate"] = latest_noc.end_date.isoformat()
            registration_data["nocSentDate"] = latest_noc.creation_date.isoformat()

        if registration.conditionsOfApproval:
            registration_data["conditionsOfApproval"] = {
                "predefinedConditions": registration.conditionsOfApproval.preapproved_conditions,
                "customConditions": registration.conditionsOfApproval.custom_conditions,
                "minBookingDays": registration.conditionsOfApproval.minBookingDays,
            }

        # Include snapshot details
        if registration.snapshots:
            registration_data["snapshots"] = [
                {
                    "id": snapshot.id,
                    "version": snapshot.version,
                    "snapshotDateTime": snapshot.snapshot_datetime.isoformat() if snapshot.snapshot_datetime else None,
                    "snapshotEndpoint": f"/registrations/{registration.id}/snapshots/{snapshot.id}",
                }
                for snapshot in sorted(registration.snapshots, key=lambda s: s.version, reverse=True)
            ]

        RegistrationSerializer._populate_header_data(registration_data, registration)

        documents = []
        if registration.documents:
            for doc in registration.documents:
                # Use added_on when set, otherwise document upload time from documents.created
                added_on_value = doc.added_on if doc.added_on is not None else getattr(doc, "created", None)
                documents.append(
                    {
                        "fileKey": doc.path,
                        "fileName": doc.file_name,
                        "fileType": doc.file_type,
                        "documentType": doc.document_type,
                        "addedOn": added_on_value.isoformat() if added_on_value else None,
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
    def _populate_header_data(cls, registration_data: dict, registration: Registration):
        """Populates header data into response object."""
        registration_data["header"] = {}
        registration_data["header"]["isSetAside"] = registration.is_set_aside
        registration_data["header"]["hostStatus"] = RegistrationSerializer.HOST_STATUSES.get(
            registration.status, registration.status.name
        )
        registration_data["header"]["hostActions"] = RegistrationSerializer.HOST_ACTIONS.get(registration.status, [])
        registration_data["header"]["examinerStatus"] = RegistrationSerializer.EXAMINER_STATUSES.get(
            registration.status, registration.status.name
        )
        registration_data["header"]["examinerActions"] = cls._get_examiner_actions(registration)
        registration_data["header"]["assignee"] = cls._get_user_info(registration.reviewer_id, registration.reviewer)
        registration_data["header"]["decider"] = cls._get_user_info(registration.decider_id, registration.decider)
        cls._populate_applications(registration_data, registration)

    @classmethod
    def _get_examiner_actions(cls, registration: Registration) -> list:
        """Get examiner actions based on registration state."""
        if registration.is_set_aside:
            return ["APPROVE", "CANCEL"]

        base_actions = RegistrationSerializer.EXAMINER_ACTIONS.get(registration.status, [])
        if registration.status == RegistrationStatus.ACTIVE and not registration.noc_status:
            base_actions = base_actions + ["SEND_NOC"]

        if registration.noc_status:
            return ["APPROVE", "CANCEL", "SUSPEND"]

        return base_actions

    @classmethod
    def _get_user_info(cls, user_id: int, user) -> dict:
        """Get user information for display."""
        user_info = {}
        if user_id and user:
            user_info["username"] = user.username
            display_name_parts = []
            if user.firstname:
                display_name_parts.append(user.firstname)
            if user.lastname:
                display_name_parts.append(user.lastname)
            user_info["displayName"] = " ".join(display_name_parts)
        return user_info

    @classmethod
    def _populate_applications(cls, registration_data: dict, registration: Registration):
        """Populate applications data."""
        applications = Application.get_all_by_registration_id(registration.id)
        if not applications:
            return

        sorted_applications = sorted(applications, key=lambda app: app.application_date, reverse=True)
        registration_data["header"]["applications"] = []

        for application in sorted_applications:
            organization_name = None
            if registration_json := application.application_json.get("registration"):
                if str_requirements := registration_json.get("strRequirements"):
                    organization_name = str_requirements.get("organizationNm")

            application_data = {
                "applicationNumber": application.application_number,
                "applicationDateTime": application.application_date.isoformat(),
                "applicationType": application.type,
                "applicationStatus": application.status,
                "organizationName": organization_name,
            }
            application_data["assignee"] = cls._get_user_info(application.reviewer_id, application.reviewer)
            application_data["decider"] = cls._get_user_info(application.decider_id, application.decider)
            registration_data["header"]["applications"].append(application_data)

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
            "category": strata_hotel.category,
            "buildings": buildings,
            "unitListings": strata_hotel.unit_listings,
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
    def _get_override_value(cls, registration_json: dict, path: str, default_value):
        """
        Get value from registration_json if it exists (as an override), otherwise use default_value.
        Path uses dot notation (e.g., "primaryContact.emailAddress").
        """
        if not registration_json:
            return default_value

        keys = path.split(".")
        value = registration_json
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default_value
        return value

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

        registration_json = registration.registration_json or {}

        registration_data["primaryContact"] = {
            "firstName": primary_property_contact.contact.firstname,
            "middleName": primary_property_contact.contact.middlename,
            "lastName": primary_property_contact.contact.lastname,
            "dateOfBirth": (
                primary_property_contact.contact.date_of_birth.strftime("%Y-%m-%d")
                if primary_property_contact.contact.date_of_birth
                else None
            ),
            "socialInsuranceNumber": primary_property_contact.contact.social_insurance_number,
            "businessNumber": primary_property_contact.contact.business_number,
            "contactType": primary_property_contact.contact_type,
            "businessLegalName": primary_property_contact.business_legal_name,
            "preferredName": primary_property_contact.contact.preferredname,
            "phoneNumber": primary_property_contact.contact.phone_number,
            "phoneCountryCode": primary_property_contact.contact.phone_country_code,
            "extension": primary_property_contact.contact.phone_extension,
            "faxNumber": primary_property_contact.contact.fax_number,
            "emailAddress": cls._get_override_value(
                registration_json, "primaryContact.emailAddress", primary_property_contact.contact.email
            ),
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
                "dateOfBirth": (
                    secondary_property_contact.contact.date_of_birth.strftime("%Y-%m-%d")
                    if secondary_property_contact.contact.date_of_birth
                    else None
                ),
                "socialInsuranceNumber": secondary_property_contact.contact.social_insurance_number,
                "contactType": secondary_property_contact.contact_type,
                "businessNumber": secondary_property_contact.contact.business_number,
                "preferredName": secondary_property_contact.contact.preferredname,
                "phoneNumber": secondary_property_contact.contact.phone_number,
                "phoneCountryCode": secondary_property_contact.contact.phone_country_code,
                "extension": secondary_property_contact.contact.phone_extension,
                "faxNumber": secondary_property_contact.contact.fax_number,
                "emailAddress": cls._get_override_value(
                    registration_json, "secondaryContact.emailAddress", secondary_property_contact.contact.email
                ),
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
            "locationDescription": registration.rental_property.address.location_description,
        }

        registration_data["unitDetails"] = {
            "parcelIdentifier": registration.rental_property.parcel_identifier,
            "businessLicense": registration.rental_property.local_business_licence,
            "businessLicenseExpiryDate": (
                registration.rental_property.local_business_licence_expiry_date.strftime("%Y-%m-%d")
                if registration.rental_property.local_business_licence_expiry_date
                else None
            ),
            "blExemptReason": registration.rental_property.bl_exempt_reason,
            "propertyType": registration.rental_property.property_type.name,
            "ownershipType": registration.rental_property.ownership_type,
            "rentalUnitSpaceType": registration.rental_property.space_type,
            "hostResidence": registration.rental_property.host_residence,
            "isUnitOnPrincipalResidenceProperty": registration.rental_property.is_unit_on_principal_residence_property,
            "numberOfRoomsForRent": registration.rental_property.number_of_rooms_for_rent,
            "strataHotelRegistrationNumber": registration.rental_property.strata_hotel_registration_number,
            "prExemptReason": registration.rental_property.pr_exempt_reason,
            "strataHotelCategory": registration.rental_property.strata_hotel_category,
            "jurisdiction": RegistrationSerializer.get_jurisdiction_from_application(registration),
            "prRequired": registration.rental_property.pr_required,
            "blRequired": registration.rental_property.bl_required,
            "rentalUnitSetupOption": registration.rental_property.rental_space_option,
            "hostType": registration.rental_property.host_type,
        }

        # Add strRequirements from application (source of truth)
        str_requirements = RegistrationSerializer.get_str_requirements_from_application(registration)
        if str_requirements:
            registration_data["strRequirements"] = str_requirements

        registration_data["listingDetails"] = [
            {"url": platform.url} for platform in registration.rental_property.property_listings
        ]

        if property_manager := registration.rental_property.property_manager:
            primary_contact = property_manager.primary_contact
            contact_dict = cls._build_primary_contact_dict(primary_contact)
            is_business_pm = property_manager.property_manager_type == PropertyManager.PropertyManagerType.BUSINESS
            email_override_path = (
                "propertyManager.business.primaryContact.emailAddress"
                if is_business_pm
                else "propertyManager.contact.emailAddress"
            )
            contact_dict["emailAddress"] = cls._get_override_value(
                registration_json,
                email_override_path,
                contact_dict.get("emailAddress"),
            )

            if is_business_pm:
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
                        "primaryContact": contact_dict,
                    }
                }
            else:
                registration_data["propertyManager"] = {"contact": contact_dict}
                if primary_contact and (contact_mailing_address := primary_contact.address):
                    registration_data["propertyManager"]["contact"]["mailingAddress"] = {
                        "address": contact_mailing_address.street_address,
                        "city": contact_mailing_address.city,
                        "postalCode": contact_mailing_address.postal_code,
                        "province": contact_mailing_address.province,
                        "country": contact_mailing_address.country,
                    }

            registration_data["propertyManager"]["propertyManagerType"] = property_manager.property_manager_type
            # Preserve initiatedByPropertyManager flag in registrations
            registration_data["propertyManager"]["initiatedByPropertyManager"] = cls._get_initiated_by_property_manager(
                registration
            )

    @classmethod
    def _get_initiated_by_property_manager(cls, registration: Registration) -> bool | None:
        """Get initiatedByPropertyManager from registration_json (populated at create/renewal and by backfiller)."""
        reg_json = registration.registration_json or {}
        pm = reg_json.get("propertyManager") or {}
        if isinstance(pm, dict) and "initiatedByPropertyManager" in pm:
            return bool(pm["initiatedByPropertyManager"])
        return None

    @classmethod
    def _build_primary_contact_dict(cls, primary_contact) -> dict:
        """Build a dictionary of primary contact information, handling None safely."""
        if not primary_contact:
            return {
                "firstName": None,
                "lastName": None,
                "middleName": None,
                "preferredName": None,
                "phoneNumber": None,
                "phoneCountryCode": None,
                "extension": None,
                "faxNumber": None,
                "emailAddress": None,
            }
        return {
            "firstName": primary_contact.firstname,
            "lastName": primary_contact.lastname,
            "middleName": primary_contact.middlename,
            "preferredName": primary_contact.preferredname,
            "phoneNumber": primary_contact.phone_number,
            "phoneCountryCode": primary_contact.phone_country_code,
            "extension": primary_contact.phone_extension,
            "faxNumber": primary_contact.fax_number,
            "emailAddress": primary_contact.email,
        }

    @classmethod
    def get_jurisdiction_from_application(cls, registration: Registration) -> Optional[str]:
        """Returns the jurisdiction of a registration."""
        if registration.rental_property.jurisdiction:
            return registration.rental_property.jurisdiction
        else:
            applications = Application.get_all_by_registration_id(registration.id)
            if applications:
                latest_application = sorted(applications, key=lambda app: app.application_date, reverse=True)[0]
                return (
                    latest_application.application_json.get("registration")
                    .get("strRequirements", {})
                    .get("organizationNm")
                )
        return None

    @classmethod
    def get_str_requirements_from_application(cls, registration: Registration) -> Optional[dict]:
        """Returns the strRequirements from the most recent application."""
        applications = Application.get_all_by_registration_id(registration.id)
        if not applications:
            return None

        latest_application = sorted(applications, key=lambda app: app.application_date, reverse=True)[0]
        if not latest_application.application_json:
            return None
        return latest_application.application_json.get("registration", {}).get("strRequirements", {})

    @classmethod
    def serialize_for_query(cls, registration: Registration, include_pii: bool = False) -> dict[str, Any]:
        """Serialize a registration into an OpenAPI-compliant query snapshot."""
        reg_type = cls._enum_val(registration.registration_type)
        snapshot: dict[str, Any] = {
            "registrationId": registration.id,
            "registrationNumber": registration.registration_number,
            "registrationType": reg_type,
            "status": cls._enum_val(registration.status),
            "startDate": cls._to_iso_z(registration.start_date),
            "expiryDate": cls._to_iso_z(registration.expiry_date),
            "updatedDate": cls._to_iso_z(registration.updated_date),
            "cancelledDate": cls._to_iso_z(registration.cancelled_date),
        }

        if reg_type == RegistrationType.HOST.value:
            cls._populate_query_host(snapshot, registration, include_pii)
        elif reg_type == RegistrationType.PLATFORM.value:
            cls._populate_query_platform(snapshot, registration)
        elif reg_type == RegistrationType.STRATA_HOTEL.value:
            cls._populate_query_strata_hotel(snapshot, registration)

        return snapshot

    @classmethod
    def _populate_query_host(cls, snapshot: dict[str, Any], reg: Registration, include_pii: bool):
        rental = reg.rental_property
        if not rental:
            return

        contacts = rental.contacts or []
        primary_c = next((c for c in contacts if c.is_primary is True), contacts[0] if contacts else None)
        secondary_c = next((c for c in contacts if c.is_primary is False), None)
        reg_json = reg.registration_json or {}

        snapshot["primaryContact"] = cls._serialize_query_host_contact(
            primary_c, reg_json=reg_json, include_pii=include_pii, is_primary=True
        )
        snapshot["secondaryContact"] = cls._serialize_query_host_contact(secondary_c, is_primary=False)

        addr = rental.address
        snapshot["unitAddress"] = {
            "unitNumber": addr.unit_number if addr else None,
            "streetNumber": addr.street_number if addr else None,
            "streetName": addr.street_address if addr else None,
            "addressLineTwo": addr.street_address_additional if addr else None,
            "city": addr.city if addr else None,
            "province": addr.province if addr else None,
            "postalCode": addr.postal_code if addr else None,
            "country": addr.country if addr else None,
            "nickname": rental.nickname,
            "locationDescription": addr.location_description if addr else None,
        }

        app_jurisdiction, str_req = cls._get_query_application_data(reg.id)
        bl_exp = rental.local_business_licence_expiry_date

        snapshot["unitDetails"] = {
            "parcelIdentifier": rental.parcel_identifier,
            "businessLicense": rental.local_business_licence,
            "businessLicenseExpiryDate": bl_exp.strftime("%Y-%m-%d") if bl_exp else None,
            "blExemptReason": rental.bl_exempt_reason,
            "propertyType": cls._enum_val(rental.property_type),
            "strataHotelRegistrationNumber": rental.strata_hotel_registration_number,
            "prExemptReason": cls._enum_val(rental.pr_exempt_reason),
            "strataHotelCategory": cls._enum_val(rental.strata_hotel_category),
            "jurisdiction": rental.jurisdiction or app_jurisdiction,
            "prRequired": rental.pr_required,
            "blRequired": rental.bl_required,
            "rentalUnitSetupOption": cls._enum_val(rental.rental_space_option),
            "hostType": cls._enum_val(rental.host_type),
        }
        snapshot["strRequirements"] = str_req
        snapshot["propertyManager"] = cls._serialize_query_property_manager(rental.property_manager, reg_json)

    @classmethod
    def _populate_query_platform(cls, snapshot: dict[str, Any], reg: Registration):
        platform: Optional[Platform] = reg.platform_registration.platform if reg.platform_registration else None
        if not platform:
            return

        business = cls._serialize_query_business_details(platform)
        business.update({
            "consumerProtectionBCLicenceNumber": platform.cpbc_licence_number,
            "noticeOfNonComplianceEmail": platform.primary_non_compliance_notice_email,
            "noticeOfNonComplianceOptionalEmail": platform.secondary_non_compliance_notice_email,
            "takeDownRequestEmail": platform.primary_take_down_request_email,
            "takeDownRequestOptionalEmail": platform.secondary_take_down_request_email,
        })
        snapshot["businessDetails"] = business
        snapshot["platformRepresentatives"] = [
            cls._serialize_person_contact(r.contact) for r in (platform.representatives or []) if r.contact
        ]
        snapshot["platformDetails"] = {
            "listingSize": cls._enum_val(platform.listing_size),
            "brands": [{"name": b.name, "website": b.website} for b in (platform.brands or [])],
        }

    @classmethod
    def _populate_query_strata_hotel(cls, snapshot: dict[str, Any], reg: Registration):
        sh: Optional[StrataHotel] = reg.strata_hotel_registration.strata_hotel if reg.strata_hotel_registration else None
        if not sh:
            return

        snapshot["businessDetails"] = cls._serialize_query_business_details(sh)
        snapshot["strataHotelRepresentatives"] = [
            cls._serialize_person_contact(r.contact) for r in (sh.representatives or []) if r.contact
        ]
        snapshot["strataHotelDetails"] = {
            "brand": {"name": sh.brand_name, "website": sh.website},
            "location": cls._serialize_mailing_address(sh.location),
            "numberOfUnits": sh.number_of_units,
            "category": cls._enum_val(sh.category),
            "buildings": [cls._serialize_mailing_address(b.address) for b in (sh.buildings or []) if b.address],
            "unitListings": cls._normalize_unit_listings(sh.unit_listings),
        }

    @classmethod
    def _serialize_query_business_details(cls, entity: Any) -> dict[str, Any]:
        """Serialize shared business details for platform and strata hotel."""
        attorney = None
        if getattr(entity, "registered_office_attorney_mailing_address_id", None):
            attorney = {
                "attorneyName": entity.attorney_name,
                "mailingAddress": cls._serialize_mailing_address(entity.registered_office_attorney_mailing_address),
            }
        return {
            "legalName": entity.legal_name,
            "homeJurisdiction": entity.home_jurisdiction,
            "businessNumber": entity.business_number,
            "mailingAddress": cls._serialize_mailing_address(entity.mailingAddress),
            "registeredOfficeOrAttorneyForServiceDetails": attorney,
        }

    @classmethod
    def _serialize_query_host_contact(
        cls, prop_contact, reg_json: Optional[dict] = None, include_pii: bool = False, is_primary: bool = True
    ) -> Optional[dict[str, Any]]:
        """Serialize primary or secondary host contact reusing person contact fields."""
        if not prop_contact:
            return None
        c = prop_contact.contact
        person = cls._serialize_person_contact(c) or {}
        person.pop("jobTitle", None)
        email = (
            cls._get_override_value(reg_json, "primaryContact.emailAddress", c.email if c else None)
            if is_primary
            else (c.email if c else None)
        )
        dob = c.date_of_birth.strftime("%Y-%m-%d") if (is_primary and include_pii and c and c.date_of_birth) else None
        sin = c.social_insurance_number if (is_primary and include_pii and c) else None

        return {
            "contactType": cls._enum_val(prop_contact.contact_type) or "INDIVIDUAL",
            **person,
            "dateOfBirth": dob,
            "socialInsuranceNumber": sin,
            "businessNumber": c.business_number if (is_primary and c) else None,
            "businessLegalName": prop_contact.business_legal_name if is_primary else None,
            "emailAddress": email,
            "mailingAddress": cls._serialize_mailing_address(c.address if c else None),
        }

    @classmethod
    def _serialize_query_property_manager(cls, pm: Optional[PropertyManager], reg_json: dict) -> Optional[dict[str, Any]]:
        """Serialize property manager using single flat representation."""
        if not pm:
            return None
        pm_type = cls._enum_val(pm.property_manager_type) or "INDIVIDUAL"
        is_biz = pm_type == "BUSINESS"
        initiated = (reg_json.get("propertyManager") or {}).get("initiatedByPropertyManager")
        c = pm.primary_contact
        contact = cls._serialize_person_contact(c) or {
            k: None for k in (
                "firstName", "middleName", "lastName", "preferredName", "jobTitle",
                "emailAddress", "phoneNumber", "phoneCountryCode", "extension", "faxNumber"
            )
        }
        return {
            "propertyManagerType": pm_type,
            "initiatedByPropertyManager": bool(initiated) if initiated is not None else None,
            "businessLegalName": pm.business_legal_name if is_biz else None,
            "businessNumber": pm.business_number if is_biz else None,
            "mailingAddress": cls._serialize_mailing_address(
                pm.business_mailing_address if is_biz else (c.address if c else None)
            ),
            "contact": contact,
        }

    @classmethod
    def _serialize_mailing_address(cls, addr: Optional[Address]) -> Optional[dict[str, Any]]:
        """Serialize Address model to MailingAddress dictionary."""
        if not addr:
            return None
        return {
            "address": addr.street_address,
            "addressLineTwo": addr.street_address_additional,
            "city": addr.city,
            "province": addr.province,
            "postalCode": addr.postal_code,
            "country": addr.country,
            "locationDescription": addr.location_description,
        }

    @classmethod
    def _serialize_person_contact(cls, c: Optional[Contact]) -> Optional[dict[str, Any]]:
        """Serialize Contact model to PersonContact dictionary."""
        if not c:
            return None
        return {
            "firstName": c.firstname,
            "middleName": c.middlename,
            "lastName": c.lastname,
            "preferredName": c.preferredname,
            "jobTitle": c.job_title,
            "emailAddress": c.email,
            "phoneNumber": c.phone_number,
            "phoneCountryCode": c.phone_country_code,
            "extension": c.phone_extension,
            "faxNumber": c.fax_number,
        }

    @classmethod
    def _normalize_unit_listings(cls, raw: Any) -> Optional[dict[str, Any]]:
        """Normalize and sanitize strata hotel unit listings."""
        if not isinstance(raw, dict):
            return None

        def clean(val: Any) -> list[str]:
            items = val if isinstance(val, (list, tuple)) else [val] if val else []
            return [t.strip() for item in items for t in re.split(r"[\r\n,]+", str(item)) if t.strip()]

        return {"primary": clean(raw.get("primary")), "additional": [clean(u) for u in (raw.get("additional") or [])]}

    @classmethod
    def _get_query_application_data(cls, reg_id: int) -> tuple[Optional[str], Optional[dict[str, Any]]]:
        """Fetch latest application and extract jurisdiction and strRequirements in a single pass."""
        apps = Application.get_all_by_registration_id(reg_id)
        if not apps:
            return None, None
        latest = max(apps, key=lambda a: a.application_date)
        req = (latest.application_json or {}).get("registration", {}).get("strRequirements")
        if not isinstance(req, dict):
            return None, None
        return req.get("organizationNm"), {
            "organizationNm": req.get("organizationNm"),
            "isPrincipalResidenceRequired": req.get("isPrincipalResidenceRequired"),
            "isBusinessLicenceRequired": req.get("isBusinessLicenceRequired"),
            "isStrProhibited": req.get("isStrProhibited"),
            "isStraaExempt": req.get("isStraaExempt"),
        }

    @staticmethod
    def _enum_val(val: Any) -> Optional[str]:
        return getattr(val, "value", getattr(val, "name", str(val))) if val is not None else None

    @staticmethod
    def _to_iso_z(dt: Optional[datetime | date]) -> Optional[str]:
        if not dt:
            return None
        if isinstance(dt, datetime):
            iso = dt.isoformat()
            return f"{iso}Z" if not iso.endswith("Z") and "+" not in iso and "-" not in iso[-6:] else iso
        return dt.strftime("%Y-%m-%d")
