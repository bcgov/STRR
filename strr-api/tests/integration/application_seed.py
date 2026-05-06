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
