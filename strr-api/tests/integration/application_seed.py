"""Seed applications (and optional events) for integration tests."""

from __future__ import annotations

import copy
import random
from typing import Any

from sqlalchemy.orm import Session

from strr_api.enums.enum import ApplicationType
from strr_api.models import Application, Events, Registration
from tests.integration.helpers import load_mock_json


def seed_listable_application(
    session: Session,
    *,
    account_id: int,
    submitter_user_id: int,
    registration_id: int | None,
    application_number: str,
    status: str,
    application_json: dict[str, Any] | None = None,
    invoice_id: int | None = None,
    payment_status_code: str | None = None,
) -> dict[str, Any]:
    """Insert an ``Application`` with ``payment_account`` set for list/GET by account."""
    body = copy.deepcopy(application_json) if application_json is not None else load_mock_json("host_registration.json")
    app = Application(
        application_number=application_number,
        application_json=body,
        type=ApplicationType.REGISTRATION.value,
        registration_type=Registration.RegistrationType.HOST,
        status=status,
        registration_id=registration_id,
        submitter_id=submitter_user_id,
        payment_account=str(account_id),
        invoice_id=invoice_id,
        payment_status_code=payment_status_code,
    )
    session.add(app)
    session.flush()
    return {
        "application_id": app.id,
        "application_number": application_number,
        "registration_id": registration_id,
    }


def generate_application_number() -> str:
    """14-digit application number (matches production style)."""
    return "".join(random.choices("0123456789", k=14))


def seed_draft_application(
    session: Session,
    *,
    account_id: int,
    submitter_user_id: int,
    registration_id: int | None,
    application_number: str,
    application_type: str = ApplicationType.REGISTRATION.value,
    application_json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Insert a DRAFT ``Application`` (e.g. delete / draft-save flows)."""
    body = copy.deepcopy(application_json) if application_json is not None else load_mock_json("host_registration.json")
    header = body.setdefault("header", {})
    header["applicationType"] = application_type
    if registration_id is not None:
        header["registrationId"] = registration_id
    app = Application(
        application_number=application_number,
        application_json=body,
        type=application_type,
        registration_type=Registration.RegistrationType.HOST,
        status=Application.Status.DRAFT.value,
        registration_id=registration_id,
        submitter_id=submitter_user_id,
        payment_account=str(account_id),
    )
    session.add(app)
    session.flush()
    return {
        "application_id": app.id,
        "application_number": application_number,
        "registration_id": registration_id,
    }


def host_renewal_application_json(
    registration_id: int,
    *,
    base_json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Full ``POST /applications`` JSON for a HOST renewal (draft or final).

    Used by integration and unit tests to avoid repeating header + host body wiring.
    ``base_json`` is deep-copied when provided (e.g. an already-loaded registration fixture).
    """
    body = copy.deepcopy(base_json) if base_json is not None else load_mock_json("host_registration.json")
    body["header"] = {
        "applicationType": ApplicationType.RENEWAL.value,
        "registrationId": registration_id,
    }
    return body


def count_renewal_applications_for_account_registration(
    session: Session,
    *,
    account_id: int,
    registration_id: int,
) -> int:
    """Count renewal applications for this account + registration (duplicate-guard scope)."""
    return (
        session.query(Application)
        .filter(
            Application.registration_id == registration_id,
            Application.type == ApplicationType.RENEWAL.value,
            Application.payment_account == str(account_id),
        )
        .count()
    )


def seed_flushed_host_renewal_draft(
    session: Session,
    *,
    account_id: int,
    submitter_user_id: int,
    registration_id: int,
    application_number: str | None = None,
    application_json: dict[str, Any] | None = None,
) -> str:
    """Insert a HOST renewal DRAFT and ``flush``. Returns the ``application_number`` used."""
    num = application_number or generate_application_number()
    seed_draft_application(
        session,
        account_id=account_id,
        submitter_user_id=submitter_user_id,
        registration_id=registration_id,
        application_number=num,
        application_type=ApplicationType.RENEWAL.value,
        application_json=application_json,
    )
    session.flush()
    return num


def seed_terminal_host_renewal(
    session: Session,
    *,
    account_id: int,
    submitter_user_id: int,
    registration_id: int,
    application_number: str | None = None,
    application_json: dict[str, Any] | None = None,
) -> str:
    """Insert a terminal (``FULL_REVIEW_APPROVED``) HOST renewal row and ``flush``; returns ``application_number``."""
    num = application_number or generate_application_number()
    body = host_renewal_application_json(registration_id, base_json=application_json)
    terminal_app = Application(
        application_number=num,
        application_json=body,
        type=ApplicationType.RENEWAL.value,
        registration_type=Registration.RegistrationType.HOST,
        status=Application.Status.FULL_REVIEW_APPROVED.value,
        registration_id=registration_id,
        submitter_id=submitter_user_id,
        payment_account=str(account_id),
    )
    session.add(terminal_app)
    session.flush()
    return num


def seed_applicant_visible_application_event(
    session: Session,
    application_id: int,
    *,
    user_id: int | None = None,
) -> dict[str, Any]:
    """Insert an application event visible to applicants (``GET .../events``)."""
    ev = Events(
        application_id=application_id,
        user_id=user_id,
        event_type=Events.EventType.APPLICATION,
        event_name=Events.EventName.APPLICATION_SUBMITTED,
        details="Integration seed",
        visible_to_applicant=True,
    )
    session.add(ev)
    session.flush()
    return {"event_id": ev.id, "application_id": application_id}
