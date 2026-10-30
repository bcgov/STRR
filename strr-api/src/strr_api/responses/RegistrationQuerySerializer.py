# Copyright © 2026 Province of British Columbia
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
# pylint: disable=too-many-locals
"""
Registration Query Serializer.

Serializes Registration models into OpenAPI-compliant snapshots for CDC export
and targeted lookup, applying strict data-minimization (PII masking) based on caller role.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Optional

from strr_api.enums.enum import RegistrationType
from strr_api.models import Address, Application, Contact, Platform, PropertyManager, Registration, StrataHotel


class RegistrationQuerySerializer:
    """Serializer for registration query and export snapshots."""

    @classmethod
    def serialize(cls, registration: Registration, include_pii: bool = False) -> dict[str, Any]:
        """
        Serialize a registration into an OpenAPI-compliant snapshot.

        :param registration: Registration model instance.
        :param include_pii: Whether to include sensitive personal identity attributes (SIN, DOB).
        :return: JSON-serializable snapshot dictionary.
        """
        reg_type = registration.registration_type
        if hasattr(reg_type, "value"):
            reg_type = reg_type.value
        elif hasattr(reg_type, "name"):
            reg_type = reg_type.name

        status = registration.status
        status_str = status.name if hasattr(status, "name") else str(status)

        snapshot: dict[str, Any] = {
            "registrationId": registration.id,
            "registrationNumber": registration.registration_number,
            "registrationType": reg_type,
            "status": status_str,
            "startDate": cls._to_iso_z(registration.start_date),
            "expiryDate": cls._to_iso_z(registration.expiry_date),
            "updatedDate": cls._to_iso_z(registration.updated_date),
            "cancelledDate": cls._to_iso_z(registration.cancelled_date),
        }

        if reg_type == RegistrationType.HOST.value:
            cls._populate_host_snapshot(snapshot, registration, include_pii)
        elif reg_type == RegistrationType.PLATFORM.value:
            cls._populate_platform_snapshot(snapshot, registration)
        elif reg_type == RegistrationType.STRATA_HOTEL.value:
            cls._populate_strata_hotel_snapshot(snapshot, registration)

        return snapshot

    @classmethod
    def _populate_host_snapshot(cls, snapshot: dict[str, Any], registration: Registration, include_pii: bool):
        """Populate HOST registration payload."""
        rental_property = registration.rental_property
        if not rental_property:
            return

        contacts = rental_property.contacts or []
        primary_prop_contact = next((c for c in contacts if c.is_primary is True), None)
        if not primary_prop_contact and contacts:
            primary_prop_contact = contacts[0]

        secondary_prop_contact = next((c for c in contacts if c.is_primary is False), None)

        reg_json = registration.registration_json or {}

        # Primary Contact
        snapshot["primaryContact"] = cls._serialize_host_primary_contact(primary_prop_contact, reg_json, include_pii)

        # Secondary Contact (Co-host)
        snapshot["secondaryContact"] = cls._serialize_host_secondary_contact(secondary_prop_contact)

        # Unit Address
        unit_addr = rental_property.address
        snapshot["unitAddress"] = {
            "unitNumber": unit_addr.unit_number if unit_addr else None,
            "streetNumber": unit_addr.street_number if unit_addr else None,
            "streetName": unit_addr.street_address if unit_addr else None,
            "addressLineTwo": unit_addr.street_address_additional if unit_addr else None,
            "city": unit_addr.city if unit_addr else None,
            "province": unit_addr.province if unit_addr else None,
            "postalCode": unit_addr.postal_code if unit_addr else None,
            "country": unit_addr.country if unit_addr else None,
            "nickname": rental_property.nickname,
            "locationDescription": unit_addr.location_description if unit_addr else None,
        }

        # Unit Details
        prop_type = rental_property.property_type
        prop_type_str = prop_type.name if hasattr(prop_type, "name") else str(prop_type) if prop_type else None

        pr_exempt_reason = rental_property.pr_exempt_reason
        if hasattr(pr_exempt_reason, "name"):
            pr_exempt_reason = pr_exempt_reason.name

        sh_cat = rental_property.strata_hotel_category
        sh_cat_str = sh_cat.name if hasattr(sh_cat, "name") else (str(sh_cat) if sh_cat else None)

        setup_opt = rental_property.rental_space_option
        setup_opt_str = setup_opt.name if hasattr(setup_opt, "name") else (str(setup_opt) if setup_opt else None)

        host_type = rental_property.host_type
        host_type_str = host_type.name if hasattr(host_type, "name") else (str(host_type) if host_type else None)

        snapshot["unitDetails"] = {
            "parcelIdentifier": rental_property.parcel_identifier,
            "businessLicense": rental_property.local_business_licence,
            "businessLicenseExpiryDate": rental_property.local_business_licence_expiry_date.strftime("%Y-%m-%d")
            if rental_property.local_business_licence_expiry_date
            else None,
            "blExemptReason": rental_property.bl_exempt_reason,
            "propertyType": prop_type_str,
            "strataHotelRegistrationNumber": rental_property.strata_hotel_registration_number,
            "prExemptReason": pr_exempt_reason,
            "strataHotelCategory": sh_cat_str,
            "jurisdiction": cls._get_jurisdiction(registration),
            "prRequired": rental_property.pr_required,
            "blRequired": rental_property.bl_required,
            "rentalUnitSetupOption": setup_opt_str,
            "hostType": host_type_str,
        }

        # strRequirements
        snapshot["strRequirements"] = cls._get_str_requirements(registration)

        # Property Manager (flat representation)
        snapshot["propertyManager"] = cls._serialize_property_manager(rental_property.property_manager, registration)

    @classmethod
    def _serialize_host_primary_contact(
        cls, prop_contact, reg_json: dict, include_pii: bool
    ) -> Optional[dict[str, Any]]:
        """Serialize primary contact with PII masking."""
        if not prop_contact:
            return None

        contact = prop_contact.contact
        c_type = prop_contact.contact_type
        c_type_str = c_type.name if hasattr(c_type, "name") else str(c_type) if c_type else "INDIVIDUAL"

        email = cls._get_override_value(reg_json, "primaryContact.emailAddress", contact.email if contact else None)

        dob = None
        sin = None
        if include_pii and contact:
            dob = contact.date_of_birth.strftime("%Y-%m-%d") if contact.date_of_birth else None
            sin = contact.social_insurance_number

        return {
            "contactType": c_type_str,
            "firstName": contact.firstname if contact else None,
            "middleName": contact.middlename if contact else None,
            "lastName": contact.lastname if contact else None,
            "preferredName": contact.preferredname if contact else None,
            "dateOfBirth": dob,
            "socialInsuranceNumber": sin,
            "businessNumber": contact.business_number if contact else None,
            "businessLegalName": prop_contact.business_legal_name,
            "emailAddress": email,
            "phoneNumber": contact.phone_number if contact else None,
            "phoneCountryCode": contact.phone_country_code if contact else None,
            "extension": contact.phone_extension if contact else None,
            "faxNumber": contact.fax_number if contact else None,
            "mailingAddress": cls._serialize_mailing_address(contact.address if contact else None),
        }

    @classmethod
    def _serialize_host_secondary_contact(cls, prop_contact) -> Optional[dict[str, Any]]:
        """Serialize secondary contact (Co-host). Always INDIVIDUAL with no DOB/SIN collected."""
        if not prop_contact:
            return None

        contact = prop_contact.contact
        c_type = prop_contact.contact_type
        c_type_str = c_type.name if hasattr(c_type, "name") else str(c_type) if c_type else "INDIVIDUAL"

        return {
            "contactType": c_type_str,
            "firstName": contact.firstname if contact else None,
            "middleName": contact.middlename if contact else None,
            "lastName": contact.lastname if contact else None,
            "preferredName": contact.preferredname if contact else None,
            "dateOfBirth": None,
            "socialInsuranceNumber": None,
            "businessNumber": None,
            "businessLegalName": None,
            "emailAddress": contact.email if contact else None,
            "phoneNumber": contact.phone_number if contact else None,
            "phoneCountryCode": contact.phone_country_code if contact else None,
            "extension": contact.phone_extension if contact else None,
            "faxNumber": contact.fax_number if contact else None,
            "mailingAddress": cls._serialize_mailing_address(contact.address if contact else None),
        }

    @classmethod
    def _serialize_property_manager(
        cls, property_manager: Optional[PropertyManager], registration: Registration
    ) -> Optional[dict[str, Any]]:
        """Serialize property manager using single flat representation."""
        if not property_manager:
            return None

        pm_type = property_manager.property_manager_type
        pm_type_str = pm_type.name if hasattr(pm_type, "name") else str(pm_type) if pm_type else "INDIVIDUAL"
        is_business = pm_type_str == "BUSINESS"

        initiated_by_pm = None
        reg_json = registration.registration_json or {}
        pm_json = reg_json.get("propertyManager") or {}
        if isinstance(pm_json, dict) and "initiatedByPropertyManager" in pm_json:
            initiated_by_pm = bool(pm_json["initiatedByPropertyManager"])

        primary_contact = property_manager.primary_contact

        contact_dict = cls._serialize_person_contact(primary_contact) or {
            "firstName": None,
            "middleName": None,
            "lastName": None,
            "preferredName": None,
            "jobTitle": None,
            "emailAddress": None,
            "phoneNumber": None,
            "phoneCountryCode": None,
            "extension": None,
            "faxNumber": None,
        }

        mailing_address = None
        if is_business:
            mailing_address = cls._serialize_mailing_address(property_manager.business_mailing_address)
        elif primary_contact and primary_contact.address:
            mailing_address = cls._serialize_mailing_address(primary_contact.address)

        return {
            "propertyManagerType": pm_type_str,
            "initiatedByPropertyManager": initiated_by_pm,
            "businessLegalName": property_manager.business_legal_name if is_business else None,
            "businessNumber": property_manager.business_number if is_business else None,
            "mailingAddress": mailing_address,
            "contact": contact_dict,
        }

    @classmethod
    def _populate_platform_snapshot(cls, snapshot: dict[str, Any], registration: Registration):
        """Populate PLATFORM registration payload."""
        platform: Optional[Platform] = (
            registration.platform_registration.platform if registration.platform_registration else None
        )
        if not platform:
            return

        attorney_details = None
        if platform.registered_office_attorney_mailing_address_id:
            attorney_details = {
                "attorneyName": platform.attorney_name,
                "mailingAddress": cls._serialize_mailing_address(platform.registered_office_attorney_mailing_address),
            }

        snapshot["businessDetails"] = {
            "legalName": platform.legal_name,
            "homeJurisdiction": platform.home_jurisdiction,
            "businessNumber": platform.business_number,
            "consumerProtectionBCLicenceNumber": platform.cpbc_licence_number,
            "noticeOfNonComplianceEmail": platform.primary_non_compliance_notice_email,
            "noticeOfNonComplianceOptionalEmail": platform.secondary_non_compliance_notice_email,
            "takeDownRequestEmail": platform.primary_take_down_request_email,
            "takeDownRequestOptionalEmail": platform.secondary_take_down_request_email,
            "mailingAddress": cls._serialize_mailing_address(platform.mailingAddress),
            "registeredOfficeOrAttorneyForServiceDetails": attorney_details,
        }

        representatives = platform.representatives or []
        snapshot["platformRepresentatives"] = [
            cls._serialize_person_contact(rep.contact) for rep in representatives if rep.contact
        ]

        listing_size = platform.listing_size
        listing_size_str = (
            listing_size.name if hasattr(listing_size, "name") else str(listing_size) if listing_size else None
        )

        snapshot["platformDetails"] = {
            "listingSize": listing_size_str,
            "brands": [{"name": b.name, "website": b.website} for b in (platform.brands or [])],
        }

    @classmethod
    def _populate_strata_hotel_snapshot(cls, snapshot: dict[str, Any], registration: Registration):
        """Populate STRATA_HOTEL registration payload."""
        strata_hotel: Optional[StrataHotel] = (
            registration.strata_hotel_registration.strata_hotel if registration.strata_hotel_registration else None
        )
        if not strata_hotel:
            return

        attorney_details = None
        if strata_hotel.registered_office_attorney_mailing_address_id:
            attorney_details = {
                "attorneyName": strata_hotel.attorney_name,
                "mailingAddress": cls._serialize_mailing_address(
                    strata_hotel.registered_office_attorney_mailing_address
                ),
            }

        snapshot["businessDetails"] = {
            "legalName": strata_hotel.legal_name,
            "homeJurisdiction": strata_hotel.home_jurisdiction,
            "businessNumber": strata_hotel.business_number,
            "mailingAddress": cls._serialize_mailing_address(strata_hotel.mailingAddress),
            "registeredOfficeOrAttorneyForServiceDetails": attorney_details,
        }

        representatives = strata_hotel.representatives or []
        snapshot["strataHotelRepresentatives"] = [
            cls._serialize_person_contact(rep.contact) for rep in representatives if rep.contact
        ]

        category = strata_hotel.category
        category_str = category.name if hasattr(category, "name") else str(category) if category else None

        buildings = [cls._serialize_mailing_address(b.address) for b in (strata_hotel.buildings or []) if b.address]

        snapshot["strataHotelDetails"] = {
            "brand": {"name": strata_hotel.brand_name, "website": strata_hotel.website},
            "location": cls._serialize_mailing_address(strata_hotel.location),
            "numberOfUnits": strata_hotel.number_of_units,
            "category": category_str,
            "buildings": buildings,
            "unitListings": cls._normalize_unit_listings(strata_hotel.unit_listings),
        }

    @classmethod
    def _serialize_mailing_address(cls, address: Optional[Address]) -> Optional[dict[str, Any]]:
        """Serialize Address model to MailingAddress dictionary."""
        if not address:
            return None
        return {
            "address": address.street_address,
            "addressLineTwo": address.street_address_additional,
            "city": address.city,
            "province": address.province,
            "postalCode": address.postal_code,
            "country": address.country,
            "locationDescription": address.location_description,
        }

    @classmethod
    def _serialize_person_contact(cls, contact: Optional[Contact]) -> Optional[dict[str, Any]]:
        """Serialize Contact model to PersonContact dictionary."""
        if not contact:
            return None
        return {
            "firstName": contact.firstname,
            "middleName": contact.middlename,
            "lastName": contact.lastname,
            "preferredName": contact.preferredname,
            "jobTitle": contact.job_title,
            "emailAddress": contact.email,
            "phoneNumber": contact.phone_number,
            "phoneCountryCode": contact.phone_country_code,
            "extension": contact.phone_extension,
            "faxNumber": contact.fax_number,
        }

    @classmethod
    def _normalize_unit_listings(cls, raw_unit_listings: Any) -> Optional[dict[str, Any]]:
        """
        Normalize and sanitize strata hotel unit listings.
        Splits newlines and commas, trims whitespace, and filters out empty tokens.
        """
        if not raw_unit_listings or not isinstance(raw_unit_listings, dict):
            return None

        def clean_tokens(val: Any) -> list[str]:
            if not val:
                return []
            if isinstance(val, str):
                tokens = re.split(r"[\r\n,]+", val)
                return [t.strip() for t in tokens if t.strip()]
            if isinstance(val, (list, tuple)):
                res: list[str] = []
                for item in val:
                    if isinstance(item, str):
                        tokens = re.split(r"[\r\n,]+", item)
                        res.extend([t.strip() for t in tokens if t.strip()])
                    elif item is not None:
                        s = str(item).strip()
                        if s:
                            res.append(s)
                return res
            return [str(val).strip()] if str(val).strip() else []

        primary = clean_tokens(raw_unit_listings.get("primary"))
        raw_additional = raw_unit_listings.get("additional") or []
        additional: list[list[str]] = []
        if isinstance(raw_additional, list):
            for b_units in raw_additional:
                additional.append(clean_tokens(b_units))

        return {"primary": primary, "additional": additional}

    @classmethod
    def _get_jurisdiction(cls, registration: Registration) -> Optional[str]:
        """Resolve jurisdiction from rental_property or most recent application."""
        if registration.rental_property and registration.rental_property.jurisdiction:
            return registration.rental_property.jurisdiction

        applications = Application.get_all_by_registration_id(registration.id)
        if applications:
            latest_app = max(applications, key=lambda a: a.application_date)
            reg_json = latest_app.application_json.get("registration") or {}
            str_req = reg_json.get("strRequirements") or {}
            return str_req.get("organizationNm")
        return None

    @classmethod
    def _get_str_requirements(cls, registration: Registration) -> Optional[dict[str, Any]]:
        """Extract strRequirements object from latest application."""
        applications = Application.get_all_by_registration_id(registration.id)
        if not applications:
            return None

        latest_app = max(applications, key=lambda a: a.application_date)
        if not latest_app.application_json:
            return None

        reg_json = latest_app.application_json.get("registration") or {}
        str_req = reg_json.get("strRequirements")
        if not str_req or not isinstance(str_req, dict):
            return None

        return {
            "organizationNm": str_req.get("organizationNm"),
            "isPrincipalResidenceRequired": str_req.get("isPrincipalResidenceRequired"),
            "isBusinessLicenceRequired": str_req.get("isBusinessLicenceRequired"),
            "isStrProhibited": str_req.get("isStrProhibited"),
            "isStraaExempt": str_req.get("isStraaExempt"),
        }

    @classmethod
    def _get_override_value(cls, reg_json: dict, path: str, default_value: Any) -> Any:
        """Get value from reg_json using dot-notation path, falling back to default_value."""
        if not reg_json:
            return default_value
        val = reg_json
        for key in path.split("."):
            if isinstance(val, dict) and key in val:
                val = val[key]
            else:
                return default_value
        return val

    @staticmethod
    def _to_iso_z(dt: Optional[datetime | date]) -> Optional[str]:
        """Format datetime to ISO 8601 with Z suffix."""
        if not dt:
            return None
        if isinstance(dt, datetime):
            iso = dt.isoformat()
            if not iso.endswith("Z") and "+" not in iso and "-" not in iso[-6:]:
                return f"{iso}Z"
            return iso
        return dt.strftime("%Y-%m-%d")
