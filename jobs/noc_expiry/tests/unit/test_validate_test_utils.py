"""Validate the pytest-utils have been imported correctly."""

import pytest


@pytest.mark.integration
def test_user_creation(session):
    from strr_api.models import User

    user = User(lastname="Test")
    session.add(user)
    session.commit()
    assert session.query(User).count() == 1


def test_math():
    assert 1 + 1 == 2
