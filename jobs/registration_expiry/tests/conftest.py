# # pylint: disable=C0114, W0613
# import pytest

# from registration_expiry.job import create_app


# @pytest.fixture(scope="session")
# def app(request):
#     """Return a session-wide application configured in TEST mode."""
#     _app = create_app("test")

#     with _app.app_context():
#         yield _app

pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
]
