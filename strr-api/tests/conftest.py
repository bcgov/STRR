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
import contextlib
import os
import random
import string
from contextlib import contextmanager

import psycopg2
import pytest
import sqlalchemy
from flask import g
from flask_migrate import Migrate, upgrade
from ldclient.integrations.test_data import TestData
from sqlalchemy import event, text
from sqlalchemy.orm import Session as AppSession
from testcontainers.postgres import PostgresContainer

from strr_api import create_app
from strr_api import db as _db
from strr_api import jwt as _jwt
from strr_api.config import Testing

postgres_image = "postgres:16-alpine"


@pytest.fixture(scope="function")
def random_string():
    """Returns a random string, defult length is 10."""

    def _generate(length=10):
        characters = string.ascii_letters + string.digits
        return "".join(random.choices(characters, k=length))

    return _generate


@pytest.fixture(scope="function")
def random_integer():
    """Returns a random integer, defult max is 1000."""

    def _generate(max=1000):
        return random.randint(1, max)

    return _generate


@pytest.fixture
def inject_config(app, request):
    """
    Safely injects config variables for a single test and reverts them afterwards.
    Usage: @pytest.mark.conf(KEY="value")
    """
    # 1. Get the marker
    marker = request.node.get_closest_marker("conf")

    # If no marker, do nothing
    if not marker:
        yield
        return

    # 2. SNAPSHOT: Save original values of the keys we are about to change
    new_config = marker.kwargs
    original_values = {}

    for key in new_config:
        # Save the old value (if it existed) so we can restore it
        original_values[key] = app.config.get(key)

    # 3. APPLY: Update the config
    app.config.update(new_config)

    yield

    # 4. RESTORE: Revert to original values
    for key, old_value in original_values.items():
        if old_value is None:
            # If it wasn't there before, remove it
            app.config.pop(key, None)
        else:
            # Restore the old value
            app.config[key] = old_value


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


# @pytest.fixture(scope="session")
# def client(app):  # pylint: disable=redefined-outer-name
#     """Return a session-wide Flask test client."""
#     return app.test_client()
@pytest.fixture(scope="function")
def client(app):
    """
    Return a function-scoped test client.
    This allows @patch decorators on individual tests to work correctly
    without leaking state or context between tests.
    """
    with app.test_client() as client:
        # We provide the client, and the @patch decorators in your test
        # will now correctly intercept calls made during client.get()
        yield client


@pytest.fixture(scope="session")
def jwt():
    """Return a session-wide jwt manager."""
    return _jwt


@pytest.fixture
def authed_g(app):
    """Fixture to seed 'g' with basic JWT info for tests that use mocks."""
    # This automatically uses the app context provided by the app fixture
    with app.app_context():
        # Pre-seed the attribute that flask-jwt-oidc expects
        setattr(g, "jwt_oidc_token_info", {"sub": "test-user", "realm_access": {"roles": []}})
        yield g


@pytest.fixture(scope="session")
def client_ctx(app):  # pylint: disable=redefined-outer-name
    """Return session-wide Flask test client."""
    with app.test_client() as _client:
        yield _client


@pytest.fixture(scope="session")
def postgres_container():
    """
    Spins up a Postgres container.
    """
    with PostgresContainer(postgres_image) as postgres:
        yield postgres


@pytest.fixture(scope="session")
def app(ld, postgres_container):
    db_url = postgres_container.get_connection_url()
    Testing.SQLALCHEMY_DATABASE_URI = db_url
    Testing.POD_NAMESPACE = "Testing"

    # Still set this so the standalone-logic in env.py has a backup
    os.environ["DATABASE_URL"] = db_url

    app = create_app(Testing, **{"ld_test_data": ld})
    return app


@pytest.fixture(scope="session")
def setup_database(app):
    # This is the ONLY place where the context is pushed for migrations
    with app.app_context():
        upgrade()
    yield


@pytest.fixture(scope="function")
def session(app, setup_database):
    """
    Creates a test session that behaves like a scoped_session but
    is bound to an external transaction for easy rollback.
    """
    with app.app_context():  # Re-establish context for the individual test
        # 1. Start the external transaction on the connection
        connection = _db.engine.connect()
        transaction = connection.begin()

        # 2. Create the Session
        session = AppSession(bind=connection, join_transaction_mode="create_savepoint")

        # 3. Create a Proxy to mimic Flask-SQLAlchemy's db.session
        class TestScopedSession:
            def __call__(self):
                return session

            def __getattr__(self, name):
                return getattr(session, name)

            def remove(self):
                session.close()

        # 4. Patch global db.session
        original_session_lookup = _db.session
        _db.session = TestScopedSession()

        yield session

        # 5. Cleanup
        session.close()
        transaction.rollback()
        connection.close()
        _db.session = original_session_lookup
