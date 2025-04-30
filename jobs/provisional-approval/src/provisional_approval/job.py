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
"""Background job to provisionally approve applications."""
import os
import traceback

from flask import Flask
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.models.events import Events
from strr_api.models.rental import Registration
from strr_api.services import ApprovalService
from structured_logging import StructuredLogging
from enum import Enum

from provisional_approval.config import CONFIGURATION

logger = StructuredLogging.get_logger()


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


def get_applications_in_full_review_status(app):
    """Retrieve applications for processing."""
    return (
        Application.query.filter(
            Application.status == Application.Status.FULL_REVIEW,
            Application.registration_type == Registration.RegistrationType.HOST,
            # StrrRequirement.PR_EXEMPT_FRACTIONAL_OWNERSHIP.value
            # Application.registration.has("prExemptionType" != "FRACTIONAL_OWNERSHIP")
        )
        .order_by(Application.id)
        .limit(int(app.config.get("BATCH_SIZE")))
    )


def process_applications(applications):
    """Process provisional-approval for submitted applications."""
    for application in applications:
        try:
            logger.info(f"Processing application {application.id}")
            ApprovalService.approve_application(
                application=application,
                status=Application.Status.PROVISIONAL_REVIEW,
                event=Events.EventName.AUTO_APPROVAL_PROVISIONAL,
            )
        except Exception:  # pylint: disable=broad-except
            logger.error(
                f"Unexpected error while processing application: {application.id}"
            )
            logger.error(traceback.format_exc())


def run():
    """Run the provisional-approval job."""
    try:
        app = create_app()
        with app.app_context():
            logger.info("Starting provisional approval job")
            applications = get_applications_in_full_review_status(app)
            process_applications(applications)
            logger.info("Provisional approval job finished")
    except Exception as err:  # pylint: disable=broad-except
        logger.error(f"Unexpected error: {str(err)}")
