
from provisional_approval.job import get_applications_in_full_review_status, process_applications
from sqlalchemy import text
from strr_api.models import db
from strr_api.models.application import Application
import json


def test_get_applications_in_full_review_status(app):
    db.session.execute(text("DELETE FROM property_contacts"))
    db.session.execute(text("DELETE FROM property_listings"))
    db.session.execute(text("DELETE FROM rental_properties"))
    db.session.execute(text("DELETE FROM events"))
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

    # assert that application an with FRACTIONAL_OWNERSHIP exists in the database
    result = db.session.execute(
        text("SELECT COUNT(*) FROM application WHERE application_json->'registration'->>'prExemptionType' = 'FRACTIONAL_OWNERSHIP'")
    ).scalar_one()
    assert result == 1, "Expected one application"

    # assert that only one application is returned
    assert len(
        applications) == 1, "expect function to return an array with one object"

    # assert that the application does not have FRACTIONAL_OWNERSHIP
    pr_exemption_type = applications[0].registration.get(
        "prExemptionType") if applications[0].registration else None
    assert pr_exemption_type != "FRACTIONAL_OWNERSHIP", "Expected prExemptionType not to be 'FRACTIONAL_OWNERSHIP'"


def test_process_applications(app):
    db.session.execute(text("DELETE FROM property_contacts"))
    db.session.execute(text("DELETE FROM property_listings"))
    db.session.execute(text("DELETE FROM rental_properties"))
    db.session.execute(text("DELETE FROM events"))
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
    applications = get_applications_in_full_review_status(app)
    process_applications(applications)

    # assert that applications status were updated to PROVISIONAL_REVIEW
    result = db.session.execute(
        text(
            f"SELECT COUNT(*) FROM application WHERE status = '{Application.Status.PROVISIONAL_REVIEW.value}'")
    ).scalar_one()
    assert result == 1, "Expected one application to have status 'PROVISIONAL_REVIEW'"
