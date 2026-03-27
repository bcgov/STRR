"""Validate the pyest-utils have been imported correctly."""


def test_user_creation(session):
    # 'session' triggers Postgres startup & Alembic migrations
    from strr_api.models import User

    user = User(lastname="Test")
    session.add(user)
    session.commit()
    assert session.query(User).count() == 1


def test_math():
    # No fixtures = No Docker = Instant execution
    assert 1 + 1 == 2
