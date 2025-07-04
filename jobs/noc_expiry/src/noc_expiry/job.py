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
"""NOC Expiry Job."""
import logging
import os
import traceback
from datetime import datetime

from flask import Flask
from sentry_sdk.integrations.logging import LoggingIntegration
from strr_api.enums.enum import RegistrationNocStatus
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.models.rental import Registration
from strr_api.utils.date_util import DateUtil

from noc_expiry.config import CONFIGURATION
from noc_expiry.utils.logging import setup_logging

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


def update_status_for_noc_expired_applications(app):
    """Update the application status for the NOC expired applications."""
    statuses = [
        Application.Status.NOC_PENDING,
        Application.Status.PROVISIONAL_REVIEW_NOC_PENDING,
    ]
    applications = Application.query.filter(Application.status.in_(statuses)).all()
    cut_off_datetime = DateUtil.as_legislation_timezone(datetime.utcnow())
    for application in applications:
        try:
            app.logger.info(f"Processing application # {str(application.id)}")
            if application.noc.end_date < cut_off_datetime:
                app.logger.info(
                    f"Updating status for application {str(application.id)}"
                )
                application.status = (
                    Application.Status.NOC_EXPIRED
                    if application.status == Application.Status.NOC_PENDING
                    else Application.Status.PROVISIONAL_REVIEW_NOC_EXPIRED
                )
                application.save()
        except Exception as err:  # pylint: disable=broad-except
            app.logger.error(f"Unexpected error: {str(err)}")
            app.logger.error(traceback.format_exc())


def update_noc_status_for_expired_registrations(app):
    """Update the NOC status for the NOC expired registrations."""
    registrations = Registration.query.filter(
        Registration.noc_status == RegistrationNocStatus.NOC_PENDING
    ).all()
    for registration in registrations:
        try:
            app.logger.info(f"Processing registration # {str(registration.id)}")
            noc = max(registration.nocs, key=lambda noc: noc.start_date)
            cut_off_datetime = DateUtil.as_legislation_timezone(datetime.utcnow())
            if noc.end_date < cut_off_datetime:
                app.logger.info(
                    f"Updating status for registration {str(registration.id)}"
                )
                registration.noc_status = RegistrationNocStatus.NOC_EXPIRED
                registration.save()
        except Exception as err:  # pylint: disable=broad-except
            app.logger.error(f"Unexpected error: {str(err)}")
            app.logger.error(traceback.format_exc())


def run():
    """Run the noc-expiry job."""
    try:
        app = create_app()
        with app.app_context():
            app.logger.info("Starting NOC expiry job")
            update_status_for_noc_expired_applications(app)
            update_noc_status_for_expired_registrations(app)
    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Unexpected error: {str(err)}")
