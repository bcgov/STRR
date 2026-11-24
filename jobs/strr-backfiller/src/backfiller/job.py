# Copyright © 2025 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Backfiller job."""

import logging
import os
import time
from copy import deepcopy

from flask import Flask
from sentry_sdk.integrations.logging import LoggingIntegration
from sqlalchemy import case, extract, func, or_
from strr_api.enums.enum import StrataHotelCategory
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.models.rental import (
    Document,
    PropertyManager,
    Registration,
    RentalProperty,
)
from strr_api.models.strata_hotels import StrataHotel
from strr_api.responses.RegistrationSerializer import RegistrationSerializer
from strr_api.services import ApprovalService, RegistrationService
from strr_api.services.gcp_storage_service import GCPStorageService

from backfiller.config import CONFIGURATION
from backfiller.utils.logging import setup_logging

setup_logging(os.path.join(os.path.abspath(os.path.dirname(__file__)), "logging.conf"))

SENTRY_LOGGING = LoggingIntegration(event_level=logging.ERROR)  # send errors as events


def create_app(run_mode=os.getenv("FLASK_ENV", "production")):
    """Return a configured Flask App using the Factory method."""
    app = Flask(__name__)
    app.config.from_object(CONFIGURATION[run_mode])
    db.init_app(app)
    register_shellcontext(app)
    return app


def register_shellcontext(app):
    """Register shell context objects."""

    def shell_context():
        """Shell context objects."""
        return {"app": app}

    app.shell_context_processor(shell_context)


def backfill_jurisdiction(app):
    """Backfill jurisdiction data."""
    host_registrations = (
        Registration.query.join(RentalProperty)
        .filter(RentalProperty.jurisdiction.is_(None))
        .all()
    )
    for registration in host_registrations:
        try:
            app.logger.info(f"Processing registration {str(registration.id)}")
            address = registration.rental_property.address
            address_line_1 = ""
            if unit_number := address.unit_number:
                address_line_1 = f"{unit_number}-"
            address_line_1 = (
                f"{address_line_1}{address.street_number} {address.street_address}"
            )
            address_line_2 = {address.street_address_additional}
            address = (
                f"{address_line_1} {address_line_2}, {address.city}, {address.province}"
            )
            str_data = ApprovalService.getSTRDataForAddress(address=address)
            if not str_data:
                app.logger.info(
                    f"Could not get the requirements for registration {registration.id}, Address: {address}"
                )
            else:
                rental_property = registration.rental_property
                rental_property.pr_required = str_data.get(
                    "isPrincipalResidenceRequired"
                )
                rental_property.bl_required = str_data.get("isBusinessLicenceRequired")
                rental_property.jurisdiction = str_data.get("organizationNm")
                rental_property.strr_exempt = str_data.get("isStraaExempt")
                rental_property.save()
        except Exception as err:  # pylint: disable=broad-except
            app.logger.error(f"Unexpected error: {str(err)}")


def backfill_strata_hotel_category(app):
    """Backfill strata hotel category from application data."""

    # Find all strata hotels without a category
    strata_hotels_without_category = StrataHotel.query.filter(
        StrataHotel.category.is_(None)
    ).all()

    app.logger.info(
        f"Found {len(strata_hotels_without_category)} strata hotels without category"
    )

    updated_count = 0
    failed_count = 0

    for strata_hotel in strata_hotels_without_category:
        try:
            # Get registration via strata_hotel_registrations relationship
            strata_hotel_reg = (
                strata_hotel.strata_hotel_registrations[0]
                if strata_hotel.strata_hotel_registrations
                else None
            )

            if not strata_hotel_reg:
                app.logger.info(
                    f"No registration found for strata hotel {strata_hotel.id}"
                )
                failed_count += 1
                continue

            registration = strata_hotel_reg.registration

            # Find the application that created this registration
            application = Application.query.filter_by(
                registration_id=registration.id
            ).first()

            if not application:
                app.logger.info(
                    f"No application found for registration {registration.id}"
                )
                failed_count += 1
                continue

            # Get category from application_json
            category_str = (
                application.application_json.get("registration", {})
                .get("strataHotelDetails", {})
                .get("category")
            )

            if not category_str:
                app.logger.info(
                    f"No category in application JSON for strata hotel {strata_hotel.id}, "
                    f"application {application.application_number}"
                )
                failed_count += 1
                continue

            try:
                category_enum = StrataHotelCategory[category_str]
                strata_hotel.category = category_enum
                strata_hotel.save()
                app.logger.info(
                    f"Updated strata hotel {strata_hotel.id} with category {category_str}"
                )
                updated_count += 1
            except KeyError:
                app.logger.error(f"Invalid category value: {category_str}")
                failed_count += 1

        except Exception as err:  # pylint: disable=broad-except
            app.logger.error(
                f"Error processing strata hotel {strata_hotel.id}: {str(err)}"
            )
            failed_count += 1

    app.logger.info(
        f"Backfill complete: {updated_count} updated, {failed_count} failed"
    )


def _get_json_from_application(registration, app):
    """Retrieve JSON from the latest application if registration_json is NULL."""
    application = (
        Application.query.filter_by(registration_id=registration.id)
        .filter(Application.decision_date.isnot(None))
        .order_by(Application.decision_date.desc())
        .first()
    )

    if not application or not application.application_json:
        app.logger.warning(
            f"Registration {registration.id} has no registration_json and no approved application found, skipping"
        )
        return None

    original_json = application.application_json.get("registration")
    if not original_json:
        app.logger.warning(
            f"Registration {registration.id} application {application.application_number} "
            f"has no 'registration' section in application_json, skipping"
        )
        return None

    app.logger.info(
        f"Registration {registration.id} has no registration_json, "
        f"reconstructing from latest approved application {application.application_number} "
        f"(status: {application.status}, decision_date: {application.decision_date})"
    )
    return original_json


def _sync_address_and_jurisdiction(synced: dict, rental: RentalProperty) -> None:
    """Sync unitAddress and jurisdiction from RentalProperty into registration_json."""
    if rental.address:
        unit_addr = RegistrationSerializer._serialize_unit_address(  # pylint: disable=protected-access
            rental
        )
        existing_addr = (
            synced.get("unitAddress")
            if isinstance(synced.get("unitAddress"), dict)
            else {}
        )
        synced["unitAddress"] = {**existing_addr, **unit_addr}

    if rental.jurisdiction:
        synced["jurisdiction"] = rental.jurisdiction
        if isinstance(synced.get("unitDetails"), dict):
            synced["unitDetails"]["jurisdiction"] = rental.jurisdiction


def _sync_contact_emails(synced: dict, rental: RentalProperty) -> None:
    """Sync primary and secondary host contact emails into registration_json."""
    for prop_contact in rental.contacts or []:
        if not (prop_contact.contact and prop_contact.contact.email):
            continue
        section = "primaryContact" if prop_contact.is_primary else "secondaryContact"
        if not isinstance(synced.get(section), dict):
            synced[section] = {}
        synced[section]["emailAddress"] = prop_contact.contact.email


def _sync_property_manager_email(synced: dict, rental: RentalProperty) -> None:
    """Sync property manager primary contact email into registration_json."""
    pm = rental.property_manager
    if not (pm and pm.primary_contact and pm.primary_contact.email):
        return
    pm_dict = synced.setdefault("propertyManager", {})
    if not isinstance(pm_dict, dict):
        pm_dict = synced["propertyManager"] = {}
    if pm.property_manager_type == PropertyManager.PropertyManagerType.BUSINESS:
        pm_dict.setdefault("business", {}).setdefault("primaryContact", {})[
            "emailAddress"
        ] = pm.primary_contact.email
    else:
        pm_dict.setdefault("contact", {})["emailAddress"] = pm.primary_contact.email


def _sync_normalized_fields_to_json(
    enriched_json: dict, registration: Registration
) -> dict:
    """Sync normalized DB fields (unitAddress, jurisdiction, contact emails) into registration_json."""
    rental = getattr(registration, "rental_property", None)
    if not isinstance(rental, RentalProperty):
        return enriched_json

    synced = deepcopy(enriched_json)
    _sync_address_and_jurisdiction(synced, rental)
    _sync_contact_emails(synced, rental)
    _sync_property_manager_email(synced, rental)
    return synced


def _process_single_registration(registration, app, stats):
    """Process a single registration for backfill."""
    try:
        stats["total_processed"] += 1

        existing_json = registration.registration_json
        base_json = existing_json
        is_partial = isinstance(existing_json, dict) and not existing_json.get(
            "registrationType"
        )
        if base_json is None or is_partial:
            reconstructed = _get_json_from_application(registration, app)
            if reconstructed is not None:
                base_json = reconstructed
            elif base_json is None:
                stats["total_skipped"] += 1
                return

        enriched_json = RegistrationService._enrich_registration_json(  # pylint: disable=protected-access
            base_json, registration
        )
        enriched_json = _sync_normalized_fields_to_json(enriched_json, registration)

        if enriched_json != existing_json:
            registration.registration_json = enriched_json
            registration.save()
            stats["total_updated"] += 1
            app.logger.info(
                f"Updated registration {registration.id} (type: {registration.registration_type})"
            )
        else:
            stats["total_skipped"] += 1

    except Exception as err:  # pylint: disable=broad-except
        stats["total_errors"] += 1
        app.logger.error(f"Error processing registration {registration.id}: {str(err)}")


def _log_progress(app, stats, total_count):
    """Log progress."""
    if stats["total_processed"] % 500 == 0:
        app.logger.info(
            f"Progress: {stats['total_processed']}/{total_count} "
            f"(Updated: {stats['total_updated']}, "
            f"Skipped: {stats['total_skipped']}, "
            f"Errors: {stats['total_errors']})"
        )


def backfill_registration_search(app, batch_size=100):
    """Backfill registration_json for full text search."""

    stats = {
        "total_processed": 0,
        "total_updated": 0,
        "total_skipped": 0,
        "total_errors": 0,
    }

    try:
        query = Registration.query.order_by(Registration.id)
        total_count = query.count()
        app.logger.info(
            f"Starting registration search backfill for {total_count} registrations"
        )

        offset = 0
        while True:
            batch = query.limit(batch_size).offset(offset).all()
            if not batch:
                break

            app.logger.info(
                f"Processing batch at offset {offset} ({len(batch)} records)"
            )
            for registration in batch:
                _process_single_registration(registration, app, stats)

            offset += batch_size
            _log_progress(app, stats, total_count)

    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Fatal error during registration search backfill: {str(err)}")

    app.logger.info("--------------------------------------")
    app.logger.info("Registration search backfill completed!")
    app.logger.info(f"Total processed: {stats['total_processed']}")
    app.logger.info(f"Total updated: {stats['total_updated']}")
    app.logger.info(f"Total skipped: {stats['total_skipped']}")
    app.logger.info(f"Total errors: {stats['total_errors']}")


def backfill_interaction_recipients(app, batch_size=1000):
    """Backfill interaction_recipients from customer_interactions meta_data JSONB."""
    from strr_api.services.interaction import InteractionService

    app.logger.info("Starting interaction recipients backfill...")
    stats = InteractionService.backfill_interaction_recipients(batch_size=batch_size)
    app.logger.info("--------------------------------------")
    app.logger.info("Interaction recipients backfill completed!")
    app.logger.info(f"Total processed: {stats['total_processed']}")
    app.logger.info(f"Total recipients created: {stats['total_recipients_created']}")
    app.logger.info(f"Total skipped: {stats['total_skipped']}")
    app.logger.info(f"Total errors: {stats['total_errors']}")


def _process_document_added_on_batch(rows, timestamps, sample_missing_keys):
    """Apply GCS timestamps for a single keyset batch of documents."""
    updates = []
    batch_missing = 0
    for doc_id, path in rows:
        if (ts := timestamps.get(path)) is not None:
            updates.append({"id": doc_id, "added_on": ts})
        else:
            batch_missing += 1
            if len(sample_missing_keys) < 5:
                sample_missing_keys.append(path)

    if updates:
        db.session.bulk_update_mappings(Document, updates)
        db.session.commit()
    return len(updates), batch_missing


def _log_document_added_on_summary(app):
    """Log post-backfill verification counts for documents.added_on."""
    summary = db.session.query(
        func.count(Document.id).label("total_docs"),
        func.count(case((Document.added_on.is_(None), 1))).label("null_added_on"),
        func.count(
            case(
                (
                    (Document.added_on.isnot(None))
                    & (extract("minute", Document.added_on) == 0)
                    & (extract("second", Document.added_on) == 0),
                    1,
                )
            )
        ).label("remaining_on_hour"),
    ).one()
    precise_count = (
        summary.total_docs - summary.null_added_on - summary.remaining_on_hour
    )
    app.logger.info(
        "Post-backfill verification: total_docs=%d precise_timestamps=%d "
        "null_added_on=%d remaining_on_hour=%d",
        summary.total_docs,
        precise_count,
        summary.null_added_on,
        summary.remaining_on_hour,
    )


def backfill_document_added_on(app, batch_size=1000):
    """Backfill documents.added_on from GCS blob.time_created using list_blobs + keyset batching."""
    job_start = time.perf_counter()
    processed_count = 0
    updated_count = 0
    missing_in_gcs_count = 0
    sample_missing_keys: list[str] = []
    try:
        bucket_id = app.config.get("GCP_CS_BUCKET_ID")
        gcs_start = time.perf_counter()
        timestamps = GCPStorageService.list_registration_document_creation_times()
        app.logger.info(
            "Loaded %d object timestamps from GCS bucket=%s in %.2fs.",
            len(timestamps),
            bucket_id,
            time.perf_counter() - gcs_start,
        )
        if not timestamps:
            app.logger.warning(
                "No timestamps returned from GCS bucket=%s; skipping DB update.",
                bucket_id,
            )
            return 0

        missing_precision = or_(
            Document.added_on.is_(None),
            (
                (extract("minute", Document.added_on) == 0)
                & (extract("second", Document.added_on) == 0)
            ),
        )
        last_id = 0
        batch_num = 0
        while True:
            rows = (
                db.session.query(Document.id, Document.path)
                .filter(
                    Document.id > last_id,
                    Document.path.isnot(None),
                    missing_precision,
                )
                .order_by(Document.id)
                .limit(batch_size)
                .all()
            )
            if not rows:
                break

            batch_num += 1
            last_id = rows[-1][0]
            processed_count += len(rows)
            batch_updated, batch_missing = _process_document_added_on_batch(
                rows, timestamps, sample_missing_keys
            )
            updated_count += batch_updated
            missing_in_gcs_count += batch_missing
            app.logger.info(
                "Batch %d (last_id=%d): rows=%d updated=%d missing_in_gcs=%d "
                "(cumulative processed=%d updated=%d missing=%d).",
                batch_num,
                last_id,
                len(rows),
                batch_updated,
                batch_missing,
                processed_count,
                updated_count,
                missing_in_gcs_count,
            )

        if sample_missing_keys:
            app.logger.warning(
                "%d documents had no matching blob in GCS (sample keys: %s).",
                missing_in_gcs_count,
                sample_missing_keys,
            )
        _log_document_added_on_summary(app)
    except Exception:  # pylint: disable=broad-except
        db.session.rollback()
        app.logger.exception("Fatal error during document added_on backfill")

    app.logger.info("--------------------------------------")
    app.logger.info(
        "Document added_on backfill completed in %.2fs: processed=%d updated=%d missing_in_gcs=%d",
        time.perf_counter() - job_start,
        processed_count,
        updated_count,
        missing_in_gcs_count,
    )
    return updated_count


def run():
    """Run the backfiller job."""
    try:
        app = create_app()
        with app.app_context():
            app.logger.info("Starting backfiller job....")

            if app.config.get("BACKFILL_DOCUMENT_ADDED_ON", False):
                batch_size = app.config.get(
                    "BACKFILL_DOCUMENT_ADDED_ON_BATCH_SIZE", 100
                )
                app.logger.info(
                    "Running document added_on backfiller with batch size %s",
                    batch_size,
                )
                backfill_document_added_on(app, batch_size=batch_size)

            if app.config.get("BACKFILL_INTERACTION_RECIPIENTS", False):
                batch_size = app.config.get(
                    "BACKFILL_INTERACTION_RECIPIENTS_BATCH_SIZE", 1000
                )
                app.logger.info(
                    "Running interaction recipients backfiller with batch size %s",
                    batch_size,
                )
                backfill_interaction_recipients(app, batch_size=batch_size)

            if app.config.get("BACKFILL_REGISTRATION_SEARCH", False):
                batch_size = app.config.get(
                    "BACKFILL_REGISTRATION_SEARCH_BATCH_SIZE", 100
                )
                app.logger.info(
                    "Running registration search backfiller with batch size %s",
                    batch_size,
                )
                backfill_registration_search(app, batch_size=batch_size)

            # backfill_jurisdiction(app)
            # backfill_strata_hotel_category(app)
    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Unexpected error: {str(err)}")
