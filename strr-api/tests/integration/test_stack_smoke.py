# Copyright © 2023 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
"""Fast infra smoke: Postgres + Redis + ORM seed (HTTP ops covered in ``resources/test_ops_api``)."""

import pytest

from strr_api.models.rental import Registration


def test_postgres_migrated_schema_and_setup_parents(session, setup_parents):
    assert setup_parents["registration_id"] is not None
    reg = session.get(Registration, setup_parents["registration_id"])
    assert reg is not None
    assert reg.id == setup_parents["registration_id"]


def test_redis_client_roundtrip(redis_client):
    redis_client.set("strr_integration_smoke", "ok")
    assert redis_client.get("strr_integration_smoke") == b"ok"
