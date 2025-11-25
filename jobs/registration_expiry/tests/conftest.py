# pylint: disable=C0114, W0613
import pytest

from registration_expiry.job import create_app


@pytest.fixture(scope="session")
def app(request):
    """Return a session-wide application configured in TEST mode."""
    _app = create_app("test")

    with _app.app_context():
        yield _app
