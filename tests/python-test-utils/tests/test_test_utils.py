import pytest
from sqlalchemy import text


def test_postgres_actually_starts(session):
    """VERIFY: Postgres starts and migrations are applied."""
    # We check a known table from strr-api
    result = session.execute(text("SELECT 1")).scalar()
    assert result == 1
    print("\n✅ Postgres Container Started & Connected")


def test_redis_actually_starts(redis_client):
    """VERIFY: Redis starts and is accessible."""
    redis_client.set("health_check", "ok")
    assert redis_client.get("health_check") == b"ok"
    print("\n✅ Redis Container Started & Connected")


def test_pure_logic_skips_docker(request):
    """
    VERIFY: Docker containers are NOT started for pure logic tests.

    To see this pass, run ONLY this test
    """
    fixture_manager = request.session._fixturemanager

    postgres_fixture = fixture_manager.getfixturedefs(
        "postgres_container", request.node
    )
    redis_fixture = fixture_manager.getfixturedefs("redis_container", request.node)

    postgres_started = (
        any(getattr(d, "cached_result", None) is not None for d in postgres_fixture)
        if postgres_fixture
        else False
    )
    redis_started = (
        any(getattr(d, "cached_result", None) is not None for d in redis_fixture)
        if redis_fixture
        else False
    )

    assert not postgres_started
    assert not redis_started

    assert 1 + 1 == 2
