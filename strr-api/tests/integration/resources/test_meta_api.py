"""Integration tests for ``/meta`` endpoints."""

from http import HTTPStatus

import pytest

from tests.integration.helpers import assert_json_keys, assert_status


def test_meta_info_returns_version_json(client):
    rv = client.get("/meta/info")
    assert_status(rv, HTTPStatus.OK)
    body = assert_json_keys(rv, "API", "FrameWork")
    assert "strr_api" in body["API"] or "/" in body["API"]
