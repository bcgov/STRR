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
"""registration Expiry Job."""
import logging
import os
import traceback
from datetime import datetime

from flask import Flask
from sentry_sdk.integrations.logging import LoggingIntegration
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.utils.date_util import DateUtil

from registration_expiry.config import CONFIGURATION
from registration_expiry.utils.logging import setup_logging

setup_logging(os.path.join(os.path.abspath(
    os.path.dirname(__file__)), "logging.conf"))

SENTRY_LOGGING = LoggingIntegration(
    event_level=logging.ERROR)  # send errors as events


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


def update_status_for_registration_expiry_applications(app):
    """Update the application status for the registration expired applications."""
    applications = Application.query.filter(
        Application.status == Application.Status.NOC_PENDING
    ).all()
    cut_off_datetime = DateUtil.as_legislation_timezone(datetime.utcnow())
    for application in applications:
        try:
            app.logger.info(f"Processing application # {str(application.id)}")
            if application.noc.end_date < cut_off_datetime:
                app.logger.info(
                    f"Updating status for application {str(application.id)}"
                )
                application.status = Application.Status.NOC_EXPIRED
                application.save()
        except Exception as err:  # pylint: disable=broad-except
            app.logger.error(f"Unexpected error: {str(err)}")
            app.logger.error(traceback.format_exc())


def run():
    """Run the registration-expiry job."""
    try:
        app = create_app()
        with app.app_context():
            app.logger.info("Starting registration expiry job")
            update_status_for_noc_expired_applications(app)
    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Unexpected error: {str(err)}")
