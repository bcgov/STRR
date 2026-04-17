from contextlib import contextmanager

import pytest
from strr_api import jwt as _jwt


@pytest.fixture(scope="session")
def jwt():
    return _jwt


@contextmanager
def not_raises(exception):
    try:
        yield
    except exception:
        raise pytest.fail(f"DID RAISE {exception}")
