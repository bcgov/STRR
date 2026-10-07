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

from datetime import datetime
from datetime import timedelta
from datetime import timezone
import logging
import os
import traceback

from flask import Flask
from flask_migrate import Migrate
from sqlalchemy import exists
from sqlalchemy import func
from strr_api.enums.enum import ApplicationType
from strr_api.enums.enum import RegistrationStatus
from strr_api.models import CustomerInteraction
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.models.rental import Registration
from strr_api.services.email_service import EmailService
from strr_api.services.events_service import Events
from strr_api.services.events_service import EventsService

from renewal_reminders.config import _Config
from renewal_reminders.config import CONFIGURATION
from renewal_reminders.utils.logging import setup_logging

from .app import create_app

setup_logging(os.path.join(os.path.abspath(os.path.dirname(__file__)), "logging.conf"))


def renewal_job_key(target_date: datetime = datetime.now(timezone.utc), days: int = 0) -> str:
    """create a job key for this particular type of run."""
    return f"{target_date.year}:RENEWAL_REMINDER:{days}"


def send_forty_days_reminder(app, registration_type):
    """Send the reminder before 40 days."""
    with app.app_context():
        app.logger.info("Starting 40 days renewal notifications")

        days = 40
        target_date = (datetime.now(timezone.utc) + timedelta(days=days)).date()
        job_key = renewal_job_key(target_date, days)

        # Create the subquery correlating CustomerInteraction to Registrations
        interaction_exists = exists().where(
            CustomerInteraction.registration_id == Registration.id,
            CustomerInteraction.idempotency_key == job_key,
        )

        # Filter the registrations (Database-level exclusion)
        registrations = Registration.query.filter(
            Registration.registration_type == registration_type,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
            ~interaction_exists,  # Only return records that lack this specific interaction
        ).all()

        app.logger.info(f"Found {len(registrations)} active registrations expiring in 40 days.")

        for reg in registrations:
            app.logger.info(
                f"Sending reminder for registration ID: {reg.id} using job key {job_key}"
            )

            EmailService.send_renewal_reminder_for_registration(
                registration=reg, interaction=job_key
            )
            EventsService.save_event(
                event_type=Events.EventType.REGISTRATION,
                event_name=Events.EventName.RENEWAL_REMINDER_SENT,
                registration_id=reg.id,
            )
        app.logger.info("Finished sending 40 days renewal notifications")


def send_final_day_reminder(app, registration_type):
    """Send the reminder on the last day of the permit before expiry."""
    with app.app_context():
        app.logger.info("Starting final day renewal notifications")

        days = 0
        target_date = (datetime.now(timezone.utc) + timedelta(days=days)).date()
        job_key = renewal_job_key(target_date, days)

        # Create the subquery correlating CustomerInteraction to Registrations
        interaction_exists = exists().where(
            CustomerInteraction.registration_id == Registration.id,
            CustomerInteraction.idempotency_key == job_key,
        )
        registrations = Registration.query.filter(
            Registration.registration_type == registration_type,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
            ~interaction_exists,
        ).all()
        app.logger.info(f"Found {len(registrations)} active registrations expiring in 1 day.")
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
                EmailService.send_renewal_reminder_for_registration(
                    registration=reg, interaction=job_key
                )
                EventsService.save_event(
                    event_type=Events.EventType.REGISTRATION,
                    event_name=Events.EventName.RENEWAL_REMINDER_SENT,
                    registration_id=reg.id,
                )
        app.logger.info("Finished sending final day renewal notifications.")


def send_fourteen_days_reminder(app, registration_type):
    """Send the reminder before 14 days."""
    with app.app_context():
        app.logger.info("Starting 14 days renewal notifications")
        days = 14
        target_date = (datetime.now(timezone.utc) + timedelta(days=days)).date()
        job_key = renewal_job_key(target_date, days)

        # Create the subquery correlating CustomerInteraction to Registrations
        interaction_exists = exists().where(
            CustomerInteraction.registration_id == Registration.id,
            CustomerInteraction.idempotency_key == job_key,
        )

        registrations = Registration.query.filter(
            Registration.registration_type == registration_type,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
            ~interaction_exists,
        ).all()
        app.logger.info(f"Found {len(registrations)} active registrations expiring in 14 days.")
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
                EmailService.send_renewal_reminder_for_registration(
                    registration=reg, interaction=job_key
                )
                EventsService.save_event(
                    event_type=Events.EventType.REGISTRATION,
                    event_name=Events.EventName.RENEWAL_REMINDER_SENT,
                    registration_id=reg.id,
                )
        app.logger.info("Finished sending 14 days renewal notifications")


def send_sixty_days_reminder_for_strata_hotels(app):
    """Send the reminder before 60 days."""
    with app.app_context():
        app.logger.info("Starting 60 days renewal notifications")
        days = 60
        target_date = (datetime.now(timezone.utc) + timedelta(days=days)).date()
        job_key = renewal_job_key(target_date, days)

        # Create the subquery correlating CustomerInteraction to Registrations
        interaction_exists = exists().where(
            CustomerInteraction.registration_id == Registration.id,
            CustomerInteraction.idempotency_key == job_key,
        )

        registrations = Registration.query.filter(
            Registration.registration_type == Registration.RegistrationType.STRATA_HOTEL,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
            ~interaction_exists,
        ).all()
        app.logger.info(
            f"Found {len(registrations)} active strata hotel registrations expiring in 60 days."
        )
        for reg in registrations:
            app.logger.info(f"Sending reminder for registration ID: {reg.id}")
            EmailService.send_renewal_reminder_for_registration(
                registration=reg, interaction=job_key
            )
            EventsService.save_event(
                event_type=Events.EventType.REGISTRATION,
                event_name=Events.EventName.RENEWAL_REMINDER_SENT,
                registration_id=reg.id,
            )
        app.logger.info("Finished sending 60 days renewal notifications")


def send_thirty_days_reminder_for_strata_hotels(app):
    """Send the reminder before 30 days."""
    with app.app_context():
        app.logger.info("Starting 30 days renewal notifications")
        days = 30
        target_date = (datetime.now(timezone.utc) + timedelta(days=days)).date()
        job_key = renewal_job_key(target_date, days)

        # Create the subquery correlating CustomerInteraction to Registrations
        interaction_exists = exists().where(
            CustomerInteraction.registration_id == Registration.id,
            CustomerInteraction.idempotency_key == job_key,
        )

        registrations = Registration.query.filter(
            Registration.registration_type == Registration.RegistrationType.STRATA_HOTEL,
            Registration.status == RegistrationStatus.ACTIVE,
            func.date(Registration.expiry_date) == target_date,
            ~interaction_exists,
        ).all()
        app.logger.info(f"Found {len(registrations)} active registrations expiring in 30 days.")
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
                EmailService.send_renewal_reminder_for_registration(
                    registration=reg, interaction=job_key
                )
                EventsService.save_event(
                    event_type=Events.EventType.REGISTRATION,
                    event_name=Events.EventName.RENEWAL_REMINDER_SENT,
                    registration_id=reg.id,
                )
        app.logger.info("Finished sending 30 days renewal notifications")


def run(app: Flask = None):
    """Run the renewal reminder job."""
    try:
        if not app:
            app = create_app()
        with app.app_context():
            app.logger.info("Starting renewal reminder job")
            send_forty_days_reminder(app, registration_type=Registration.RegistrationType.HOST)
            send_fourteen_days_reminder(app, registration_type=Registration.RegistrationType.HOST)
            send_final_day_reminder(app, registration_type=Registration.RegistrationType.HOST)
            send_forty_days_reminder(app, registration_type=Registration.RegistrationType.PLATFORM)
            send_fourteen_days_reminder(
                app, registration_type=Registration.RegistrationType.PLATFORM
            )
            send_sixty_days_reminder_for_strata_hotels(app)
            send_thirty_days_reminder_for_strata_hotels(app)
            app.logger.info("Renewal reminder job completed")
    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Unexpected error: {str(err)}")
        app.logger.error(traceback.format_exc())
