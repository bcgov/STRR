"""Integration tests for registration search backfill (Postgres + migrations)."""

from datetime import timedelta

import pytest
from strr_api.models import (
    Address,
    Contact,
    PropertyContact,
    PropertyManager,
    Registration,
)

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


def test_backfill_skips_when_enrich_unchanged(
    app, session, random_string, random_integer
):
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json={"registrationType": "HOST"},
        rental_jurisdiction=None,
        include_rental=False,
    )
    backfill_registration_search(app, batch_size=10)
    assert Registration.query.get(reg.id).registration_json == {
        "registrationType": "HOST"
    }


def test_backfill_updates_adds_jurisdiction_from_rental(
    app, session, random_string, random_integer
):
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


def test_backfill_skips_when_jurisdiction_already_matches(
    app, session, random_string, random_integer
):
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


def test_backfill_strips_documents_when_updating(
    app, session, random_string, random_integer
):
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


def test_backfill_reconstructs_json_from_latest_approved_application(
    app, session, random_string, random_integer
):
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
        application_json={
            "registration": {"registrationType": "HOST", "source": "older"}
        },
        decision_date=older,
    )
    attach_application(
        session,
        random_string,
        random_integer,
        reg,
        application_json={
            "registration": {"registrationType": "HOST", "source": "newer"}
        },
        decision_date=newer,
    )
    backfill_registration_search(app, batch_size=10)
    refreshed = Registration.query.get(reg.id)
    assert refreshed.registration_json["source"] == "newer"
    assert refreshed.registration_json["jurisdiction"] == "Reconstructed Jurisdiction"


def test_backfill_platform_skips_without_rental(
    app, session, random_string, random_integer
):
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_type=Registration.RegistrationType.PLATFORM,
        registration_json={"registrationType": "PLATFORM"},
        include_rental=False,
    )
    backfill_registration_search(app, batch_size=10)
    assert Registration.query.get(reg.id).registration_json == {
        "registrationType": "PLATFORM"
    }


def test_backfill_reconstructs_partial_json_and_syncs_all_contact_emails(
    app, session, random_string, random_integer
):
    """Partial registration_json is reconstructed from Application and synced with all HOST emails + unitDetails.jurisdiction."""
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json={"primaryContact": {"emailAddress": "partial@example.com"}},
        rental_jurisdiction="New City",
        include_rental=True,
    )
    attach_application(
        session,
        random_string,
        random_integer,
        reg,
        application_json={
            "registration": {
                "registrationType": "HOST",
                "unitDetails": {"jurisdiction": "Old City"},
                "primaryContact": {"emailAddress": "old-primary@example.com"},
                "secondaryContact": {"emailAddress": "old-secondary@example.com"},
                "propertyManager": {
                    "propertyManagerType": "BUSINESS",
                    "business": {
                        "primaryContact": {"emailAddress": "old-pm@example.com"}
                    },
                },
            }
        },
        decision_date=utc_now(),
    )
    c_primary = Contact(firstname="Pri", lastname="Host", email="primary@example.com")
    c_secondary = Contact(
        firstname="Sec", lastname="Host", email="secondary@example.com"
    )
    c_pm = Contact(firstname="Biz", lastname="PM", email="pm-biz@example.com")
    session.add_all([c_primary, c_secondary, c_pm])
    session.flush()

    reg.rental_property.contacts = [
        PropertyContact(contact_id=c_primary.id, is_primary=True),
        PropertyContact(contact_id=c_secondary.id, is_primary=False),
    ]
    reg.rental_property.property_manager = PropertyManager(
        property_manager_type=PropertyManager.PropertyManagerType.BUSINESS,
        primary_contact_id=c_pm.id,
    )
    session.flush()

    backfill_registration_search(app, batch_size=10)
    refreshed = Registration.query.get(reg.id)
    assert refreshed.registration_json["registrationType"] == "HOST"
    assert refreshed.registration_json["jurisdiction"] == "New City"
    assert refreshed.registration_json["unitDetails"]["jurisdiction"] == "New City"
    assert (
        refreshed.registration_json["primaryContact"]["emailAddress"]
        == "primary@example.com"
    )
    assert (
        refreshed.registration_json["secondaryContact"]["emailAddress"]
        == "secondary@example.com"
    )
    assert refreshed.registration_json["propertyManager"]["business"]["primaryContact"][
        "emailAddress"
    ] == ("pm-biz@example.com")

    # Second run is idempotent (no further changes)
    snapshot_before = dict(refreshed.registration_json)
    backfill_registration_search(app, batch_size=10)
    assert Registration.query.get(reg.id).registration_json == snapshot_before


def test_backfill_syncs_individual_property_manager_email(
    app, session, random_string, random_integer
):
    """Backfiller syncs INDIVIDUAL propertyManager.contact.emailAddress from Contact table."""
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json={
            "registrationType": "HOST",
            "propertyManager": {"contact": {"emailAddress": "old-ind-pm@example.com"}},
        },
        rental_jurisdiction=None,
        include_rental=True,
    )
    c_pm = Contact(firstname="Ind", lastname="PM", email="pm-ind@example.com")
    session.add(c_pm)
    session.flush()
    reg.rental_property.property_manager = PropertyManager(
        property_manager_type=PropertyManager.PropertyManagerType.INDIVIDUAL,
        primary_contact_id=c_pm.id,
    )
    session.flush()

    backfill_registration_search(app, batch_size=10)
    refreshed = Registration.query.get(reg.id)
    assert (
        refreshed.registration_json["propertyManager"]["contact"]["emailAddress"]
        == "pm-ind@example.com"
    )


def test_backfill_processes_multiple_batches(
    app, session, random_string, random_integer
):
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
    assert Registration.query.count() == 5
    assert Registration.query.count() == 5


def test_backfill_syncs_stale_address_and_contact_email(
    app, session, random_string, random_integer
):
    """Backfiller syncs stale unitAddress, jurisdiction, and primaryContact.emailAddress from DB tables."""
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_json={
            "registrationType": "HOST",
            "jurisdiction": "Old City",
            "unitAddress": {"streetName": "Old St", "postalCode": "V0V0V0"},
            "primaryContact": {"emailAddress": "old@example.com"},
        },
        rental_jurisdiction="New City",
        include_rental=True,
    )
    addr = Address(
        country="CA",
        street_number="42",
        street_address="Fresh Blvd",
        city="Victoria",
        province="BC",
        postal_code="V8W 2Y2",
    )
    contact = Contact(firstname="Jane", lastname="Host", email="fresh@example.com")
    session.add_all([addr, contact])
    session.flush()
    reg.rental_property.address_id = addr.id
    reg.rental_property.contacts = [
        PropertyContact(contact_id=contact.id, is_primary=True)
    ]
    session.flush()

    backfill_registration_search(app, batch_size=10)
    refreshed = Registration.query.get(reg.id)
    assert refreshed.registration_json["jurisdiction"] == "New City"
    assert refreshed.registration_json["unitAddress"]["streetName"] == "Fresh Blvd"
    assert refreshed.registration_json["unitAddress"]["postalCode"] == "V8W 2Y2"
    assert (
        refreshed.registration_json["primaryContact"]["emailAddress"]
        == "fresh@example.com"
    )


def test_backfill_reconstructs_platform_when_null(
    app, session, random_string, random_integer
):
    """PLATFORM registration with registration_json=None is saved even if _enrich_registration_json is a no-op."""
    reg = create_host_registration(
        session,
        random_string,
        random_integer,
        registration_type=Registration.RegistrationType.PLATFORM,
        registration_json=None,
        include_rental=False,
    )
    attach_application(
        session,
        random_string,
        random_integer,
        reg,
        application_json={"registration": {"registrationType": "PLATFORM"}},
        decision_date=utc_now(),
    )

    backfill_registration_search(app, batch_size=10)
    assert Registration.query.get(reg.id).registration_json == {
        "registrationType": "PLATFORM"
    }
