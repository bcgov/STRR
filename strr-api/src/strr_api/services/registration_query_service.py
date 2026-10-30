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
# pylint: disable=too-many-locals,too-many-arguments,too-many-positional-arguments,too-many-branches
"""
Registration Query Service.

Provides keyset pagination, CDC history tracking, targeted batch lookup,
and HMAC-signed cursor handling for registration data synchronization.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from dateutil import parser
from flask import current_app
from sqlalchemy import and_, func, or_, select, union_all
from sqlalchemy.orm import selectinload

from strr_api.exceptions import ValidationException
from strr_api.models import (
    Contact,
    Platform,
    PlatformRegistration,
    PlatformRepresentative,
    PropertyContact,
    PropertyManager,
    Registration,
    RentalProperty,
    StrataHotel,
    StrataHotelBuilding,
    StrataHotelRegistration,
    StrataHotelRepresentative,
    db,
)
from strr_api.responses.RegistrationQuerySerializer import RegistrationQuerySerializer

logger = logging.getLogger("api")

REG_NUM_REGEX = re.compile(r"^[A-Z0-9-]{3,30}$", re.IGNORECASE)
DEFAULT_PAGE_LIMIT = 100
MAX_PAGE_LIMIT = 500
CURSOR_VERSION = 1
CURSOR_TTL_DAYS = 7


class RegistrationQueryService:
    """Service layer for registration query operations."""

    @classmethod
    def execute_query(
        cls,
        payload: dict[str, Any],
        can_export: bool = False,
        can_read_pii: bool = False,
        can_read: bool = True,
    ) -> dict[str, Any]:
        """
        Execute registration query request.

        :param payload: Parsed JSON request payload.
        :param can_export: Whether caller is authorized for unconstrained bulk/CDC export.
        :param can_read_pii: Whether caller is authorized to view unmasked PII.
        :param can_read: Whether caller is authorized for targeted registration lookup.
        :return: Response dictionary with items, nextCursor, and optional errors.
        """
        registration_numbers = payload.get("registrationNumbers")
        updated_since_raw = payload.get("updatedSince")
        cursor_raw = payload.get("cursor")
        limit = payload.get("limit") or DEFAULT_PAGE_LIMIT

        # Validate limit range
        if not isinstance(limit, int) or limit < 1 or limit > MAX_PAGE_LIMIT:
            raise ValidationException(f"Page limit must be an integer between 1 and {MAX_PAGE_LIMIT}.")

        # Parse updatedSince timestamp if provided
        updated_since: Optional[datetime] = None
        if updated_since_raw:
            try:
                updated_since = parser.isoparse(updated_since_raw)
                if updated_since.tzinfo is None:
                    updated_since = updated_since.replace(tzinfo=timezone.utc)
            except Exception as e:
                raise ValidationException(f"Invalid 'updatedSince' timestamp format: {e}") from e

        # Compute scope hash for cursor binding
        scope_hash = cls.compute_scope_hash(updated_since, registration_numbers)

        # Decode and validate cursor if provided
        cursor_position: Optional[dict[str, Any]] = None
        if cursor_raw:
            cursor_position = cls.decode_and_validate_cursor(cursor_raw, scope_hash)

        # Route to appropriate query mode
        if registration_numbers is not None:
            if not can_read:
                raise ValidationException("Targeted registration lookup requires 'strr.registrations:read' capability.")
            return cls._execute_targeted_lookup(
                registration_numbers=registration_numbers,
                cursor_position=cursor_position,
                limit=limit,
                scope_hash=scope_hash,
                include_pii=can_read_pii,
            )

        # Full CDC synchronization requires export capability
        if not can_export:
            raise ValidationException(
                "Full synchronization feed requires 'strr.registrations:export' capability. "
                "Provide 'registrationNumbers' for targeted lookup."
            )

        return cls._execute_cdc_query(
            updated_since=updated_since,
            cursor_position=cursor_position,
            limit=limit,
            scope_hash=scope_hash,
            include_pii=can_read_pii,
        )

    # -------------------------------------------------------------------------
    # Targeted Batch Lookup
    # -------------------------------------------------------------------------
    @classmethod
    def _execute_targeted_lookup(
        cls,
        registration_numbers: list[str],
        cursor_position: Optional[dict[str, Any]],
        limit: int,
        scope_hash: str,
        include_pii: bool,
    ) -> dict[str, Any]:
        """Execute targeted lookup for specific registration numbers."""
        if not registration_numbers:
            return {"items": [], "errors": [], "nextCursor": None}

        if len(registration_numbers) > MAX_PAGE_LIMIT:
            raise ValidationException(f"Maximum allowed registrationNumbers per request is {MAX_PAGE_LIMIT}.")

        # Deduplicate preserving order
        seen = set()
        deduped: list[str] = []
        for reg_num in registration_numbers:
            trimmed = reg_num.strip() if isinstance(reg_num, str) else ""
            if trimmed and trimmed not in seen:
                seen.add(trimmed)
                deduped.append(trimmed)

        # Validate syntax
        valid_numbers: list[str] = []
        format_errors: list[dict[str, str]] = []
        for reg_num in deduped:
            if REG_NUM_REGEX.match(reg_num):
                valid_numbers.append(reg_num)
            else:
                format_errors.append({"registrationNumber": reg_num, "code": "INVALID_REGISTRATION_NUMBER"})

        offset = cursor_position.get("offset", 0) if cursor_position else 0
        page_numbers = valid_numbers[offset : offset + limit]

        # Fetch registrations matching page numbers
        registrations: list[Registration] = []
        if page_numbers:
            query = cls._build_eager_loaded_query().filter(Registration.registration_number.in_(page_numbers))
            registrations = query.all()

        reg_map = {r.registration_number: r for r in registrations}

        items: list[dict[str, Any]] = []
        not_found_errors: list[dict[str, str]] = []

        for reg_num in page_numbers:
            if reg_num in reg_map:
                items.append(RegistrationQuerySerializer.serialize(reg_map[reg_num], include_pii=include_pii))
            else:
                not_found_errors.append({"registrationNumber": reg_num, "code": "NOT_FOUND"})

        # Determine nextCursor
        next_cursor = None
        if offset + limit < len(valid_numbers):
            next_cursor = cls.generate_cursor(
                position={"offset": offset + limit},
                scope_hash=scope_hash,
            )

        errors = format_errors + not_found_errors
        response: dict[str, Any] = {"items": items, "nextCursor": next_cursor}
        if errors:
            response["errors"] = errors

        return response

    # -------------------------------------------------------------------------
    # CDC Incremental Synchronization
    # -------------------------------------------------------------------------
    @classmethod
    def _execute_cdc_query(
        cls,
        updated_since: Optional[datetime],
        cursor_position: Optional[dict[str, Any]],
        limit: int,
        scope_hash: str,
        include_pii: bool,
    ) -> dict[str, Any]:
        """Execute CDC synchronization query ordered by (changed ASC, registration_id ASC)."""
        cursor_changed: Optional[datetime] = None
        cursor_reg_id: Optional[int] = None
        if cursor_position:
            changed_str = cursor_position.get("changed")
            if changed_str:
                cursor_changed = parser.isoparse(changed_str)
                if cursor_changed.tzinfo is None:
                    cursor_changed = cursor_changed.replace(tzinfo=timezone.utc)
            cursor_reg_id = cursor_position.get("registrationId")

        # Build union query of changes across tables
        union_subquery = cls._build_cdc_changes_subquery()

        # Aggregate latest change per registration
        agg_subquery = (
            select(
                union_subquery.c.registration_id,
                func.max(union_subquery.c.changed).label("max_changed"),
            )
            .group_by(union_subquery.c.registration_id)
            .subquery("agg_changes")
        )

        query = select(
            agg_subquery.c.registration_id,
            agg_subquery.c.max_changed,
        )

        # Apply keyset or updatedSince filtering
        if cursor_changed is not None and cursor_reg_id is not None:
            # Strip timezone if db column is naive
            query = query.filter(
                or_(
                    agg_subquery.c.max_changed > cursor_changed,
                    and_(
                        agg_subquery.c.max_changed == cursor_changed,
                        agg_subquery.c.registration_id > cursor_reg_id,
                    ),
                )
            )
        elif updated_since is not None:
            query = query.filter(agg_subquery.c.max_changed >= updated_since)

        # Ordering and limit + 1
        query = query.order_by(agg_subquery.c.max_changed.asc(), agg_subquery.c.registration_id.asc()).limit(limit + 1)

        results = db.session.execute(query).fetchall()

        has_more = len(results) > limit
        page_results = results[:limit]

        reg_ids = [row[0] for row in page_results]

        # Fetch eager loaded registration models
        registrations: list[Registration] = []
        if reg_ids:
            reg_query = cls._build_eager_loaded_query().filter(Registration.id.in_(reg_ids))
            models = reg_query.all()
            models_by_id = {m.id: m for m in models}
            registrations = [models_by_id[r_id] for r_id in reg_ids if r_id in models_by_id]

        items = [RegistrationQuerySerializer.serialize(reg, include_pii=include_pii) for reg in registrations]

        # Determine nextCursor
        next_cursor = None
        if has_more and page_results:
            last_row = page_results[-1]
            last_id, last_changed = last_row[0], last_row[1]
            changed_iso = last_changed.isoformat() if hasattr(last_changed, "isoformat") else str(last_changed)
            if not changed_iso.endswith("Z") and "+" not in changed_iso:
                changed_iso = f"{changed_iso}Z"

            next_cursor = cls.generate_cursor(
                position={"changed": changed_iso, "registrationId": last_id},
                scope_hash=scope_hash,
            )

        return {"items": items, "nextCursor": next_cursor}

    # -------------------------------------------------------------------------
    # SQL Query Builders
    # -------------------------------------------------------------------------
    @classmethod
    def _build_cdc_changes_subquery(cls):
        """Construct a unified changes subquery from registrations and available history tables."""
        subqueries = [
            select(
                Registration.id.label("registration_id"),
                Registration.updated_date.label("changed"),
            )
        ]

        meta = db.metadata.tables

        # Check registrations_history
        if "registrations_history" in meta:
            t = meta["registrations_history"]
            subqueries.append(
                select(t.c.id.label("registration_id"), t.c.changed.label("changed")).filter(t.c.changed.isnot(None))
            )

        # Check rental_properties_history
        if "rental_properties_history" in meta:
            t = meta["rental_properties_history"]
            subqueries.append(
                select(t.c.registration_id.label("registration_id"), t.c.changed.label("changed")).filter(
                    t.c.registration_id.isnot(None),
                    t.c.changed.isnot(None),
                )
            )

        # Check platform_registration_history
        if "platform_registration_history" in meta:
            t = meta["platform_registration_history"]
            subqueries.append(
                select(t.c.registration_id.label("registration_id"), t.c.changed.label("changed")).filter(
                    t.c.registration_id.isnot(None),
                    t.c.changed.isnot(None),
                )
            )

        # Check strata_hotel_registration_history
        if "strata_hotel_registration_history" in meta:
            t = meta["strata_hotel_registration_history"]
            subqueries.append(
                select(t.c.registration_id.label("registration_id"), t.c.changed.label("changed")).filter(
                    t.c.registration_id.isnot(None),
                    t.c.changed.isnot(None),
                )
            )

        return union_all(*subqueries).subquery("changes")

    @classmethod
    def _build_eager_loaded_query(cls):
        """Build Registration ORM query with optimized eager loading to avoid N+1 queries."""
        return Registration.query.options(
            # Rental property & contacts
            selectinload(Registration.rental_property)
            .selectinload(RentalProperty.contacts)
            .selectinload(PropertyContact.contact)
            .selectinload(Contact.address),
            selectinload(Registration.rental_property).selectinload(RentalProperty.address),
            # Property manager
            selectinload(Registration.rental_property)
            .selectinload(RentalProperty.property_manager)
            .selectinload(PropertyManager.primary_contact)
            .selectinload(Contact.address),
            selectinload(Registration.rental_property)
            .selectinload(RentalProperty.property_manager)
            .selectinload(PropertyManager.business_mailing_address),
            # Platform details
            selectinload(Registration.platform_registration)
            .selectinload(PlatformRegistration.platform)
            .selectinload(Platform.mailingAddress),
            selectinload(Registration.platform_registration)
            .selectinload(PlatformRegistration.platform)
            .selectinload(Platform.registered_office_attorney_mailing_address),
            selectinload(Registration.platform_registration)
            .selectinload(PlatformRegistration.platform)
            .selectinload(Platform.representatives)
            .selectinload(PlatformRepresentative.contact),
            selectinload(Registration.platform_registration)
            .selectinload(PlatformRegistration.platform)
            .selectinload(Platform.brands),
            # Strata hotel details
            selectinload(Registration.strata_hotel_registration)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.mailingAddress),
            selectinload(Registration.strata_hotel_registration)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.location),
            selectinload(Registration.strata_hotel_registration)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.registered_office_attorney_mailing_address),
            selectinload(Registration.strata_hotel_registration)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.representatives)
            .selectinload(StrataHotelRepresentative.contact),
            selectinload(Registration.strata_hotel_registration)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.buildings)
            .selectinload(StrataHotelBuilding.address),
        )

    # -------------------------------------------------------------------------
    # Cursor Utilities (HMAC-SHA256, Stateless, Scoped)
    # -------------------------------------------------------------------------
    @classmethod
    def compute_scope_hash(
        cls,
        updated_since: Optional[datetime],
        registration_numbers: Optional[list[str]],
    ) -> str:
        """Compute 16-character SHA-256 hash of normalized query parameters."""
        ts_part = updated_since.isoformat() if updated_since else ""
        nums_part = ",".join(sorted(registration_numbers)) if registration_numbers else ""
        scope_str = f"ts={ts_part}|nums={nums_part}"
        return hashlib.sha256(scope_str.encode("utf-8")).hexdigest()[:16]

    @classmethod
    def generate_cursor(cls, position: dict[str, Any], scope_hash: str) -> str:
        """Generate HMAC-signed, Base64URL-encoded cursor token."""
        expires_at = datetime.now(timezone.utc) + timedelta(days=CURSOR_TTL_DAYS)
        payload = {
            "version": CURSOR_VERSION,
            "position": position,
            "scopeHash": scope_hash,
            "expiresAt": expires_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        secret = cls._get_secret_key()
        payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        b64_payload = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")

        sig = hmac.new(secret, b64_payload.encode("ascii"), hashlib.sha256).digest()
        b64_sig = base64.urlsafe_b64encode(sig).decode("ascii").rstrip("=")

        return f"{b64_payload}.{b64_sig}"

    @classmethod
    def decode_and_validate_cursor(cls, cursor_str: str, expected_scope_hash: str) -> dict[str, Any]:
        """
        Validate HMAC signature, expiration, and scopeHash, returning cursor position.
        Raises ValidationException if invalid, tampered, or expired.
        """
        if not cursor_str or "." not in cursor_str:
            raise ValidationException("Invalid cursor format.")

        parts = cursor_str.split(".")
        if len(parts) != 2:
            raise ValidationException("Invalid cursor structure.")

        b64_payload, b64_sig = parts[0], parts[1]

        # Verify HMAC signature
        secret = cls._get_secret_key()
        expected_sig = hmac.new(secret, b64_payload.encode("ascii"), hashlib.sha256).digest()
        expected_b64_sig = base64.urlsafe_b64encode(expected_sig).decode("ascii").rstrip("=")

        if not hmac.compare_digest(b64_sig, expected_b64_sig):
            raise ValidationException("Invalid cursor signature or tampered token.")

        # Decode payload
        try:
            # Re-pad base64
            padded_b64 = b64_payload + "=" * ((4 - len(b64_payload) % 4) % 4)
            payload_data = json.loads(base64.urlsafe_b64decode(padded_b64).decode("utf-8"))
        except Exception as e:
            raise ValidationException(f"Failed to decode cursor payload: {e}") from e

        # Validate version
        if payload_data.get("version") != CURSOR_VERSION:
            raise ValidationException(f"Unsupported cursor version: {payload_data.get('version')}.")

        # Validate expiration
        expires_at_str = payload_data.get("expiresAt")
        if expires_at_str:
            try:
                expires_at = parser.isoparse(expires_at_str)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > expires_at:
                    raise ValidationException("Cursor has expired. Please re-run your query.")
            except Exception as e:
                if isinstance(e, ValidationException):
                    raise
                raise ValidationException("Invalid cursor expiry timestamp.") from e

        # Validate scope hash
        if payload_data.get("scopeHash") != expected_scope_hash:
            raise ValidationException("Cursor filter scope does not match current request parameters.")

        position = payload_data.get("position")
        if not isinstance(position, dict):
            raise ValidationException("Invalid cursor position payload.")

        return position

    @staticmethod
    def _get_secret_key() -> bytes:
        """Retrieve signing secret key."""
        secret_str = current_app.config.get("SECRET_KEY", "default-strr-export-signing-secret")
        return secret_str.encode("utf-8")
