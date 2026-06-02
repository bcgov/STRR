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
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
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
"""Examiner notes service."""

from __future__ import annotations

import logging
from datetime import timezone
from http import HTTPStatus
from typing import Any

from sqlalchemy.orm import joinedload

from strr_api.enums.enum import ErrorMessage
from strr_api.exceptions import ValidationException
from strr_api.models import Application, ExaminerNote, Registration, User

logger = logging.getLogger(__name__)

NOTE_LIST_MAX = 500
NOTE_MAX_TEXT_LENGTH = 4000

# Application statuses where note creation is blocked.
APPLICATION_NOTE_BLOCKED_STATUSES = frozenset(
    {
        Application.Status.DRAFT.value,
        Application.Status.PAYMENT_DUE.value,
        Application.Status.PAID.value,
        Application.Status.AUTO_APPROVED.value,
        Application.Status.PROVISIONALLY_APPROVED.value,
        Application.Status.FULL_REVIEW_APPROVED.value,
        Application.Status.ADDITIONAL_INFO_REQUESTED.value,
    }
)


class ExaminerNoteNotAllowedException(Exception):
    """Raised when an application note cannot be posted."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message
        self.status_code = HTTPStatus.UNPROCESSABLE_ENTITY


class ExaminerNoteService:
    """Create and list examiner notes."""

    @staticmethod
    def validate_text(text: str | None) -> str:
        """Trim and validate note text; raises ValidationException on failure."""
        if text is None:
            logger.warning("Examiner note validation failed: text is None")
            raise ValidationException(message=ErrorMessage.EXAMINER_NOTE_TEXT_REQUIRED.value)
        trimmed = text.strip()
        if not trimmed:
            logger.warning("Examiner note validation failed: text is empty after trim")
            raise ValidationException(message=ErrorMessage.EXAMINER_NOTE_TEXT_REQUIRED.value)
        if len(trimmed) > NOTE_MAX_TEXT_LENGTH:
            logger.warning(
                "Examiner note validation failed: text length %d exceeds maximum %d",
                len(trimmed),
                NOTE_MAX_TEXT_LENGTH,
            )
            raise ValidationException(message=ErrorMessage.EXAMINER_NOTE_TEXT_TOO_LONG.value)
        return trimmed

    @staticmethod
    def application_note_post_block_reason(application: Application) -> str | None:
        """Return a user-facing message when POST is blocked, or None when allowed."""
        if application.registration_id is not None:
            return ErrorMessage.EXAMINER_NOTE_APPLICATION_REGISTERED.value
        status = getattr(application.status, "value", application.status)
        if status in APPLICATION_NOTE_BLOCKED_STATUSES:
            return ErrorMessage.EXAMINER_NOTE_APPLICATION_STATUS_NOT_ALLOWED.value.format(status=status)
        return None

    @classmethod
    def list_by_application_id(cls, application_id: int) -> tuple[list[ExaminerNote], bool]:
        """Return notes newest first and whether the list was truncated."""
        return cls._list_notes(ExaminerNote.application_id == application_id)

    @classmethod
    def list_by_registration_id(cls, registration_id: int) -> tuple[list[ExaminerNote], bool]:
        """Return registration-owned notes newest first and whether truncated."""
        return cls._list_notes(ExaminerNote.registration_id == registration_id)

    @classmethod
    def _list_notes(cls, filter_clause) -> tuple[list[ExaminerNote], bool]:
        rows = (
            ExaminerNote.query.options(joinedload(ExaminerNote.author))
            .filter(filter_clause)
            .order_by(ExaminerNote.created_at.desc(), ExaminerNote.id.desc())
            .limit(NOTE_LIST_MAX + 1)
            .all()
        )
        truncated = len(rows) > NOTE_LIST_MAX
        if truncated:
            rows = rows[:NOTE_LIST_MAX]
        return rows, truncated

    @classmethod
    def create_application_note(cls, application: Application, user: User, text: str) -> ExaminerNote:
        """Create a note on an application."""
        validated_text = cls.validate_text(text)
        block_reason = cls.application_note_post_block_reason(application)
        if block_reason:
            logger.warning(
                "Blocked examiner note creation for application_id=%s (number=%s) by user=%s: %s",
                application.id,
                application.application_number,
                user.username,
                block_reason,
            )
            raise ExaminerNoteNotAllowedException(block_reason)
        note = ExaminerNote(
            text=validated_text,
            application_id=application.id,
            author_user_id=user.id,
        )
        note.save()
        note.author = user
        logger.info(
            "Created examiner note id=%s for application_id=%s by user=%s (text_length=%d)",
            note.id,
            application.id,
            user.username,
            len(validated_text),
        )
        return note

    @classmethod
    def create_registration_note(cls, registration: Registration, user: User, text: str) -> ExaminerNote:
        """Create a note on a registration."""
        validated_text = cls.validate_text(text)
        note = ExaminerNote(
            text=validated_text,
            registration_id=registration.id,
            author_user_id=user.id,
        )
        note.save()
        note.author = user
        logger.info(
            "Created examiner note id=%s for registration_id=%s by user=%s (text_length=%d)",
            note.id,
            registration.id,
            user.username,
            len(validated_text),
        )
        return note

    @staticmethod
    def serialize(note: ExaminerNote) -> dict[str, Any]:
        """Serialize examiner note to API JSON (camelCase)."""
        created_at = note.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        return {
            "id": note.id,
            "text": note.text,
            "authorUserId": note.author_user_id,
            "authorUsername": note.author.username if note.author else None,
            "createdAt": created_at.isoformat(),
        }

    @classmethod
    def build_application_list_response(
        cls, application: Application, notes: list[ExaminerNote], truncated: bool
    ) -> dict[str, Any]:
        return {
            "applicationNumber": application.application_number,
            "truncated": truncated,
            "notes": [cls.serialize(n) for n in notes],
        }

    @classmethod
    def build_registration_list_response(
        cls, registration: Registration, notes: list[ExaminerNote], truncated: bool
    ) -> dict[str, Any]:
        return {
            "registrationId": registration.id,
            "truncated": truncated,
            "notes": [cls.serialize(n) for n in notes],
        }
