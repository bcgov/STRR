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

from flask import Flask
from sentry_sdk.integrations.logging import LoggingIntegration
from strr_api.enums.enum import StrataHotelCategory
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.models.rental import Registration, RentalProperty
from strr_api.models.strata_hotels import StrataHotel
from strr_api.services import ApprovalService

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


def run():
    """Run the backfiller job."""
    try:
        app = create_app()
        with app.app_context():
            app.logger.info("Starting backfiller job....")
            backfill_jurisdiction(app)
            backfill_strata_hotel_category(app)
    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Unexpected error: {str(err)}")
