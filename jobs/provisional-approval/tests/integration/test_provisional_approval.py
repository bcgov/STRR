from provisional_approval.job import get_applications_in_full_review_status, process_applications
from sqlalchemy import text
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.models.rental import Registration
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

    # assert that an application with CO_OWN exists in the database
    result = db.session.execute(
        text("SELECT COUNT(*) FROM application WHERE application_json->'registration'->'unitDetails'->>'ownershipType' = 'CO_OWN'")
    ).scalar_one()
    assert result == 1, "Expected one application"

    # Run the function
    applications = get_applications_in_full_review_status(app).all()

    # assert that only one application is returned
    assert len(
        applications) == 1, "expect function to return an array with one object"

    # assert that the application does not have CO_OWN
    pr_exemption_type = applications[0].application_json.get(
        "registration", {}).get("unitDetails", {}).get("ownershipType")
    assert pr_exemption_type != "CO_OWN", "Expected ownershipType not to be 'CO_OWN'"


def test_platform_applications_not_processed(app):
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

    # assert that an application with registration_type.PLATFORM exists in the database
    result = db.session.execute(
        text(
            f"SELECT COUNT(*) FROM application WHERE registration_type = 'PLATFORM'")
    ).scalar_one()
    assert result == 1, "Expected one application"

    # Run the function
    applications = get_applications_in_full_review_status(app).all()

    # assert that only one application is returned
    assert len(
        applications) == 1, "expect function to return an array with one object"

    # assert that the application does not have registration_type.PLATFORM
    registrationType = applications[0].registration_type.value
    assert registrationType != "PLATFORM", "Expected RegistrationType not to be PLATFORM"


def test_strata_hotel_applications_not_processed(app):
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

    # assert that an application with registration_type.PLATFORM exists in the database
    result = db.session.execute(
        text(
            f"SELECT COUNT(*) FROM application WHERE registration_type = 'STRATA_HOTEL'")
    ).scalar_one()
    assert result == 1, "Expected one application"

    # Run the function
    applications = get_applications_in_full_review_status(app).all()

    # assert that only one application is returned
    assert len(
        applications) == 1, "expect function to return an array with one object"

    # assert that the application does not have registration_type.STRATA_HOTEL
    registrationType = applications[0].registration_type.value
    assert registrationType != "STRATA_HOTEL", "Expected RegistrationType not to be STRATA_HOTEL"


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

    # assert that zero applications status are PROVISIONAL_REVIEW
    result = db.session.execute(
        text(
            f"SELECT COUNT(*) FROM application WHERE status = '{Application.Status.PROVISIONAL_REVIEW.value}'")
    ).scalar_one()
    assert result == 0, "Expected zero application to have status 'PROVISIONAL_REVIEW'"

    # Run the function
    applications = get_applications_in_full_review_status(app)
    process_applications(applications)

    # assert that applications status were updated to PROVISIONAL_REVIEW
    result = db.session.execute(
        text(
            f"SELECT COUNT(*) FROM application WHERE status = '{Application.Status.PROVISIONAL_REVIEW.value}'")
    ).scalar_one()
    assert result == 1, "Expected one application to have status 'PROVISIONAL_REVIEW'"
