"""Tests for schema loading helpers."""

from strr_api.schemas import utils as schema_utils


def test_get_schema_returns_dict():
    schema = schema_utils.get_schema("registration.json")
    assert isinstance(schema, dict)
    assert "$schema" in schema or "type" in schema or "$id" in schema


def test_get_schema_store_builds_index():
    import os

    path = os.path.join(os.path.dirname(schema_utils.__file__), "schemas")
    store = schema_utils.get_schema_store(path)
    assert isinstance(store, dict)
    assert len(store) >= 1
