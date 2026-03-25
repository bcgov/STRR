import pytest
from testcontainers.redis import RedisContainer

@pytest.fixture(scope="session")
def redis_container():
    with RedisContainer(image="redis:7-alpine") as container:
        yield container

@pytest.fixture(scope="function")
def redis_client(redis_container):
    client = redis_container.get_client()
    client.flushall()
    return client