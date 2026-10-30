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
        """Serialize a registration into an OpenAPI-compliant snapshot."""
        reg_type = cls._enum_val(registration.registration_type)
        status_str = cls._enum_val(registration.status)

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
        rental = registration.rental_property
        if not rental:
            return

        contacts = rental.contacts or []
        primary_c = next((c for c in contacts if c.is_primary is True), contacts[0] if contacts else None)
        secondary_c = next((c for c in contacts if c.is_primary is False), None)

        reg_json = registration.registration_json or {}
        snapshot["primaryContact"] = cls._serialize_host_contact(
            primary_c, reg_json=reg_json, include_pii=include_pii, is_primary=True
        )
        snapshot["secondaryContact"] = cls._serialize_host_contact(secondary_c, is_primary=False)

        unit_addr = rental.address
        snapshot["unitAddress"] = {
            "unitNumber": unit_addr.unit_number if unit_addr else None,
            "streetNumber": unit_addr.street_number if unit_addr else None,
            "streetName": unit_addr.street_address if unit_addr else None,
            "addressLineTwo": unit_addr.street_address_additional if unit_addr else None,
            "city": unit_addr.city if unit_addr else None,
            "province": unit_addr.province if unit_addr else None,
            "postalCode": unit_addr.postal_code if unit_addr else None,
            "country": unit_addr.country if unit_addr else None,
            "nickname": rental.nickname,
            "locationDescription": unit_addr.location_description if unit_addr else None,
        }

        app_jurisdiction, str_req = cls._get_application_data(registration.id)
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
        snapshot["propertyManager"] = cls._serialize_property_manager(rental.property_manager, reg_json)

    @classmethod
    def _populate_platform_snapshot(cls, snapshot: dict[str, Any], registration: Registration):
        """Populate PLATFORM registration payload."""
        platform: Optional[Platform] = (
            registration.platform_registration.platform if registration.platform_registration else None
        )
        if not platform:
            return

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
            "registeredOfficeOrAttorneyForServiceDetails": cls._serialize_attorney(platform),
        }
        snapshot["platformRepresentatives"] = [
            cls._serialize_person_contact(r.contact) for r in (platform.representatives or []) if r.contact
        ]
        snapshot["platformDetails"] = {
            "listingSize": cls._enum_val(platform.listing_size),
            "brands": [{"name": b.name, "website": b.website} for b in (platform.brands or [])],
        }

    @classmethod
    def _populate_strata_hotel_snapshot(cls, snapshot: dict[str, Any], registration: Registration):
        """Populate STRATA_HOTEL registration payload."""
        sh: Optional[StrataHotel] = (
            registration.strata_hotel_registration.strata_hotel if registration.strata_hotel_registration else None
        )
        if not sh:
            return

        snapshot["businessDetails"] = {
            "legalName": sh.legal_name,
            "homeJurisdiction": sh.home_jurisdiction,
            "businessNumber": sh.business_number,
            "mailingAddress": cls._serialize_mailing_address(sh.mailingAddress),
            "registeredOfficeOrAttorneyForServiceDetails": cls._serialize_attorney(sh),
        }
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
    def _serialize_host_contact(
        cls,
        prop_contact,
        reg_json: Optional[dict] = None,
        include_pii: bool = False,
        is_primary: bool = True,
    ) -> Optional[dict[str, Any]]:
        """Serialize primary or secondary host contact."""
        if not prop_contact:
            return None
        c = prop_contact.contact
        email = (
            cls._get_override(reg_json, "primaryContact.emailAddress", c.email if c else None)
            if is_primary
            else (c.email if c else None)
        )
        dob = c.date_of_birth.strftime("%Y-%m-%d") if (is_primary and include_pii and c and c.date_of_birth) else None
        sin = c.social_insurance_number if (is_primary and include_pii and c) else None

        return {
            "contactType": cls._enum_val(prop_contact.contact_type) or "INDIVIDUAL",
            "firstName": c.firstname if c else None,
            "middleName": c.middlename if c else None,
            "lastName": c.lastname if c else None,
            "preferredName": c.preferredname if c else None,
            "dateOfBirth": dob,
            "socialInsuranceNumber": sin,
            "businessNumber": c.business_number if (is_primary and c) else None,
            "businessLegalName": prop_contact.business_legal_name if is_primary else None,
            "emailAddress": email,
            "phoneNumber": c.phone_number if c else None,
            "phoneCountryCode": c.phone_country_code if c else None,
            "extension": c.phone_extension if c else None,
            "faxNumber": c.fax_number if c else None,
            "mailingAddress": cls._serialize_mailing_address(c.address if c else None),
        }

    @classmethod
    def _serialize_property_manager(cls, pm: Optional[PropertyManager], reg_json: dict) -> Optional[dict[str, Any]]:
        """Serialize property manager using single flat representation."""
        if not pm:
            return None

        pm_type = cls._enum_val(pm.property_manager_type) or "INDIVIDUAL"
        is_biz = pm_type == "BUSINESS"

        pm_json = reg_json.get("propertyManager") or {}
        initiated = pm_json.get("initiatedByPropertyManager") if isinstance(pm_json, dict) else None

        c = pm.primary_contact
        contact_dict = cls._serialize_person_contact(c) or {
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

        mailing_addr = pm.business_mailing_address if is_biz else (c.address if c else None)

        return {
            "propertyManagerType": pm_type,
            "initiatedByPropertyManager": bool(initiated) if initiated is not None else None,
            "businessLegalName": pm.business_legal_name if is_biz else None,
            "businessNumber": pm.business_number if is_biz else None,
            "mailingAddress": cls._serialize_mailing_address(mailing_addr),
            "contact": contact_dict,
        }

    @classmethod
    def _serialize_attorney(cls, entity: Any) -> Optional[dict[str, Any]]:
        """Serialize registered office or attorney for service details."""
        if not getattr(entity, "registered_office_attorney_mailing_address_id", None):
            return None
        return {
            "attorneyName": entity.attorney_name,
            "mailingAddress": cls._serialize_mailing_address(entity.registered_office_attorney_mailing_address),
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
            if not val:
                return []
            items = val if isinstance(val, (list, tuple)) else [val]
            return [t.strip() for item in items if item for t in re.split(r"[\r\n,]+", str(item)) if t.strip()]

        raw_add = raw.get("additional") or []
        add_cleaned = [clean(u) for u in raw_add] if isinstance(raw_add, list) else []
        return {"primary": clean(raw.get("primary")), "additional": add_cleaned}

    @classmethod
    def _get_application_data(cls, reg_id: int) -> tuple[Optional[str], Optional[dict[str, Any]]]:
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
        """Extract string representation from enum or object."""
        if val is None:
            return None
        return getattr(val, "value", getattr(val, "name", str(val)))

    @classmethod
    def _get_override(cls, data: Optional[dict], path: str, default: Any) -> Any:
        """Resolve dot-notation path in nested dictionary."""
        if not data:
            return default
        cur = data
        for part in path.split("."):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                return default
        return cur

    @staticmethod
    def _to_iso_z(dt: Optional[datetime | date]) -> Optional[str]:
        """Format datetime to ISO 8601 with Z suffix."""
        if not dt:
            return None
        if isinstance(dt, datetime):
            iso = dt.isoformat()
            return f"{iso}Z" if not iso.endswith("Z") and "+" not in iso and "-" not in iso[-6:] else iso
        return dt.strftime("%Y-%m-%d")
