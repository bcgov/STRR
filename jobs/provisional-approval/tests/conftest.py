import pytest
from strr_api.models.application import Application
from strr_api.models.rental import Registration
from strr_test_utils.parent_fixtures import seed_parent_user_registration_application

from provisional_approval.config import TestConfig
from provisional_approval.job import create_app

pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
    "strr_test_utils.parent_fixtures",
]


@pytest.fixture(scope="session")
def app(db_engine):
    """
    Flask app for integration tests.

    The job package is ``provisional_approval`` while the repo folder is
    ``provisional-approval`` (job name); wire ``create_app`` here so
    strr_test_utils can run integration tests against this app.
    """
    TestConfig.SQLALCHEMY_DATABASE_URI = str(db_engine.url)
    _app = create_app("test")
    with _app.app_context():
        yield _app


@pytest.fixture
def job_app(mocker):
    """Flask app for unit tests (DB not initialized)."""
    mocker.patch("provisional_approval.job.db.init_app")
    return create_app("unittest")


@pytest.fixture
def seed_full_review_host_renewal_application(session, random_string, random_integer):
    """
    User + Registration + Application from ``strr_test_utils.parent_fixtures``,
    defaulted for ``get_applications_in_full_review_status``. Pass keyword
    arguments to override ``Application`` fields (e.g. ``status``, ``type``).
    """

    def _seed(**application_kwargs):
        defaults = {
            "type": "renewal",
            "status": Application.Status.FULL_REVIEW,
            "registration_type": Registration.RegistrationType.HOST,
            "application_json": {"header": {}},
            "application_number": Application.generate_unique_application_number(),
        }
        merged = {**defaults, **application_kwargs}
        data = seed_parent_user_registration_application(
            session,
            random_string,
            random_integer,
            application_kwargs=merged,
        )
        app_row = data["application"]
        if app_row.submitter_id is None:
            app_row.submitter_id = data["user"].id
            session.flush()
        return data

    return _seed
