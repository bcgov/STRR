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
from strr_api.models import db
from strr_api.models.rental import Registration, RentalProperty
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


def run():
    """Run the backfiller job."""
    try:
        app = create_app()
        with app.app_context():
            app.logger.info("Starting backfiller job....")
            backfill_jurisdiction(app)
    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Unexpected error: {str(err)}")
