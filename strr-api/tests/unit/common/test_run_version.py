"""Tests for run_version helpers."""

from strr_api.common import run_version


def test_get_run_version_without_vcs_ref(monkeypatch):
    monkeypatch.delenv("VCS_REF", raising=False)
    ver = run_version.get_run_version()
    assert isinstance(ver, str)
    assert len(ver) > 0


def test_get_run_version_with_vcs_ref(monkeypatch):
    monkeypatch.setenv("VCS_REF", "deadbeef")
    ver = run_version.get_run_version()
    assert "deadbeef" in ver


def test_get_commit_hash_missing_env(monkeypatch):
    monkeypatch.delenv("VCS_REF", raising=False)
    assert run_version._get_commit_hash() is None


def test_get_commit_hash_literal_missing(monkeypatch):
    monkeypatch.setenv("VCS_REF", "missing")
    assert run_version._get_commit_hash() is None
