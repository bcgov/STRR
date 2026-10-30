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
# pylint: disable=too-many-locals,too-many-arguments,too-many-positional-arguments
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

from strr_api.enums.enum import OAuthScope
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
        """Execute registration query request."""
        registration_numbers = payload.get("registrationNumbers")
        updated_since_raw = payload.get("updatedSince")
        cursor_raw = payload.get("cursor")
        limit = payload.get("limit") or DEFAULT_PAGE_LIMIT

        if not isinstance(limit, int) or limit < 1 or limit > MAX_PAGE_LIMIT:
            raise ValidationException(f"Page limit must be an integer between 1 and {MAX_PAGE_LIMIT}.")

        updated_since = cls._parse_timestamp(updated_since_raw) if updated_since_raw else None
        scope_hash = cls.compute_scope_hash(updated_since, registration_numbers)
        cursor_position = cls.decode_and_validate_cursor(cursor_raw, scope_hash) if cursor_raw else None

        if registration_numbers is not None:
            if not can_read:
                raise ValidationException(
                    f"Targeted registration lookup requires '{OAuthScope.REGISTRATIONS_READ.value}' capability."
                )
            return cls._execute_targeted_lookup(
                numbers=registration_numbers,
                cursor=cursor_position,
                limit=limit,
                scope_hash=scope_hash,
                include_pii=can_read_pii,
            )

        if not can_export:
            raise ValidationException(
                f"Full synchronization feed requires '{OAuthScope.REGISTRATIONS_EXPORT.value}' capability. "
                "Provide 'registrationNumbers' for targeted lookup."
            )

        return cls._execute_cdc_query(
            updated_since=updated_since,
            cursor_position=cursor_position,
            limit=limit,
            scope_hash=scope_hash,
            include_pii=can_read_pii,
        )

    @classmethod
    def _execute_targeted_lookup(
        cls,
        numbers: list[str],
        cursor: Optional[dict[str, Any]],
        limit: int,
        scope_hash: str,
        include_pii: bool,
    ) -> dict[str, Any]:
        """Execute targeted lookup for specific registration numbers."""
        if not numbers:
            return {"items": [], "errors": [], "nextCursor": None}
        if len(numbers) > MAX_PAGE_LIMIT:
            raise ValidationException(f"Maximum allowed registrationNumbers per request is {MAX_PAGE_LIMIT}.")

        seen: set[str] = set()
        deduped = [
            seen.add(n.strip()) or n.strip()
            for n in numbers
            if isinstance(n, str) and n.strip() and n.strip() not in seen
        ]

        valid_nums: list[str] = []
        errors: list[dict[str, str]] = []
        for n in deduped:
            if REG_NUM_REGEX.match(n):
                valid_nums.append(n)
            else:
                errors.append({"registrationNumber": n, "code": "INVALID_REGISTRATION_NUMBER"})

        offset = cursor.get("offset", 0) if cursor else 0
        page_nums = valid_nums[offset : offset + limit]

        reg_map = {}
        if page_nums:
            regs = cls._build_eager_loaded_query().filter(Registration.registration_number.in_(page_nums)).all()
            reg_map = {r.registration_number: r for r in regs}

        items: list[dict[str, Any]] = []
        for n in page_nums:
            if n in reg_map:
                items.append(RegistrationQuerySerializer.serialize(reg_map[n], include_pii=include_pii))
            else:
                errors.append({"registrationNumber": n, "code": "NOT_FOUND"})

        next_cursor = (
            cls.generate_cursor({"offset": offset + limit}, scope_hash) if offset + limit < len(valid_nums) else None
        )
        res: dict[str, Any] = {"items": items, "nextCursor": next_cursor}
        if errors:
            res["errors"] = errors
        return res

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
        cursor_changed, cursor_reg_id = None, None
        if cursor_position:
            if c_str := cursor_position.get("changed"):
                cursor_changed = cls._parse_timestamp(c_str)
            cursor_reg_id = cursor_position.get("registrationId")

        union_sub = cls._build_cdc_changes_subquery()
        agg_sub = (
            select(union_sub.c.registration_id, func.max(union_sub.c.changed).label("max_changed"))
            .group_by(union_sub.c.registration_id)
            .subquery("agg_changes")
        )

        query = select(agg_sub.c.registration_id, agg_sub.c.max_changed)
        if cursor_changed and cursor_reg_id:
            query = query.filter(
                or_(
                    agg_sub.c.max_changed > cursor_changed,
                    and_(agg_sub.c.max_changed == cursor_changed, agg_sub.c.registration_id > cursor_reg_id),
                )
            )
        elif updated_since:
            query = query.filter(agg_sub.c.max_changed >= updated_since)

        results = db.session.execute(
            query.order_by(agg_sub.c.max_changed.asc(), agg_sub.c.registration_id.asc()).limit(limit + 1)
        ).fetchall()

        has_more = len(results) > limit
        page = results[:limit]
        reg_ids = [r[0] for r in page]

        items = []
        if reg_ids:
            models = cls._build_eager_loaded_query().filter(Registration.id.in_(reg_ids)).all()
            m_map = {m.id: m for m in models}
            items = [
                RegistrationQuerySerializer.serialize(m_map[r_id], include_pii=include_pii)
                for r_id in reg_ids
                if r_id in m_map
            ]

        next_cursor = None
        if has_more and page:
            last_id, last_dt = page[-1][0], page[-1][1]
            iso = last_dt.isoformat() if hasattr(last_dt, "isoformat") else str(last_dt)
            if not iso.endswith("Z") and "+" not in iso:
                iso = f"{iso}Z"
            next_cursor = cls.generate_cursor({"changed": iso, "registrationId": last_id}, scope_hash)

        return {"items": items, "nextCursor": next_cursor}

    @classmethod
    def _build_cdc_changes_subquery(cls):
        """Construct unified changes subquery from registrations and historical tables."""
        subqueries = [select(Registration.id.label("registration_id"), Registration.updated_date.label("changed"))]
        meta = db.metadata.tables
        history_tables = (
            ("registrations_history", "id"),
            ("rental_properties_history", "registration_id"),
            ("platform_registration_history", "registration_id"),
            ("strata_hotel_registration_history", "registration_id"),
        )
        for tbl_name, col_name in history_tables:
            if tbl_name in meta:
                t = meta[tbl_name]
                col = getattr(t.c, col_name)
                subqueries.append(
                    select(col.label("registration_id"), t.c.changed.label("changed")).filter(
                        col.isnot(None), t.c.changed.isnot(None)
                    )
                )
        return union_all(*subqueries).subquery("changes")

    @classmethod
    def _build_eager_loaded_query(cls):
        """Build Registration query with optimized eager loading to avoid N+1 queries."""
        rp = Registration.rental_property
        plat = Registration.platform_registration
        sh = Registration.strata_hotel_registration

        return Registration.query.options(
            selectinload(rp)
            .selectinload(RentalProperty.contacts)
            .selectinload(PropertyContact.contact)
            .selectinload(Contact.address),
            selectinload(rp).selectinload(RentalProperty.address),
            selectinload(rp)
            .selectinload(RentalProperty.property_manager)
            .selectinload(PropertyManager.primary_contact)
            .selectinload(Contact.address),
            selectinload(rp)
            .selectinload(RentalProperty.property_manager)
            .selectinload(PropertyManager.business_mailing_address),
            selectinload(plat).selectinload(PlatformRegistration.platform).selectinload(Platform.mailingAddress),
            selectinload(plat)
            .selectinload(PlatformRegistration.platform)
            .selectinload(Platform.registered_office_attorney_mailing_address),
            selectinload(plat)
            .selectinload(PlatformRegistration.platform)
            .selectinload(Platform.representatives)
            .selectinload(PlatformRepresentative.contact),
            selectinload(plat).selectinload(PlatformRegistration.platform).selectinload(Platform.brands),
            selectinload(sh)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.mailingAddress),
            selectinload(sh).selectinload(StrataHotelRegistration.strata_hotel).selectinload(StrataHotel.location),
            selectinload(sh)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.registered_office_attorney_mailing_address),
            selectinload(sh)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.representatives)
            .selectinload(StrataHotelRepresentative.contact),
            selectinload(sh)
            .selectinload(StrataHotelRegistration.strata_hotel)
            .selectinload(StrataHotel.buildings)
            .selectinload(StrataHotelBuilding.address),
        )

    @classmethod
    def compute_scope_hash(
        cls,
        updated_since: Optional[datetime],
        registration_numbers: Optional[list[str]],
    ) -> str:
        """Compute 16-character SHA-256 hash of normalized query parameters."""
        ts = updated_since.isoformat() if updated_since else ""
        nums = ",".join(sorted(registration_numbers)) if registration_numbers else ""
        return hashlib.sha256(f"ts={ts}|nums={nums}".encode("utf-8")).hexdigest()[:16]

    @classmethod
    def generate_cursor(cls, position: dict[str, Any], scope_hash: str) -> str:
        """Generate HMAC-signed, Base64URL-encoded cursor token."""
        exp = datetime.now(timezone.utc) + timedelta(days=CURSOR_TTL_DAYS)
        payload = {
            "version": CURSOR_VERSION,
            "position": position,
            "scopeHash": scope_hash,
            "expiresAt": exp.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        b64_payload = cls._b64_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
        sig = hmac.new(cls._get_secret_key(), b64_payload.encode("ascii"), hashlib.sha256).digest()
        return f"{b64_payload}.{cls._b64_encode(sig)}"

    @classmethod
    def decode_and_validate_cursor(cls, cursor_str: str, expected_scope_hash: str) -> dict[str, Any]:
        """Validate HMAC signature, expiration, and scopeHash, returning cursor position."""
        if not cursor_str or "." not in cursor_str:
            raise ValidationException("Invalid cursor format.")

        parts = cursor_str.split(".")
        if len(parts) != 2:
            raise ValidationException("Invalid cursor structure.")

        b64_payload, b64_sig = parts[0], parts[1]
        exp_sig = hmac.new(cls._get_secret_key(), b64_payload.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(b64_sig, cls._b64_encode(exp_sig)):
            raise ValidationException("Invalid cursor signature or tampered token.")

        try:
            data = json.loads(cls._b64_decode(b64_payload).decode("utf-8"))
        except Exception as e:
            raise ValidationException(f"Failed to decode cursor payload: {e}") from e

        if data.get("version") != CURSOR_VERSION:
            raise ValidationException(f"Unsupported cursor version: {data.get('version')}.")

        if exp_str := data.get("expiresAt"):
            try:
                if datetime.now(timezone.utc) > cls._parse_timestamp(exp_str):
                    raise ValidationException("Cursor has expired. Please re-run your query.")
            except ValidationException:
                raise
            except Exception as e:
                raise ValidationException("Invalid cursor expiry timestamp.") from e

        if data.get("scopeHash") != expected_scope_hash:
            raise ValidationException("Cursor filter scope does not match current request parameters.")

        pos = data.get("position")
        if not isinstance(pos, dict):
            raise ValidationException("Invalid cursor position payload.")
        return pos

    @staticmethod
    def _parse_timestamp(ts_str: str) -> datetime:
        """Parse ISO timestamp ensuring UTC timezone."""
        try:
            dt = parser.isoparse(ts_str)
            return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
        except Exception as e:
            raise ValidationException(f"Invalid timestamp format: {e}") from e

    @staticmethod
    def _b64_encode(data: bytes) -> str:
        """URL-safe Base64 encode without padding."""
        return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")

    @staticmethod
    def _b64_decode(s: str) -> bytes:
        """URL-safe Base64 decode with automatic padding calculation."""
        return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

    @staticmethod
    def _get_secret_key() -> bytes:
        """Retrieve signing secret key."""
        return current_app.config.get("SECRET_KEY", "default-strr-export-signing-secret").encode("utf-8")
