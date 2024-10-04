# Copyright © 2024 Province of British Columbia
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
"""Auto Approval Job."""
import logging
import os
from datetime import datetime, timedelta, timezone
from http import HTTPStatus

import requests
from flask import Flask
from sentry_sdk.integrations.logging import LoggingIntegration
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.services import ApprovalService, AuthService

from auto_approval.config import CONFIGURATION
from auto_approval.utils.logging import setup_logging

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


def get_submitted_applications(app):
    """Retrieve submitted applications for processing."""
    time_delta = timedelta(
        minutes=app.config.get("AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY")
    )
    cutoff_time = datetime.now(timezone.utc) - time_delta
    return Application.query.filter(
        Application.application_date <= cutoff_time,
        Application.status == Application.Status.PAID,
    ).all()


def process_applications(app, applications):
    """Process auto-approval for submitted applications."""
    token = AuthService.get_service_client_token()
    for application in applications:
        app.logger.info(f"Auto processing application {str(application.id)}")
        application_status, registration_id = ApprovalService.process_auto_approval(
            token=token, application=application
        )
        if (
            application_status
            and application_status == Application.Status.AUTO_APPROVED
            and registration_id
        ):
            url = (
                f"{app.config.get('STRR_API_URL')}"
                f"/registrations/{registration_id}"
                f"/certificate"
            )
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
            try:
                response = requests.post(url, headers=headers)
                if response.status_code != HTTPStatus.CREATED:
                    app.logger.error(
                        f"Unexpected response error: Status Code: {response.status_code}, "
                        f"URL: {url}"
                    )
            except Exception as e:
                app.logger.error(f"Request failed:", e)


def run():
    """Run the auto-approval job."""
    try:
        app = create_app()
        with app.app_context():
            app.logger.info("Starting auto approval job")
            applications = get_submitted_applications(app)
            process_applications(app, applications)
    except Exception as err:
        app.logger.error(f"Unexpected error: {str(err)}")
