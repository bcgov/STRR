"""Integration-only pytest hooks and fixtures."""

from __future__ import annotations

import pytest

from tests.unit.resources.conftest import ACCOUNT_ID, MOCK_INVOICE_RESPONSE
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, STRR_INVESTIGATOR, SYSTEM_ROLE, create_header

# Role strings (defined here so ``src`` and shared unit auth_helpers stay unchanged).
_ROLE_STRR_TESTER = "strr_tester"
_ROLE_STRR_CANCEL_REGISTRATION = "strr_cancel_registration"

# Stable JWT ``sub`` values so ``User.get_or_create_user_by_jwt`` maps to the same DB row across requests.
_INTEGRATION_EXAMINER_SUB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
_INTEGRATION_INVESTIGATOR_SUB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
_INTEGRATION_TESTER_SUB = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"


def pytest_collection_modifyitems(config, items) -> None:
    """Register ``integration`` marker on every test in this directory (for ``-m integration``)."""
    for item in items:
        path = str(getattr(item, "path", getattr(item, "fspath", ""))).replace("\\", "/")
        if "tests/integration/" in path:
            item.add_marker(pytest.mark.integration)


def pytest_collection_finish(session) -> None:
    """Integration-only runs measure a slice of ``src``; do not enforce global coverage ``fail_under``."""
    items = session.items or []
    if not items:
        return
    paths = [str(getattr(item, "path", getattr(item, "fspath", ""))).replace("\\", "/") for item in items]
    if not all("tests/integration/" in p for p in paths):
        return
    cov = session.config.pluginmanager.getplugin("_cov")
    if cov is not None and getattr(cov, "options", None) is not None:
        cov.options.cov_fail_under = 0


@pytest.fixture
def integration_account_id() -> int:
    """SBC-style account id used across STRR tests."""
    return ACCOUNT_ID


@pytest.fixture
def mock_invoice_response() -> dict:
    return MOCK_INVOICE_RESPONSE


@pytest.fixture
def headers_public_user(jwt):
    """JWT + ``Account-Id`` for a public (host) user."""

    def _make(account_id: int | str | None = ACCOUNT_ID, **kwargs):
        h = create_header(jwt, [PUBLIC_USER], **kwargs)
        if account_id is not None:
            h["Account-Id"] = str(account_id)
        return h

    return _make


@pytest.fixture
def headers_strr_examiner(jwt):
    """JWT for staff examiner (no Account-Id unless caller adds)."""

    def _make(**kwargs):
        kwargs.setdefault("sub", _INTEGRATION_EXAMINER_SUB)
        kwargs.setdefault("username", "integration-strr-examiner")
        return create_header(jwt, [STRR_EXAMINER], **kwargs)

    return _make


@pytest.fixture
def headers_strr_investigator(jwt):
    """JWT for staff investigator."""

    def _make(**kwargs):
        kwargs.setdefault("sub", _INTEGRATION_INVESTIGATOR_SUB)
        kwargs.setdefault("username", "integration-strr-investigator")
        return create_header(jwt, [STRR_INVESTIGATOR], **kwargs)

    return _make


@pytest.fixture
def headers_strr_tester(jwt):
    """JWT with ``strr_tester`` (expiry test endpoint)."""

    def _make(**kwargs):
        kwargs.setdefault("sub", _INTEGRATION_TESTER_SUB)
        kwargs.setdefault("username", "integration-strr-tester")
        return create_header(jwt, [_ROLE_STRR_TESTER], **kwargs)

    return _make


@pytest.fixture
def headers_system(jwt):
    """JWT with ``system`` role."""

    def _make(**kwargs):
        return create_header(jwt, [SYSTEM_ROLE], **kwargs)

    return _make


@pytest.fixture
def headers_strr_cancel(jwt):
    """JWT with ``strr_cancel_registration`` role."""

    def _make(**kwargs):
        kwargs.setdefault("sub", _INTEGRATION_EXAMINER_SUB)
        kwargs.setdefault("username", "integration-strr-cancel")
        return create_header(jwt, [_ROLE_STRR_CANCEL_REGISTRATION], **kwargs)

    return _make


@pytest.fixture
def serializable_host_registration(session, integration_account_id, random_string):
    """HOST registration with rental + primary contact so list/detail serialization succeeds."""
    from tests.integration.registration_seed import seed_serializable_host_registration

    suffix = random_string(10).upper().replace("-", "")[:10]
    reg_number = f"INT{suffix}"
    return seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number=reg_number,
    )


@pytest.fixture
def serializable_application(session, integration_account_id, serializable_host_registration):
    """HOST application tied to ``serializable_host_registration`` and listable by ``Account-Id``."""
    from strr_api.models.application import Application as AppModel
    from tests.integration.application_seed import generate_application_number, seed_listable_application

    return seed_listable_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=generate_application_number(),
        status=AppModel.Status.FULL_REVIEW.value,
    )
