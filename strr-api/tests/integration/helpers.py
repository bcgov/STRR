"""Shared helpers for API integration tests."""

from __future__ import annotations

import json
from http import HTTPStatus
from pathlib import Path
from typing import Any

from werkzeug.test import TestResponse

PUBLIC_ROUTES = frozenset(
    {
        ("GET", "/ops/healthz"),
        ("GET", "/ops/readyz"),
        ("GET", "/meta/info"),
    }
)


def tests_dir() -> Path:
    return Path(__file__).resolve().parent.parent


def load_mock_json(*parts: str) -> Any:
    """Load JSON from ``tests/mocks/json`` (paths relative to that dir)."""
    path = tests_dir() / "mocks" / "json" / Path(*parts)
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def resolve_path(rule: str) -> str:
    """Turn a Werkzeug ``rule`` into a concrete URL for smoke / auth tests."""
    if "/<path:action>" in rule:
        if "permits" in rule:
            return rule.replace("<path:action>", ":validatePermit")
        return rule.replace("<path:action>", "requirements")
    path = rule
    # Distinct paths so parametrized test ids stay unique for string vs default converter.
    path = path.replace("<string:application_number>", "9000002")
    path = path.replace("<application_number>", "9000001")
    path = path.replace("<registration_id>", "1")
    path = path.replace("<registration_number>", "R9000001")
    path = path.replace("<snapshot_id>", "1")
    path = path.replace("<file_key>", "fake-file-key")
    return path


def resolve_path_for_unauth(rule: str) -> str:
    """Like ``resolve_path`` but adds minimal query strings where routes expect them."""
    p = resolve_path(rule)
    if p == "/accounts/search":
        return f"{p}?name=test"
    if p == "/applications/search":
        return f"{p}?text=test"
    if p == "/registrations/search":
        return f"{p}?text=test"
    if p.endswith("/user/search"):
        return f"{p}?text=test"
    return p


def assert_status(rv: TestResponse, expected: HTTPStatus | int, msg: str = "") -> None:
    assert rv.status_code == int(expected), msg or f"expected {expected}, got {rv.status_code}: {rv.data!r}"


def assert_json_keys(rv: TestResponse, *keys: str) -> dict[str, Any]:
    assert rv.is_json, "response is not JSON"
    data = rv.get_json()
    assert isinstance(data, dict), data
    for k in keys:
        assert k in data, f"missing key {k!r} in {data!r}"
    return data


def routes_with_prefix(routes: frozenset[tuple[str, str]], prefix: str) -> list[tuple[str, str]]:
    """Return sorted (method, rule) pairs under ``prefix`` (exact rule or ``prefix/…``)."""
    out = [(m, r) for m, r in routes if r == prefix or r.startswith(prefix + "/")]
    return sorted(out)


def unauthenticated_request(client, method: str, path: str):
    """Perform one HTTP call without ``Authorization`` (for auth contract tests)."""
    if method == "GET":
        return client.get(path)
    if method == "DELETE":
        return client.delete(path)
    if method == "POST" and path == "/documents":
        return client.post(path, data={}, content_type="multipart/form-data")
    if method in ("POST", "PUT", "PATCH"):
        return client.open(path, method=method, json={})
    raise ValueError(method)


def collect_strr_routes(app) -> frozenset[tuple[str, str]]:
    """All (method, rule) for the app excluding Flasgger and static."""
    out: set[tuple[str, str]] = set()
    for rule in app.url_map.iter_rules():
        if rule.endpoint.startswith("flasgger") or rule.endpoint == "static":
            continue
        for method in rule.methods - {"HEAD", "OPTIONS"}:
            out.add((method, rule.rule))
    return frozenset(out)


def protected_routes_with_prefix(app, prefix: str) -> list[tuple[str, str]]:
    """Collect protected routes matching ``prefix`` from the running app map."""
    return routes_with_prefix(collect_strr_routes(app) - PUBLIC_ROUTES, prefix)
