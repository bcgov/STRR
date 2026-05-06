"""Integration tests for ``/ops`` endpoints."""

from http import HTTPStatus

import pytest

from tests.integration.helpers import assert_json_keys, assert_status


def test_ops_healthz_returns_ok_json(client):
    rv = client.get("/ops/healthz")
    assert_status(rv, HTTPStatus.OK)
    body = assert_json_keys(rv, "message")
    assert body["message"] == "api is healthy"


def test_ops_readyz_returns_ok_json(client):
    rv = client.get("/ops/readyz")
    assert_status(rv, HTTPStatus.OK)
    body = assert_json_keys(rv, "message")
    assert body["message"] == "api is ready"
