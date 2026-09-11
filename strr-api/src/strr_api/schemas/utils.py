# Copyright © 2019 Province of British Columbia
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
"""Utilities to load and validate against JSONSchemas.

Test helper functions to load and assert that a JSON payload validates against a defined schema.
"""

import json
import logging
from os import listdir, path
from typing import Tuple

from jsonschema import Draft7Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT7

logger = logging.getLogger("api")

BASE_URI = "https://strr.gov.bc.ca/.well_known/schemas"


def get_schema(filename: str) -> dict:
    """Return the given schema file identified by filename."""
    return _load_json_schema(filename)


def _load_json_schema(filename: str):
    """Return the given schema file identified by filename."""
    relative_path = path.join("schemas", filename)
    absolute_path = path.join(path.dirname(__file__), relative_path)

    with open(absolute_path, "r", encoding="utf-8") as schema_file:
        schema = json.loads(schema_file.read())

        return schema


def get_schema_store(schema_search_path: str) -> dict:
    """Return a schema_store as a dict.

    The default returns schema_store of the default schemas found in this package.
    """
    schemastore = {}
    fnames = listdir(schema_search_path)
    for fname in fnames:
        fpath = path.join(schema_search_path, fname)
        with open(fpath, "r", encoding="utf-8") as schema_fd:
            schema = json.load(schema_fd)
            if "$id" in schema:
                schemastore[schema["$id"]] = schema

    for _, schema in schemastore.items():
        Draft7Validator.check_schema(schema)

    return schemastore


def validate_schema(
    json_data: json,
    schema_id: str,
) -> Tuple[bool, iter]:
    """Load the json file and validate against loaded schema."""

    schema_search_path = path.join(path.dirname(__file__), "schemas")
    schema_store = get_schema_store(schema_search_path)
    schema_uri = f"{BASE_URI}/{schema_id}"
    schema = schema_store.get(schema_uri)

    if schema is None:
        raise ValueError(f"No schema found for URI {schema_uri}")

    def retrieve_resource(uri):
        contents = schema_store.get(uri)
        return Resource.from_contents(contents)

    registry = Registry(retrieve=retrieve_resource).with_resource(schema_uri, DRAFT7.create_resource(schema))

    validator = Draft7Validator(schema, format_checker=Draft7Validator.FORMAT_CHECKER, registry=registry)
    if validator.is_valid(json_data):
        return True, None

    errors = validator.iter_errors(json_data)
    return False, errors


def validate(json_data: dict, schema_name: str) -> [bool, []]:
    """
    A method to validate data against a specified schema.

    Parameters:
        schema_name: A string representing the name of the schema to use for validation.
        json_data: A dictionary containing the data to be validated.

    Returns:
        A tuple consisting of a boolean value indicating whether the data is valid or not,
        and a list of validation errors if any.

    Raises:
        Exception: If the schema_name parameter is empty.
    """

    try:
        is_valid, validation_errors = validate_schema(json_data, schema_name)
        if not is_valid and validation_errors:
            errors = []
            for error in validation_errors:
                # Serialize the error into a dictionary
                errors.append(
                    {
                        "message": error.message,
                        "json_path": error.json_path,
                        "relative_path": list(error.relative_path),
                        "context": [context.message for context in error.context],
                    }
                )
            return is_valid, errors
    except Exception as e:
        return False, [{"message": str(e)}]

    return is_valid, []
