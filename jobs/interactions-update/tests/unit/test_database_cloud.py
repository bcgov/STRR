from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from interactions_update import database


@patch("interactions_update.database.create_engine")
@patch("google.cloud.sql.connector.Connector")
def test_get_engine_cloud_sql_happy_path(
    mock_connector_class, mock_create_engine, monkeypatch
):
    """Verify that get_engine correctly configures the Google Cloud SQL Connector."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_HOST", raising=False)
    monkeypatch.delenv("DATABASE_UNIX_SOCKET", raising=False)
    monkeypatch.setenv("CLOUDSQL_INSTANCE_CONNECTION_NAME", "project:region:instance")
    monkeypatch.setenv("CLOUDSQL_IP_TYPE", "PUBLIC")
    monkeypatch.setenv("DATABASE_USERNAME", "test-user")
    monkeypatch.setenv("DATABASE_NAME", "test-db")
    monkeypatch.setenv("MAX_WORKERS", "12")

    mock_connector_inst = MagicMock()
    mock_connector_class.return_value = mock_connector_inst

    database.get_engine()

    mock_connector_class.assert_called_once()
    args, kwargs = mock_create_engine.call_args
    assert args[0] == "postgresql+pg8000://"
    assert kwargs["pool_size"] == 12
    assert "creator" in kwargs

    kwargs["creator"]()

    mock_connector_inst.connect.assert_called_once_with(
        "project:region:instance",
        "pg8000",
        user="test-user",
        db="test-db",
        enable_iam_auth=True,
        ip_type=pytest.importorskip("google.cloud.sql.connector").IPTypes.PUBLIC,
    )


@patch("interactions_update.database.create_engine")
def test_get_engine_database_unix_socket_happy_path(mock_create_engine, monkeypatch):
    """Verify get_engine uses DATABASE_UNIX_SOCKET env contract used by other jobs."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_USERNAME", "test-user")
    monkeypatch.setenv("DATABASE_PASSWORD", "test-pass")
    monkeypatch.setenv("DATABASE_NAME", "test-db")
    monkeypatch.setenv("DATABASE_UNIX_SOCKET", "/cloudsql/project:region:instance")
    monkeypatch.setenv("MAX_WORKERS", "12")

    database.get_engine()

    args, kwargs = mock_create_engine.call_args
    assert (
        args[0]
        == "postgresql+pg8000://test-user:test-pass@/test-db?unix_sock=/cloudsql/project:region:instance/.s.PGSQL.5432"
    )
    assert kwargs["pool_size"] == 12
    assert kwargs["max_overflow"] == 5


@patch("interactions_update.database.create_engine")
def test_get_engine_database_host_port_happy_path(mock_create_engine, monkeypatch):
    """Verify get_engine supports host/port connection vars shared across jobs."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_USERNAME", "test-user")
    monkeypatch.setenv("DATABASE_PASSWORD", "test-pass")
    monkeypatch.setenv("DATABASE_NAME", "test-db")
    monkeypatch.setenv("DATABASE_HOST", "localhost")
    monkeypatch.setenv("DATABASE_PORT", "15432")

    database.get_engine()

    args, _kwargs = mock_create_engine.call_args
    assert args[0] == "postgresql+pg8000://test-user:test-pass@localhost:15432/test-db"
