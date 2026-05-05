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
"""Common setup and fixtures for the pytest suite used by this service."""
import os
from contextlib import contextmanager

import pytest
from flask import g
from ldclient.integrations.test_data import TestData

pytest_plugins = (
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
    "strr_test_utils.client_fixtures",
    "strr_test_utils.parent_fixtures",
)

from sqlalchemy.orm import Session as AppSession

from strr_api import db as _db
from strr_api.config import Testing


@contextmanager
def not_raises(exception):
    """Corallary to the pytest raises builtin.

    Assures that an exception is NOT thrown.
    """
    try:
        yield
    except exception:
        raise pytest.fail(f"DID RAISE {exception}")


@pytest.fixture(scope="session")
def ld():
    """LaunchDarkly TestData source."""
    td = TestData.data_source()
    yield td


@pytest.fixture
def authed_g(app):
    """Fixture to seed 'g' with basic JWT info for tests that use mocks."""
    with app.app_context():
        setattr(g, "jwt_oidc_token_info", {"sub": "test-user", "realm_access": {"roles": []}})
        yield g


@pytest.fixture(scope="session")
def client_ctx(app):  # pylint: disable=redefined-outer-name
    """Return session-wide Flask test client."""
    with app.test_client() as _client:
        yield _client


@pytest.fixture(scope="session")
def app(ld, db_engine):
    """Flask app bound to the migrated test DB from strr_test_utils.db_fixtures."""
    from strr_api import create_app

    # str(engine.url) masks the password; Flask needs the real credentials.
    db_url = db_engine.url.render_as_string(hide_password=False)
    Testing.SQLALCHEMY_DATABASE_URI = db_url
    Testing.POD_NAMESPACE = "Testing"
    os.environ["DATABASE_URL"] = db_url

    _app = create_app(Testing, **{"ld_test_data": ld})
    return _app


@pytest.fixture(scope="function")
def session(app, db_engine):
    """
    Transactional ORM session bound to a savepoint-nested connection.

    strr_test_utils.db_fixtures.session uses a plain scoped_session; strr-api
    relies on join_transaction_mode=\"create_savepoint\" so HTTP handler commits
    nest inside an outer rollback (see sql_versioning + Flask request cycles).
    """
    _ = db_engine  # fixture dependency: migrations before app binds engine
    with app.app_context():
        connection = _db.engine.connect()
        transaction = connection.begin()

        orm_session = AppSession(bind=connection, join_transaction_mode="create_savepoint")

        class TestScopedSession:
            def __call__(self):
                return orm_session

            def __getattr__(self, name):
                return getattr(orm_session, name)

            def remove(self):
                orm_session.close()

        original_session_lookup = _db.session
        _db.session = TestScopedSession()

        yield orm_session

        orm_session.close()
        transaction.rollback()
        connection.close()
        _db.session = original_session_lookup
