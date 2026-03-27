import pytest
from testcontainers.redis import RedisContainer


@pytest.fixture(scope="session")
def redis_container(request):
    """Only starts Redis if 'redis_client' or 'redis_container' is requested."""
    needed_by_test = False
    for item in request.session.items:
        if (
            "redis_client" in item.fixturenames
            or "redis_container" in item.fixturenames
        ):
            needed_by_test = True
            break

    if not needed_by_test:
        return None

    with RedisContainer(image="redis:7-alpine") as container:
        yield container


@pytest.fixture(scope="function")
def redis_client(redis_container):
    client = redis_container.get_client()
    client.flushall()
    return client
