# Copyright © 2025 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Unit tests for the cloud SQL connector module."""

import sys
from unittest.mock import MagicMock, Mock, call, patch

import pytest
from sqlalchemy import create_engine

from cloud_sql_connector.connector import (
    DBConfig,
    close_connector,
    database_uri_from_env,
    getconn,
    sqlalchemy_settings_from_env,
    setup_pg8000_close_event_listener,
    setup_search_path_event_listener,
)


class TestDBConfig:
    """Test the DBConfig dataclass."""

    def test_db_config_creation(self):
        """Test creating a DBConfig instance."""
        config = DBConfig(
            instance_name="project:region:instance",
            database="test_db",
            user="test_user",
            ip_type="public",
            schema="test_schema",
        )

        assert config.instance_name == "project:region:instance"
        assert config.database == "test_db"
        assert config.user == "test_user"
        assert config.ip_type == "public"
        assert config.schema == "test_schema"

    def test_db_config_empty_schema(self):
        """Test creating a DBConfig instance with empty schema."""
        config = DBConfig(
            instance_name="project:region:instance",
            database="test_db",
            user="test_user",
            ip_type="public",
            schema="",
        )

        assert config.schema == ""


class TestEnvironmentSettings:
    """Test SQLAlchemy configuration derived from environment values."""

    @pytest.mark.parametrize("use_socket", [False, True], ids=["tcp", "unix"])
    @pytest.mark.parametrize(
        "username,password",
        [
            ("user", "password"),
            ("user", "synthetic@pw"),
            ("user", "synthetic%40pw"),
            ("user:name@example.com", "synthetic:/?#[]%+ pw"),
        ],
    )
    def test_local_credentials_reach_driver_unchanged(
        self, use_socket, username, password
    ):
        """Preserve literal credentials through SQLAlchemy URI parsing."""
        values = {
            "DATABASE_USERNAME": username,
            "DATABASE_PASSWORD": password,
            "DATABASE_NAME": "database",
            "DATABASE_HOST": "localhost",
            "DATABASE_PORT": "5433",
        }
        expected = {"user": username, "password": password, "database": "database"}
        if use_socket:
            values["DATABASE_UNIX_SOCKET"] = "/tmp/synthetic-socket"
            expected["unix_sock"] = "/tmp/synthetic-socket/.s.PGSQL.5432"
        else:
            expected.update(host="localhost", port=5433)

        uri, engine_options = sqlalchemy_settings_from_env(values)
        assert uri == database_uri_from_env(values)
        engine = create_engine(uri, **engine_options)
        try:
            _, actual = engine.dialect.create_connect_args(engine.url)
            assert actual == expected
        finally:
            engine.dispose()

    def test_database_uri(self):
        """Build a TCP URI for local development."""
        uri = database_uri_from_env(
            {
                "DATABASE_USERNAME": "user",
                "DATABASE_PASSWORD": "password",
                "DATABASE_NAME": "database",
                "DATABASE_HOST": "localhost",
                "DATABASE_PORT": "5433",
            }
        )

        assert uri == "postgresql+pg8000://user:password@localhost:5433/database"

    def test_database_uri_with_unix_socket(self):
        """Build a Unix socket URI when configured."""
        uri = database_uri_from_env(
            {
                "DATABASE_USERNAME": "user",
                "DATABASE_PASSWORD": "password",
                "DATABASE_NAME": "database",
                "DATABASE_UNIX_SOCKET": "/cloudsql/instance",
            }
        )

        assert (
            uri == "postgresql+pg8000://user:password@/database"
            "?unix_sock=/cloudsql/instance/.s.PGSQL.5432"
        )

    def test_local_sqlalchemy_settings(self):
        """Use a standard URI and no engine options locally."""
        uri, engine_options = sqlalchemy_settings_from_env(
            {
                "DATABASE_USERNAME": "user",
                "DATABASE_PASSWORD": "password",
                "DATABASE_NAME": "database",
                "DATABASE_HOST": "localhost",
            }
        )

        assert uri == "postgresql+pg8000://user:password@localhost:5432/database"
        assert engine_options == {}

    @pytest.mark.parametrize("runtime_variable", ["K_SERVICE", "CLOUD_RUN_JOB"])
    @patch("cloud_sql_connector.connector.getconn")
    def test_cloud_sqlalchemy_settings(self, mock_getconn, runtime_variable):
        """Use a connection creator for deployed Cloud SQL IAM access."""
        uri, engine_options = sqlalchemy_settings_from_env(
            {
                runtime_variable: "service",
                "CLOUDSQL_INSTANCE_CONNECTION_NAME": "project:region:instance",
                "DATABASE_NAME": "database",
                "DATABASE_USERNAME": "service-account",
                "CLOUDSQL_IP_TYPE": "private",
            }
        )

        assert uri == "postgresql+pg8000://"
        engine_options["creator"]()
        assert mock_getconn.call_args.args[0] == DBConfig(
            instance_name="project:region:instance",
            database="database",
            user="service-account",
            ip_type="PRIVATE",
            schema="",
        )

    @patch("cloud_sql_connector.connector.getconn")
    def test_cloud_sqlalchemy_settings_with_custom_iam_username(self, mock_getconn):
        """Use the requested IAM username without falling back to legacy values."""
        uri, engine_options = sqlalchemy_settings_from_env(
            {
                "CLOUDSQL_INSTANCE_CONNECTION_NAME": "project:region:instance",
                "DATABASE_NAME": "database",
                "DATABASE_MIGRATION_USERNAME": "migration-service-account",
                "DATABASE_USERNAME": "legacy-user",
                "DATABASE_PASSWORD": "legacy-password",
                "DATABASE_HOST": "legacy-host",
                "DATABASE_UNIX_SOCKET": "/cloudsql/legacy-instance",
            },
            iam_username_env="DATABASE_MIGRATION_USERNAME",
        )

        assert uri == "postgresql+pg8000://"
        engine_options["creator"]()
        assert mock_getconn.call_args.args[0] == DBConfig(
            instance_name="project:region:instance",
            database="database",
            user="migration-service-account",
            ip_type="PUBLIC",
            schema="",
        )

    @pytest.mark.parametrize("runtime_variable", ["K_SERVICE", "CLOUD_RUN_JOB"])
    def test_cloud_sqlalchemy_settings_require_values(self, runtime_variable):
        """Report every required Cloud SQL IAM value that is absent."""
        with pytest.raises(
            RuntimeError,
            match=(
                "Missing Cloud SQL IAM environment variables: "
                "CLOUDSQL_INSTANCE_CONNECTION_NAME, DATABASE_NAME, DATABASE_USERNAME"
            ),
        ):
            sqlalchemy_settings_from_env({runtime_variable: "service"})

    @pytest.mark.parametrize("runtime_variable", ["K_SERVICE", "CLOUD_RUN_JOB"])
    @pytest.mark.parametrize(
        "missing_variable",
        ["CLOUDSQL_INSTANCE_CONNECTION_NAME", "DATABASE_NAME", "DATABASE_USERNAME"],
    )
    def test_cloud_run_missing_iam_config_never_falls_back_to_password(
        self, runtime_variable, missing_variable
    ):
        """Reject incomplete deployed IAM config even with usable legacy settings."""
        values = {
            runtime_variable: "strr-runtime",
            "CLOUDSQL_INSTANCE_CONNECTION_NAME": "project:region:instance",
            "DATABASE_NAME": "database",
            "DATABASE_USERNAME": "runtime@project.iam",
            "DATABASE_PASSWORD": "legacy-password",
            "DATABASE_HOST": "legacy-host",
            "DATABASE_UNIX_SOCKET": "/cloudsql/legacy-instance",
        }
        del values[missing_variable]

        with pytest.raises(RuntimeError, match=missing_variable):
            sqlalchemy_settings_from_env(values)

    @pytest.mark.parametrize("runtime_variable", ["K_SERVICE", "CLOUD_RUN_JOB"])
    @patch("cloud_sql_connector.connector.Connector")
    @patch("cloud_sql_connector.connector._connector", None)
    def test_cloud_run_ignores_password_and_creates_connector_lazily(
        self, mock_connector_class, runtime_variable
    ):
        """Acquire IAM credentials only at first connection, never during config import."""
        uri, engine_options = sqlalchemy_settings_from_env(
            {
                runtime_variable: "strr-runtime",
                "CLOUDSQL_INSTANCE_CONNECTION_NAME": "project:region:instance",
                "DATABASE_NAME": "database",
                "DATABASE_USERNAME": "runtime@project.iam",
                "DATABASE_PASSWORD": "legacy-password",
                "DATABASE_HOST": "legacy-host",
                "DATABASE_PORT": "9999",
                "DATABASE_UNIX_SOCKET": "/cloudsql/legacy-instance",
            }
        )

        assert uri == "postgresql+pg8000://"
        mock_connector_class.assert_not_called()
        engine = create_engine(uri, **engine_options)
        try:
            mock_connector_class.assert_not_called()
            first_connection = engine_options["creator"]()
            second_connection = engine_options["creator"]()
            mock_connector_class.assert_called_once_with(refresh_strategy="lazy")
            connector = mock_connector_class.return_value
            assert first_connection is connector.connect.return_value
            assert second_connection is first_connection
            connector.connect.assert_has_calls(
                [
                    call(
                        instance_connection_string="project:region:instance",
                        db="database",
                        user="runtime@project.iam",
                        ip_type="PUBLIC",
                        driver="pg8000",
                        enable_iam_auth=True,
                    )
                ]
                * 2
            )
        finally:
            engine.dispose()
            close_connector()

    def test_cloud_sqlalchemy_settings_require_custom_iam_username(self):
        """Name the configured IAM username variable when it is absent."""
        with pytest.raises(
            RuntimeError,
            match=(
                "Missing Cloud SQL IAM environment variables: "
                "DATABASE_MIGRATION_USERNAME"
            ),
        ):
            sqlalchemy_settings_from_env(
                {
                    "CLOUDSQL_INSTANCE_CONNECTION_NAME": "project:region:instance",
                    "DATABASE_NAME": "database",
                    "DATABASE_USERNAME": "application-service-account",
                },
                iam_username_env="DATABASE_MIGRATION_USERNAME",
            )

    def test_cloud_sqlalchemy_settings_validate_ip_type(self):
        """Reject connector IP types other than public and private."""
        with pytest.raises(
            RuntimeError, match="CLOUDSQL_IP_TYPE must be PUBLIC or PRIVATE"
        ):
            sqlalchemy_settings_from_env(
                {
                    "CLOUDSQL_INSTANCE_CONNECTION_NAME": "project:region:instance",
                    "DATABASE_NAME": "database",
                    "DATABASE_USERNAME": "service-account",
                    "CLOUDSQL_IP_TYPE": "invalid",
                }
            )


class TestGetconn:
    """Test the getconn function."""

    @patch("cloud_sql_connector.connector._connector")
    def test_getconn_without_schema(self, mock_connector):
        """Test getconn function without schema."""
        # Setup mocks
        mock_connection = Mock()
        mock_connector.connect.return_value = mock_connection

        # Create config without schema
        config = DBConfig(
            instance_name="project:region:instance",
            database="test_db",
            user="test_user",
            ip_type="public",
            schema="",
        )

        # Call function
        result = getconn(config)

        # Assertions
        mock_connector.connect.assert_called_once_with(
            instance_connection_string="project:region:instance",
            db="test_db",
            user="test_user",
            ip_type="public",
            driver="pg8000",
            enable_iam_auth=True,
        )
        assert result == mock_connection

    @patch("cloud_sql_connector.connector._connector")
    def test_getconn_with_schema(self, mock_connector):
        """Test getconn function with schema."""
        # Setup mocks
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_connector.connect.return_value = mock_connection

        # Create config with schema
        config = DBConfig(
            instance_name="project:region:instance",
            database="test_db",
            user="test_user",
            ip_type="public",
            schema="test_schema",
        )

        # Call function
        result = getconn(config)

        # Assertions
        mock_connector.connect.assert_called_once_with(
            instance_connection_string="project:region:instance",
            db="test_db",
            user="test_user",
            ip_type="public",
            driver="pg8000",
            enable_iam_auth=True,
        )

        # Check cursor calls for schema setup
        mock_connection.cursor.assert_called()
        expected_calls = [
            call("SET search_path TO test_schema,public"),
            call("SET LOCAL search_path TO test_schema, public;"),
        ]
        mock_cursor.execute.assert_has_calls(expected_calls)
        mock_cursor.close.assert_called_once()

        assert result == mock_connection


class TestCloseConnector:
    """Test the close_connector function."""

    @patch("cloud_sql_connector.connector._connector")
    def test_close_connector_closes_singleton(self, mock_connector):
        """Test close_connector closes and clears the singleton connector."""
        close_connector()

        mock_connector.close.assert_called_once_with()

        from cloud_sql_connector import connector

        assert connector._connector is None

    @patch("cloud_sql_connector.connector._connector", None)
    def test_close_connector_without_singleton(self):
        """Test close_connector is a no-op when the singleton is unset."""
        close_connector()


class TestSetupSearchPathEventListener:
    """Test the setup_search_path_event_listener function."""

    @patch("cloud_sql_connector.connector.event")
    def test_setup_search_path_event_listener(self, mock_event):
        """Test setting up the search path event listener."""
        mock_engine = Mock()
        schema = "test_schema"

        # Call function
        setup_search_path_event_listener(mock_engine, schema)

        # Verify event listener is set up
        mock_event.listens_for.assert_called_once_with(mock_engine, "checkout")

    @patch("cloud_sql_connector.connector.event")
    def test_event_listener_callback(self, mock_event):
        """Test the event listener callback function."""
        mock_engine = Mock()
        schema = "test_schema"

        # Capture the callback function
        callback_function = None

        def capture_callback(engine, event_name):
            def decorator(func):
                nonlocal callback_function
                callback_function = func
                return func

            return decorator

        mock_event.listens_for.side_effect = capture_callback

        # Setup the event listener
        setup_search_path_event_listener(mock_engine, schema)

        # Test the callback
        mock_dbapi_connection = Mock()
        mock_cursor = Mock()
        mock_dbapi_connection.cursor.return_value = mock_cursor

        mock_connection_record = Mock()
        mock_connection_proxy = Mock()

        # Call the callback
        callback_function(
            mock_dbapi_connection, mock_connection_record, mock_connection_proxy
        )

        # Verify cursor operations
        mock_dbapi_connection.cursor.assert_called_once()
        mock_cursor.execute.assert_called_once_with(
            "SET search_path TO test_schema,public"
        )
        mock_cursor.close.assert_called_once()


class TestSetupPg8000CloseEventListener:
    """Test the setup_pg8000_close_event_listener function."""

    @patch("cloud_sql_connector.connector.event")
    def test_setup_pg8000_close_event_listener_non_pg8000(self, mock_event):
        """Test setting up the event listener skips when driver is not pg8000."""
        mock_engine = Mock()
        mock_engine.driver = "psycopg2"

        # Call function
        setup_pg8000_close_event_listener(mock_engine)

        # Verify event listener is NOT set up
        mock_event.listens_for.assert_not_called()

    @patch("cloud_sql_connector.connector.event")
    def test_setup_pg8000_close_event_listener(self, mock_event):
        """Test setting up the pg8000 close event listener."""
        mock_engine = Mock()
        mock_engine.driver = "pg8000"

        # Call function
        setup_pg8000_close_event_listener(mock_engine)

        # Verify event listener is set up
        mock_event.listens_for.assert_called_once_with(mock_engine, "connect")

    @patch("cloud_sql_connector.connector.event")
    def test_event_listener_callback_normal_close(self, mock_event):
        """Test the event listener callback function with normal close."""
        mock_engine = Mock()
        mock_engine.driver = "pg8000"

        # Capture the callback function
        callback_function = None

        def capture_callback(engine, event_name):
            def decorator(func):
                nonlocal callback_function
                callback_function = func
                return func

            return decorator

        mock_event.listens_for.side_effect = capture_callback

        # Setup the event listener
        setup_pg8000_close_event_listener(mock_engine)

        # Test the callback
        mock_dbapi_conn = Mock()
        original_close = mock_dbapi_conn.close
        mock_connection_record = Mock()

        # Call the callback to setup the wrapper
        callback_function(mock_dbapi_conn, mock_connection_record)

        # Now mock_dbapi_conn.close should be the wrapped safe_close
        mock_dbapi_conn.close()

        # original_close should have been called
        original_close.assert_called_once()

    @patch("cloud_sql_connector.connector.event")
    def test_event_listener_callback_interface_error(self, mock_event):
        """Test the event listener callback function suppressing InterfaceError."""
        mock_engine = Mock()
        mock_engine.driver = "pg8000"

        # Capture the callback function
        callback_function = None

        def capture_callback(engine, event_name):
            def decorator(func):
                nonlocal callback_function
                callback_function = func
                return func

            return decorator

        mock_event.listens_for.side_effect = capture_callback

        # Setup the event listener
        setup_pg8000_close_event_listener(mock_engine)

        # Mock the dbapi_conn and its close method to raise InterfaceError
        try:
            from pg8000.exceptions import InterfaceError
        except ImportError:
            InterfaceError = Exception

        mock_dbapi_conn = Mock()
        original_close = Mock(side_effect=InterfaceError("Test InterfaceError"))
        mock_dbapi_conn.close = original_close
        mock_connection_record = Mock()

        # Call the callback to setup the wrapper
        callback_function(mock_dbapi_conn, mock_connection_record)

        # Now mock_dbapi_conn.close should be the wrapped safe_close
        # This shouldn't raise any exception
        mock_dbapi_conn.close()

        # original_close should have been called
        original_close.assert_called_once()

    @patch("cloud_sql_connector.connector.event")
    def test_event_listener_callback_value_error(self, mock_event):
        """Test the event listener callback suppresses ValueError (e.g. "write to closed
        file", observed in production when the underlying socket is already closed)."""
        mock_engine = Mock()
        mock_engine.driver = "pg8000"
        callback_function = None

        def capture_callback(engine, event_name):
            def decorator(func):
                nonlocal callback_function
                callback_function = func
                return func

            return decorator

        mock_event.listens_for.side_effect = capture_callback

        # Setup the event listener
        setup_pg8000_close_event_listener(mock_engine)

        # Mock the dbapi_conn and its close method to raise ValueError
        mock_dbapi_conn = Mock()
        original_close = Mock(side_effect=ValueError("write to closed file"))
        mock_dbapi_conn.close = original_close
        mock_connection_record = Mock()

        # Call the callback to setup the wrapper
        callback_function(mock_dbapi_conn, mock_connection_record)

        # Now mock_dbapi_conn.close should be the wrapped safe_close
        # This shouldn't raise any exception
        mock_dbapi_conn.close()

        # original_close should have been called
        original_close.assert_called_once()

    @patch("cloud_sql_connector.connector.event")
    def test_event_listener_callback_os_error(self, mock_event):
        """Test the event listener callback suppresses OSError (e.g. a broken pipe when the
        Cloud SQL Auth Proxy sidecar is torn down before the app during Cloud Run scale-down).
        """
        mock_engine = Mock()
        mock_engine.driver = "pg8000"
        callback_function = None

        def capture_callback(engine, event_name):
            def decorator(func):
                nonlocal callback_function
                callback_function = func
                return func

            return decorator

        mock_event.listens_for.side_effect = capture_callback

        # Setup the event listener
        setup_pg8000_close_event_listener(mock_engine)

        # Mock the dbapi_conn and its close method to raise OSError
        mock_dbapi_conn = Mock()
        original_close = Mock(side_effect=OSError("Broken pipe"))
        mock_dbapi_conn.close = original_close
        mock_connection_record = Mock()

        # Call the callback to setup the wrapper
        callback_function(mock_dbapi_conn, mock_connection_record)

        # Now mock_dbapi_conn.close should be the wrapped safe_close
        # This shouldn't raise any exception
        mock_dbapi_conn.close()

        # original_close should have been called
        original_close.assert_called_once()
