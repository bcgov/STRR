# Copyright © 2023 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
"""The STRR API.

This module is the API for the Short Term Rental Registry.
"""
import logging.config
import os

import coloredlogs
import sentry_sdk
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from sentry_sdk.integrations.flask import FlaskIntegration

from .common.auth import jwt
from .common.run_version import get_run_version
from .config import Config, Production
from .models import db
from .resources import register_endpoints
from .services import strr_pay
from .translations import babel

logging.config.fileConfig(fname=os.path.join(os.path.abspath(os.path.dirname(__file__)), "logging.conf"))
coloredlogs.install()
logger = logging.getLogger("api")


def create_app(environment: Config = Production, **kwargs) -> Flask:
    """Return a configured Flask App using the Factory method."""
    app = Flask(__name__)
    CORS(app)
    app.config.from_object(environment)

    db.init_app(app)
    if app.config.get("POD_NAMESPACE", "production") == "migration":
        logger.info("Running in migration mode")
        Migrate(app, db)
    else:
        # Configure Sentry
        if dsn := app.config.get("SENTRY_DSN", None):
            sentry_sdk.init(
                dsn=dsn,
                integrations=[FlaskIntegration()],
                release=f"strr-api@{get_run_version()}",
                send_default_pii=False,
                environment=app.config.get("POD_NAMESPACE", "unknown"),
            )

        strr_pay.init_app(app)
        babel.init_app(app)
        register_endpoints(app)
        setup_jwt_manager(app, jwt)

        @app.after_request
        def add_version(response):  # pylint: disable=unused-variable
            version = get_run_version()
            response.headers["API"] = f"strr-api/{version}"
            return response

    return app


def setup_jwt_manager(app, jwt_manager):
    """Use flask app to configure the JWTManager to work for a particular Realm."""

    def get_roles(a_dict):
        return a_dict["realm_access"]["roles"]  # pragma: no cover

    app.config["JWT_ROLE_CALLBACK"] = get_roles

    jwt_manager.init_app(app)
