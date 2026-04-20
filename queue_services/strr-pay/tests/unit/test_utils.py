"""Unit tests for strr_pay.utils."""

from strr_pay.utils import _get_commit_hash
from strr_pay.utils import get_run_version


def test_get_commit_hash_returns_none_when_unset(monkeypatch):
    monkeypatch.delenv("VCS_REF", raising=False)
    assert _get_commit_hash() is None


def test_get_commit_hash_returns_none_when_placeholder_missing(monkeypatch):
    monkeypatch.setenv("VCS_REF", "missing")
    assert _get_commit_hash() is None


def test_get_commit_hash_returns_value_when_set(monkeypatch):
    monkeypatch.setenv("VCS_REF", "c0ffee")
    assert _get_commit_hash() == "c0ffee"


def test_get_run_version_without_commit_hash(mocker, monkeypatch):
    monkeypatch.delenv("VCS_REF", raising=False)
    mocker.patch("strr_pay.utils.version", return_value="0.1.0")
    assert get_run_version() == "0.1.0"


def test_get_run_version_appends_commit_hash(mocker, monkeypatch):
    monkeypatch.setenv("VCS_REF", "deadbeef")
    mocker.patch("strr_pay.utils.version", return_value="0.1.0")
    assert get_run_version() == "0.1.0-deadbeef"
