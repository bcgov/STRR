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
"""
This module is responsible for registering the endpoints.

The register_endpoints function registers the provided blueprints and URL prefixes to the Flask application.
"""
from flasgger import Swagger
from flask import Flask

from .account import bp as account_endpoint
from .application import bp as application_endpoint
from .base import bp as base_endpoint
from .documents import bp as documents_endpoint
from .meta import bp as meta_endpoint
from .ops import bp as ops_endpoint
from .registrations import bp as registrations_endpoint
from .str_address_requirements import bp as str_address_requirements
from .str_address_requirements import bp_with_version as str_address_requirements_with_version
from .users import bp as users_endpoint
from .validation import bp as validation_endpoint
from .validation import bp_with_version as validation_endpoint_with_version


def register_endpoints(app: Flask):
    """
    Register Endpoints

    Registers the provided blueprints and URL prefixes to the Flask application.

    :param app: The Flask application to register the endpoints to.
    :type app: Flask
    """
    # Allow base route to match with, and without a trailing slash
    app.url_map.strict_slashes = False

    app.register_blueprint(
        url_prefix="/",
        blueprint=base_endpoint,
    )

    app.register_blueprint(
        url_prefix="/ops",
        blueprint=ops_endpoint,
    )

    app.register_blueprint(
        url_prefix="/accounts",
        blueprint=account_endpoint,
    )

    app.register_blueprint(
        url_prefix="/registrations",
        blueprint=registrations_endpoint,
    )

    app.register_blueprint(
        url_prefix="/applications",
        blueprint=application_endpoint,
    )

    app.register_blueprint(
        url_prefix="/documents",
        blueprint=documents_endpoint,
    )

    app.register_blueprint(
        url_prefix="/users",
        blueprint=users_endpoint,
    )

    app.register_blueprint(
        url_prefix="/address",
        blueprint=str_address_requirements,
    )

    app.register_blueprint(
        url_prefix="/v1/address",
        blueprint=str_address_requirements_with_version,
    )

    app.register_blueprint(
        url_prefix="/v1/permits",
        blueprint=validation_endpoint_with_version,
    )

    app.register_blueprint(
        url_prefix="/permits",
        blueprint=validation_endpoint,
    )

    app.register_blueprint(meta_endpoint)

    app.config["SWAGGER"] = {
        "title": "Short Term Rental Registry API",
        "specs_route": "/",
        "uiversion": 3,
        "securityDefinitions": {
            "Bearer": {"type": "apiKey", "in": "header", "name": "Authorization"},
        },
        "security": [{"Bearer": []}],
    }
    Swagger(app)
