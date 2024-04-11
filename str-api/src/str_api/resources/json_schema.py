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
This module defines a Flask blueprint for JSON-Schema endpoints.

It provides an endpoint to get a specific JSON schema by its name.

The module uses a `SchemaService` to interact with the schema storage.
"""
from flask import Blueprint, current_app
from flask import jsonify

from str_api.services.json_schema import SchemaService

bp = Blueprint("json-schemas", __name__)


@bp.route("/<schema_name>", methods=("GET",))
def get_schema(schema_name: str):
    """
    This method is used to retrieve a schema by its name.

    Parameters:
        schema_name (str): The name of the schema to retrieve.

    Returns:
        A JSON response with the schema and schema_name if the schema is found.
        A JSON response with the error message and status code 404 if the schema is not found.
    """
    schema_service = SchemaService()
    schema = None
    try:
        schema = schema_service.get_schema(schema_name)
    except Exception as e:
        current_app.logger.warning(e)

    if not schema:
        return {
            "message": "Schema not found",
            "status_code": 404
        }, 404

    return jsonify(schema=schema, schema_name=schema_name)
