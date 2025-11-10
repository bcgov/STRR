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
"""Registration Renewal Reminder Job."""
import logging
import os
import traceback
from datetime import datetime, timedelta

from flask import Flask
from sentry_sdk.integrations.logging import LoggingIntegration
from sqlalchemy import func
from strr_api.enums.enum import ApplicationType, RegistrationStatus
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.models.rental import Registration
from strr_api.services.email_service import EmailService

from renewal_reminders.config import CONFIGURATION
from renewal_reminders.utils.logging import setup_logging

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


def send_forty_days_reminder(app):
    """Send the reminder before 40 days."""
    with app.app_context():
        app.logger.info("Starting 40 days renewal notifications")
        target_date = (datetime.utcnow() + timedelta(days=40)).date()
        registrations = Registration.query.filter(
            Registration.registration_type == Registration.RegistrationType.HOST,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
        ).all()
        app.logger.info(
            f"Found {len(registrations)} active host registrations expiring in 40 days."
        )
        for reg in registrations:
            app.logger.info(f"Sending reminder for registration ID: {reg.id}")
            EmailService.send_renewal_reminder_for_registration(registration=reg)
        app.logger.info("Finished sending 40 days renewal notifications")


def send_fourteen_days_reminder(app):
    """Send the reminder before 14 days."""
    with app.app_context():
        app.logger.info("Starting 14 days renewal notifications")
        target_date = (datetime.utcnow() + timedelta(days=14)).date()
        registrations = Registration.query.filter(
            Registration.registration_type == Registration.RegistrationType.HOST,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
        ).all()
        app.logger.info(
            f"Found {len(registrations)} active host registrations expiring in 14 days."
        )
        for reg in registrations:
            renewal_application = (
                Application.query.filter(
                    Application.registration_id == reg.id,
                    Application.type == ApplicationType.RENEWAL.value,
                )
                .order_by(Application.id.desc())
                .first()
            )
            if not renewal_application or renewal_application.status in [
                Application.Status.DRAFT,
                Application.Status.PAYMENT_DUE,
            ]:
                app.logger.info(f"Sending reminder for registration ID: {reg.id}")
                EmailService.send_renewal_reminder_for_registration(registration=reg)
        app.logger.info("Finished sending 14 days renewal notifications")


def send_sixty_days_reminder_for_strata_hotels(app):
    """Send the reminder before 60 days."""
    with app.app_context():
        app.logger.info("Starting 60 days renewal notifications")
        target_date = (datetime.utcnow() + timedelta(days=60)).date()
        registrations = Registration.query.filter(
            Registration.registration_type
            == Registration.RegistrationType.STRATA_HOTEL,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
        ).all()
        app.logger.info(
            f"Found {len(registrations)} active strata hotel registrations expiring in 60 days."
        )
        for reg in registrations:
            app.logger.info(f"Sending reminder for registration ID: {reg.id}")
            EmailService.send_renewal_reminder_for_registration(registration=reg)
        app.logger.info("Finished sending 60 days renewal notifications")


def send_thirty_days_reminder_for_strata_hotels(app):
    """Send the reminder before 30 days."""
    with app.app_context():
        app.logger.info("Starting 30 days renewal notifications")
        target_date = (datetime.utcnow() + timedelta(days=30)).date()
        registrations = Registration.query.filter(
            Registration.registration_type
            == Registration.RegistrationType.STRATA_HOTEL,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
        ).all()
        app.logger.info(
            f"Found {len(registrations)} active host registrations expiring in 30 days."
        )
        for reg in registrations:
            renewal_application = (
                Application.query.filter(
                    Application.registration_id == reg.id,
                    Application.type == ApplicationType.RENEWAL.value,
                )
                .order_by(Application.id.desc())
                .first()
            )
            if not renewal_application or renewal_application.status in [
                Application.Status.DRAFT,
                Application.Status.PAYMENT_DUE,
            ]:
                app.logger.info(f"Sending reminder for registration ID: {reg.id}")
                EmailService.send_renewal_reminder_for_registration(registration=reg)
        app.logger.info("Finished sending 30 days renewal notifications")


def run():
    """Run the renewal reminder job."""
    try:
        app = create_app()
        with app.app_context():
            app.logger.info("Starting renewal reminder job")
            send_forty_days_reminder(app)
            send_fourteen_days_reminder(app)
            send_sixty_days_reminder_for_strata_hotels(app)
            send_thirty_days_reminder_for_strata_hotels(app)
            app.logger.info("Renewal reminder job completed")
    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Unexpected error: {str(err)}")
        app.logger.error(traceback.format_exc())
