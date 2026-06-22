"""Unit tests for event response serialization."""

from datetime import datetime, timezone
from types import SimpleNamespace

from strr_api.responses import Events as EventsResponse


def _make_event_source(details, username="idir-user"):
    return SimpleNamespace(
        event_type="REGISTRATION",
        event_name="REGISTRATION_UPDATED",
        created_date=datetime.now(timezone.utc),
        details=details,
        user=SimpleNamespace(username=username),
    )


def test_events_response_parses_json_details_object():
    source = _make_event_source('{"changes":[{"field":"primaryContact.emailAddress"}]}')

    response = EventsResponse.from_db(source)

    assert response.details == '{"changes":[{"field":"primaryContact.emailAddress"}]}'
    assert isinstance(response.structuredDetails, dict)
    assert response.structuredDetails["changes"][0]["field"] == "primaryContact.emailAddress"


def test_events_response_keeps_plain_string_details():
    source = _make_event_source("Document uploaded: test.pdf")

    response = EventsResponse.from_db(source)

    assert response.details == "Document uploaded: test.pdf"
    assert response.structuredDetails is None


def test_events_response_handles_invalid_json_string():
    source = _make_event_source("{invalid json")

    response = EventsResponse.from_db(source)

    assert response.details == "{invalid json"
    assert response.structuredDetails is None


def test_events_response_handles_none_details_and_no_user():
    source = _make_event_source(None)
    source.user = None

    response = EventsResponse.from_db(source)

    assert response.details is None
    assert response.structuredDetails is None
    assert response.idir is None
