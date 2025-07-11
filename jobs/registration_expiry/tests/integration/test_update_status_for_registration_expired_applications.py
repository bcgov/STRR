import json

from sqlalchemy import text
from strr_api.models import db

from registration_expiry.job import update_status_for_registration_expired_applications


def test_update_status_for_registration_active_applications(app):
    db.session.execute(text("DELETE FROM events"))
    db.session.execute(text("DELETE FROM application"))
    db.session.execute(text("DELETE FROM registrations_history"))
    db.session.execute(text("DELETE FROM registrations"))
    db.session.execute(text("DELETE FROM users"))
    db.session.commit()

    with open("test_registrations.json") as f:
        data = json.load(f)

    for row in data["users"]:
        db.session.execute(
            text(
                "INSERT INTO users (id, firstname, lastname) VALUES (:id, :firstname, :lastname)"
            ),
            row,
        )
    for row in data["registrations"]:
        db.session.execute(
            text(
                """
                INSERT INTO registrations (
                    id, registration_type, registration_number,
                    sbc_account_id, status, start_date, expiry_date,
                    updated_date, user_id, version
                ) VALUES (
                    :id, :registration_type, :registration_number,
                    :sbc_account_id, :status, :start_date, :expiry_date,
                    :updated_date, :user_id, :version
                )
            """
            ),
            row,
        )
    db.session.commit()

    # Run the function
    update_status_for_registration_expired_applications(app)

    # Now assert that expired registrations were updated
    result = db.session.execute(
        text("SELECT COUNT(*) FROM registrations WHERE status = 'EXPIRED'")
    ).scalar_one()
    assert result == 4, "Expected four registration to be marked as EXPIRED"

    result = db.session.execute(
        text("SELECT COUNT(*) FROM registrations WHERE status = 'ACTIVE'")
    ).scalar_one()
    assert result == 1, "Expected one registration to be marked as ACTIVE"


def test_cancelled_registrations_update_status(app):
    db.session.execute(text("DELETE FROM events"))
    db.session.execute(text("DELETE FROM application"))
    db.session.execute(text("DELETE FROM registrations_history"))
    db.session.execute(text("DELETE FROM registrations"))
    db.session.execute(text("DELETE FROM users"))
    db.session.commit()

    with open("test_registrations.json") as f:
        data = json.load(f)

    for row in data["users"]:
        db.session.execute(
            text(
                "INSERT INTO users (id, firstname, lastname) VALUES (:id, :firstname, :lastname)"
            ),
            row,
        )
    for row in data["registrations"]:
        db.session.execute(
            text(
                """
                INSERT INTO registrations (
                    id, registration_type, registration_number,
                    sbc_account_id, status, start_date, expiry_date,
                    updated_date, user_id, version
                ) VALUES (
                    :id, :registration_type, :registration_number,
                    :sbc_account_id, :status, :start_date, :expiry_date,
                    :updated_date, :user_id, :version
                )
            """
            ),
            row,
        )
    db.session.commit()

    # assert that a cancelled registration was insterted
    result_before = db.session.execute(
        text("SELECT COUNT(*) FROM registrations WHERE status = 'CANCELLED'")
    ).scalar_one()
    assert result_before == 1, "Expected one registration to be marked as CANCELLED"

    # Run the function
    update_status_for_registration_expired_applications(app)

    # assert that registrations were updated to expired
    result = db.session.execute(
        text("SELECT COUNT(*) FROM registrations WHERE status = 'EXPIRED'")
    ).scalar_one()
    assert result == 4, "Expected four registration to be marked as EXPIRED"

    # assert that cancelled registrations were updated
    result = db.session.execute(
        text("SELECT COUNT(*) FROM registrations WHERE status = 'CANCELLED'")
    ).scalar_one()
    assert result == 0, "Expected zero registration to be marked as CANCELLED"


def test_suspended_registrations_update_status(app):
    db.session.execute(text("DELETE FROM events"))
    db.session.execute(text("DELETE FROM application"))
    db.session.execute(text("DELETE FROM registrations_history"))
    db.session.execute(text("DELETE FROM registrations"))
    db.session.execute(text("DELETE FROM users"))
    db.session.commit()

    with open("test_registrations.json") as f:
        data = json.load(f)

    for row in data["users"]:
        db.session.execute(
            text(
                "INSERT INTO users (id, firstname, lastname) VALUES (:id, :firstname, :lastname)"
            ),
            row,
        )
    for row in data["registrations"]:
        db.session.execute(
            text(
                """
                INSERT INTO registrations (
                    id, registration_type, registration_number,
                    sbc_account_id, status, start_date, expiry_date,
                    updated_date, user_id, version
                ) VALUES (
                    :id, :registration_type, :registration_number,
                    :sbc_account_id, :status, :start_date, :expiry_date,
                    :updated_date, :user_id, :version
                )
            """
            ),
            row,
        )
    db.session.commit()

    # assert that a suspended registration was insterted
    result_before = db.session.execute(
        text("SELECT COUNT(*) FROM registrations WHERE status = 'SUSPENDED'")
    ).scalar_one()
    assert result_before == 1, "Expected one registration to be marked as SUSPENDED"

    # Run the function
    update_status_for_registration_expired_applications(app)

    # assert that registrations were updated
    result = db.session.execute(
        text("SELECT COUNT(*) FROM registrations WHERE status = 'EXPIRED'")
    ).scalar_one()
    assert result == 4, "Expected four registration to be marked as EXPIRED"

    # assert that suspended registrations were updated
    result = db.session.execute(
        text("SELECT COUNT(*) FROM registrations WHERE status = 'SUSPENDED'")
    ).scalar_one()
    assert result == 0, "Expected zero registration to be marked as SUSPENDED"
