"""Integration tests for registration search backfill (Postgres + migrations)."""

from datetime import timedelta

import pytest
from strr_api.models import Registration

from backfiller.job import backfill_registration_search
from tests.fixtures.registration_factories import (
    attach_application,
    create_host_registration,
    create_host_registration_null_json,
    utc_now,
)

pytestmark = pytest.mark.integration


def test_backfill_runs_on_empty_database(session, app):
    """Smoke: batch loop completes with zero registrations.

    ``session`` is required so ``db.session`` is bound to the test DB (same as other
    integration tests); ``app`` alone does not install the transactional session.
    """
    assert Registration.query.count() == 0
    backfill_registration_search(app, batch_size=10)
    assert Registration.query.count() == 0


def test_backfill_runs_with_seeded_registration(session, app, setup_parents):
    """Smoke: backfill completes when registrations exist (ORM path)."""
    assert Registration.query.count() == 1
    backfill_registration_search(app, batch_size=10)
    assert Registration.query.get(setup_parents["registration_id"]) is not None


def test_backfill_skips_when_enrich_unchanged(app, session, random_string, random_integer):
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json={"registrationType": "HOST"},
        rental_jurisdiction=None,
        include_rental=True,
    )
    backfill_registration_search(app, batch_size=10)
    assert Registration.query.get(reg.id).registration_json == {"registrationType": "HOST"}


def test_backfill_updates_adds_jurisdiction_from_rental(app, session, random_string, random_integer):
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json={"registrationType": "HOST"},
        rental_jurisdiction="City of Testville",
        include_rental=True,
    )
    backfill_registration_search(app, batch_size=10)
    refreshed = Registration.query.get(reg.id)
    assert refreshed.registration_json["jurisdiction"] == "City of Testville"
    assert refreshed.registration_json["registrationType"] == "HOST"


def test_backfill_skips_when_jurisdiction_already_matches(app, session, random_string, random_integer):
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json={
            "registrationType": "HOST",
            "jurisdiction": "Same Jurisdiction",
        },
        rental_jurisdiction="Same Jurisdiction",
        include_rental=True,
    )
    backfill_registration_search(app, batch_size=10)
    refreshed = Registration.query.get(reg.id)
    assert refreshed.registration_json["jurisdiction"] == "Same Jurisdiction"
    assert refreshed.registration_json["registrationType"] == "HOST"


def test_backfill_strips_documents_when_updating(app, session, random_string, random_integer):
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json={
            "registrationType": "HOST",
            "documents": [{"fileName": "lease.pdf"}],
        },
        rental_jurisdiction="Metro Region",
        include_rental=True,
    )
    backfill_registration_search(app, batch_size=10)
    refreshed = Registration.query.get(reg.id)
    assert "documents" not in refreshed.registration_json
    assert refreshed.registration_json["jurisdiction"] == "Metro Region"


@pytest.mark.parametrize(
    "application_json, decision_date",
    [
        pytest.param(
            {"registration": {"registrationType": "HOST"}},
            None,
            id="no_decision_date",
        ),
        pytest.param({"other": True}, utc_now(), id="no_registration_section"),
    ],
)
def test_backfill_skips_when_null_json_cannot_reconstruct(
    app, session, random_string, random_integer, application_json, decision_date
):
    """No usable approved-application payload → registration_json stays NULL."""
    reg = create_host_registration_null_json(session, random_string, random_integer)
    attach_application(
        session,
        random_string,
        random_integer,
        reg,
        application_json=application_json,
        decision_date=decision_date,
    )
    backfill_registration_search(app, batch_size=10)
    assert Registration.query.get(reg.id).registration_json is None


def test_backfill_reconstructs_json_from_latest_approved_application(app, session, random_string, random_integer):
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json=None,
        rental_jurisdiction="Reconstructed Jurisdiction",
        include_rental=True,
    )
    older = utc_now() - timedelta(days=7)
    newer = utc_now()
    attach_application(
        session,
        random_string,
        random_integer,
        reg,
        application_json={"registration": {"registrationType": "HOST", "source": "older"}},
        decision_date=older,
    )
    attach_application(
        session,
        random_string,
        random_integer,
        reg,
        application_json={"registration": {"registrationType": "HOST", "source": "newer"}},
        decision_date=newer,
    )
    backfill_registration_search(app, batch_size=10)
    refreshed = Registration.query.get(reg.id)
    assert refreshed.registration_json["source"] == "newer"
    assert refreshed.registration_json["jurisdiction"] == "Reconstructed Jurisdiction"


def test_backfill_platform_skips_without_rental(app, session, random_string, random_integer):
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_type=Registration.RegistrationType.PLATFORM,
        registration_json={"registrationType": "PLATFORM"},
        include_rental=False,
    )
    backfill_registration_search(app, batch_size=10)
    assert Registration.query.get(reg.id).registration_json == {"registrationType": "PLATFORM"}


def test_backfill_processes_multiple_batches(app, session, random_string, random_integer):
    for _ in range(5):
        create_host_registration(
            session,
            random_string,
            random_integer,
            registration_json={"registrationType": "HOST"},
            rental_jurisdiction=None,
            include_rental=True,
        )
    assert Registration.query.count() == 5
    backfill_registration_search(app, batch_size=2)
    assert Registration.query.count() == 5
