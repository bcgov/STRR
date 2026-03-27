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
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import HTTPError, RequestException, Timeout
from sentry_sdk.integrations.logging import LoggingIntegration
from strr_api.models import db
from strr_api.models.application import Application
from strr_api.services import ApprovalService, AuthService

from auto_approval.config import CONFIGURATION, _Config
from auto_approval.utils.logging import setup_logging

setup_logging(os.path.join(os.path.abspath(os.path.dirname(__file__)), "logging.conf"))

SENTRY_LOGGING = LoggingIntegration(event_level=logging.ERROR)  # send errors as events


def create_app(run: str | _Config = "production", **kwargs):
    """Return a configured Flask App using the Factory method."""
    app = Flask(__name__)

    if not isinstance(run, str) and issubclass(run, _Config):
        config = run
    else:
        config = CONFIGURATION[run]

    app.config.from_object(config)
    db.init_app(app)
    register_shellcontext(app)
    return app


def register_shellcontext(app):
    """Register shell context objects."""

    def shell_context():
        """Shell context objects."""
        return {"app": app}

    app.shell_context_processor(shell_context)
