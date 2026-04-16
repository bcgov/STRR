import random
import string

import pytest


@pytest.fixture(scope="function")
def random_string():
    """Returns a random string, default length is 10."""

    def _generate(length=10):
        characters = string.ascii_letters + string.digits
        return "".join(random.choices(characters, k=length))

    return _generate


@pytest.fixture(scope="function")
def random_integer():
    """Returns a random integer, default max is 1000."""

    def _generate(max=1000):
        return random.randint(1, max)

    return _generate


@pytest.fixture
def inject_config(app, request):
    """
    Safely injects config variables for a single test and reverts them afterwards.
    Usage: @pytest.mark.conf(KEY="value")
    """
    marker = request.node.get_closest_marker("conf")

    if not marker:
        yield
        return

    new_config = marker.kwargs
    original_values = {}

    for key in new_config:
        original_values[key] = app.config.get(key)

    app.config.update(new_config)

    yield

    for key, old_value in original_values.items():
        if old_value is None:
            app.config.pop(key, None)
        else:
            app.config[key] = old_value
