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

    # Setup environment to trigger Cloud SQL branch (no DATABASE_URL)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("INSTANCE_CONNECTION_NAME", "project:region:instance")
    monkeypatch.setenv("DB_USER", "test-user")
    monkeypatch.setenv("DB_NAME", "test-db")
    monkeypatch.setenv("MAX_WORKERS", "12")

    # Setup Mock Connector instance
    mock_connector_inst = MagicMock()
    mock_connector_class.return_value = mock_connector_inst

    # Call the function
    database.get_engine()

    # Assertions
    # Verify Connector was instantiated
    mock_connector_class.assert_called_once()

    # Verify create_engine was called with the correct URL and pooling params
    args, kwargs = mock_create_engine.call_args
    assert args[0] == "postgresql+pg8000://"
    assert kwargs["pool_size"] == 12
    assert "creator" in kwargs

    # Verify the 'creator' function actually calls connector.connect when executed
    creator_func = kwargs["creator"]
    creator_func()

    mock_connector_inst.connect.assert_called_once_with(
        "project:region:instance",
        "pg8000",
        user="test-user",
        db="test-db",
        enable_iam_auth=True,
        ip_type=pytest.importorskip("google.cloud.sql.connector").IPTypes.PUBLIC,
    )
