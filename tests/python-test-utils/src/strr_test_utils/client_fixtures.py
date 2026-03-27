import importlib

import pytest
from flask import g


@pytest.fixture(scope="session")
def jwt(package_info):
    """
    Dynamically discovers the JWT manager from the job's package.
    Looks for 'jwt' or 'jwt_manager' in the root __init__.py.
    """
    pkg = package_info["package"]
    try:
        module = importlib.import_module(pkg)
        return getattr(module, "jwt", getattr(module, "jwt_manager", None))
    except (ImportError, AttributeError):
        return None


@pytest.fixture(scope="function")
def client(app):
    """Returns a Flask test client if app exists, otherwise skips."""
    if not app:
        pytest.skip("Test requires 'client' but this is a Lite job (no Flask app).")
    with app.test_client() as client:
        yield client


@pytest.fixture
def authed_g(app):
    """
    A factory fixture to seed 'g' with JWT info and specific roles.
    Usage:
        def test_admin_route(authed_g):
            g = authed_g(roles=['STRR_EXAMINER', 'STRR_ADMIN'])
            ...
    """
    if not app:
        pytest.skip("Test requires 'authed_g' but this is a Lite job.")

    def _auth(roles=None, sub="test-user", username="test-user-id"):
        if roles is None:
            roles = []

        # Ensure we are inside an app context so 'g' is valid
        # Note: 'app' fixture already provides a context, but we ensure it here
        setattr(
            g,
            "jwt_oidc_token_info",
            {"sub": sub, "username": username, "realm_access": {"roles": roles}},
        )
        return g

    return _auth
