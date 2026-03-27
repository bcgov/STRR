from http import HTTPStatus


def test_empty_post(client):
    """Quick test of an empty post, just pop off the Queue."""
    # simple test
    res = client.post("/")

    assert res.status_code == HTTPStatus.OK
