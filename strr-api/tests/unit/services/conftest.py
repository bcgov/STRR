import pytest


@pytest.fixture
def app_ctx(app):
    """Flask application context for service calls (avoids repeating app.app_context())."""
    with app.app_context():
        yield app
