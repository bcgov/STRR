""" Tests to ensure that the json_schema end-points work correctly.
"""
from http import HTTPStatus

import pytest


@pytest.mark.parametrize(
    "test_name, schema_name, expected_status",
    [
        ("Existing schema", "components", HTTPStatus.OK),
        ("Non existing schema", "nonExistingSchema", HTTPStatus.NOT_FOUND)
    ],
)
def test_get_schema(client, session, test_name, schema_name, expected_status):
    rv = client.get(f'/json-schemas/{schema_name}')
    assert rv.status_code == expected_status
