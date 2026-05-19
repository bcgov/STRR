# Copyright © 2024 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
"""Shared Flask-client steps for application resource tests."""

from __future__ import annotations

from http import HTTPStatus
from typing import Any

from strr_api.enums.enum import PaymentStatus
from strr_api.models import Application
from tests.unit.utils.auth_helpers import STRR_EXAMINER, create_header


def set_application_ready_for_examiner_review(application_number: str) -> None:
    """Set payment completed and FULL_REVIEW so staff can assign and approve."""
    application = Application.find_by_application_number(application_number=application_number)
    application.payment_status = PaymentStatus.COMPLETED.value
    application.status = Application.Status.FULL_REVIEW
    application.save()


def assign_examiner_and_full_review_approve(
    client, jwt, application_number: str
) -> tuple[dict[str, Any], dict[str, str]]:
    """
    Assign STRR examiner and approve FULL_REVIEW_APPROVED.

    Returns ``(response_json, staff_headers)`` so callers can reuse headers for follow-up calls.
    """
    staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
    rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
    assert rv.status_code == HTTPStatus.OK
    rv = client.put(
        f"/applications/{application_number}/status",
        json={"status": Application.Status.FULL_REVIEW_APPROVED},
        headers=staff_headers,
    )
    assert rv.status_code == HTTPStatus.OK
    return rv.json, staff_headers
