
from provisional_approval.job import get_applications_in_full_review_status
from sqlalchemy import text
from strr_api.models import db
import json


def test_get_applications_in_full_review_status(app):
    db.session.execute(text("DELETE FROM application"))
    db.session.execute(text("DELETE FROM registrations"))
    db.session.execute(text("DELETE FROM registrations_history"))
    db.session.execute(text("DELETE FROM users"))
    db.session.commit()

    with open("test_registrations.json") as f:
        data = json.load(f)

    for row in data["users"]:
        db.session.execute(
            text(
                "INSERT INTO users (id, firstname, lastname) VALUES (:id, :firstname, :lastname)"),
            row
        )
    for row in data["application"]:
        row["application_json"] = json.dumps(row["application_json"])
        db.session.execute(
            text("""
                INSERT INTO application (
                    id, application_json, application_date, type, status, invoice_id, payment_status_code, payment_completion_date, payment_account, submitter_id, application_number, created, registration_type
                ) VALUES (
                    :id, :application_json, :application_date, :type, :status, :invoice_id, :payment_status_code, :payment_completion_date, :registration_id, :submitter_id, :application_number, :created, :registration_type
                )
            """), row
        )
    db.session.commit()

    # Run the function
    applications = get_applications_in_full_review_status(app).all()

    # Now assert that expired registrations were updated
    result = db.session.execute(
        text("SELECT COUNT(*) FROM application WHERE application_json->'registration'->>'prExemptionType' = 'FRACTIONAL_OWNERSHIP'")
    ).scalar_one()
    assert result == 1, "Expected one application"
    assert len(
        applications) == 2, "expect function to return an array with two objects"
