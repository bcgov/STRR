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

from flask import Flask
from sentry_sdk.integrations.logging import LoggingIntegration
from strr_api.models import db

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


def send_forty_five_days_reminder(app):
    """Send the reminder before 45 days."""
    pass


def send_fifteen_days_reminder(app):
    """Send the reminder before 15 days."""
    pass


def run():
    """Run the renewal reminder job."""
    try:
        app = create_app()
        with app.app_context():
            app.logger.info("Starting renewal reminder job")
            send_fifteen_days_reminder(app)
            send_forty_five_days_reminder(app)
    except Exception as err:  # pylint: disable=broad-except
        app.logger.error(f"Unexpected error: {str(err)}")
