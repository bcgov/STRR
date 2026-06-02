# Copyright © 2024 Province of British Columbia
"""Shared helpers for examiner notes API tests (unit and integration)."""

from __future__ import annotations

from http import HTTPStatus
from typing import Any

from werkzeug.test import TestResponse

APPLICATION = "application"
REGISTRATION = "registration"


def response_json(rv: TestResponse) -> dict[str, Any] | list[Any] | Any:
    """Normalize Flask test client vs integration response JSON access."""
    if hasattr(rv, "get_json"):
        return rv.get_json()
    return rv.json


def assert_notes_role_denied(rv: TestResponse) -> None:
    """JWT role decorator rejects non-examiner/non-investigator callers."""
    assert rv.status_code == HTTPStatus.UNAUTHORIZED
    assert response_json(rv)["code"] == "missing_a_valid_role"


def request_notes(client, method: str, url: str, headers, *, body: str | None = None) -> TestResponse:
    if method == "GET":
        return client.get(url, headers=headers)
    return client.post(url, json={"text": body if body is not None else "note"}, headers=headers)


def application_notes_url(application) -> str:
    """``application`` may be an application number string or an ``Application`` model."""
    number = application.application_number if hasattr(application, "application_number") else application
    return f"/applications/{number}/notes"


def registration_notes_url(registration_id: int) -> str:
    return f"/registrations/{registration_id}/notes"


def notes_url(resource: str, *, application=None, registration_id: int | None = None) -> str:
    """Build resource-specific notes URL."""
    if resource == APPLICATION:
        return application_notes_url(application)
    return registration_notes_url(registration_id)


def assert_message_contains(response: TestResponse, *parts: str) -> None:
    message = response_json(response)["message"]
    for part in parts:
        assert part in message


def assert_registration_notes_roundtrip(client, registration_id: int, headers, body: str) -> None:
    url = registration_notes_url(registration_id)
    rv = request_notes(client, "POST", url, headers, body=body)
    assert rv.status_code == HTTPStatus.CREATED

    rv = request_notes(client, "GET", url, headers)
    assert rv.status_code == HTTPStatus.OK
    data = response_json(rv)
    assert data["registrationId"] == registration_id
    assert any(n["text"] == body for n in data["notes"])


def assert_application_notes_roundtrip(client, application_number: str, headers, note_body: str) -> None:
    url = application_notes_url(application_number)
    rv = request_notes(client, "GET", url, headers)
    assert rv.status_code == HTTPStatus.OK
    data = response_json(rv)
    assert data["applicationNumber"] == application_number
    assert data["truncated"] is False
    assert data["notes"] == []

    rv = request_notes(client, "POST", url, headers, body=note_body)
    assert rv.status_code == HTTPStatus.CREATED
    note = response_json(rv)
    assert note["text"] == note_body
    assert "authorUserId" in note
    assert "authorUsername" in note
    note_id = note["id"]

    rv = request_notes(client, "GET", url, headers)
    assert rv.status_code == HTTPStatus.OK
    listed = response_json(rv)
    assert len(listed["notes"]) == 1
    assert listed["notes"][0]["id"] == note_id
