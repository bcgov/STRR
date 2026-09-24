"""Exercise every deployed consumer against the actual shared IAM utility.

These tests use only the standard library. External transport and dotenv are
stubbed so they cannot contact Google, read local credentials, or open a DB.
"""

import ast
import importlib.util
import os
import runpy
import sys
import tomllib
import unittest
from contextlib import ExitStack
from types import ModuleType
from unittest.mock import Mock, patch

from test_gcp_iam_vaults import DB_CONSUMERS, DB_FREE_CONSUMERS, REPO_ROOT

SHARED_PACKAGE = REPO_ROOT / "shared/python/cloud-sql-connector"
SHARED_DEPENDENCY = "../../shared/python/cloud-sql-connector"
LEGACY_ENV = {
    "DATABASE_HOST": "legacy-host",
    "DATABASE_PASSWORD": "legacy-password",
    "DATABASE_PORT": "5432",
    "DATABASE_UNIX_SOCKET": "/cloudsql/legacy-instance",
    "DATABASE_URL": "postgresql://legacy:password@legacy/db",
    "DATABASE_TEST_USERNAME": "test-user",
    "DATABASE_TEST_PASSWORD": "test-password",
    "DATABASE_TEST_HOST": "test-host",
    "DATABASE_TEST_NAME": "test-db",
    "SECRET_KEY": "test-only",
}
IAM_ENV = {
    "CLOUDSQL_INSTANCE_CONNECTION_NAME": "strr-dev:region:instance",
    "DATABASE_NAME": "strr-db",
    "DATABASE_USERNAME": "sa-job@strr-dev.iam",
}


def _connection_modules(consumer):
    """Find wiring from source, not a second manually maintained job list."""
    return [
        source
        for source in consumer.glob("src/**/*.py")
        if any(
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "sqlalchemy_settings_from_env"
            for node in ast.walk(ast.parse(source.read_text()))
        )
    ]


class GcpIamConsumerTest(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.transport = Mock()
        self.create_engine = Mock()
        google_connector = ModuleType("google.cloud.sql.connector")
        google_connector.Connector = Mock(return_value=self.transport)
        sqlalchemy = ModuleType("sqlalchemy")
        sqlalchemy.event = Mock()
        sqlalchemy.create_engine = self.create_engine
        orm = ModuleType("sqlalchemy.orm")
        orm.sessionmaker = Mock()
        dotenv = ModuleType("dotenv")
        dotenv.find_dotenv = Mock(return_value="")
        dotenv.load_dotenv = Mock()
        self.stack.enter_context(
            patch.dict(
                sys.modules,
                {
                    "google.cloud.sql.connector": google_connector,
                    "sqlalchemy": sqlalchemy,
                    "sqlalchemy.orm": orm,
                    "dotenv": dotenv,
                },
            )
        )
        spec = importlib.util.spec_from_file_location(
            "cloud_sql_connector",
            SHARED_PACKAGE / "src/cloud_sql_connector/__init__.py",
            submodule_search_locations=[
                str(SHARED_PACKAGE / "src/cloud_sql_connector")
            ],
        )
        package = importlib.util.module_from_spec(spec)
        # Force this checkout's implementation even if another package was imported.
        sys.modules.pop("cloud_sql_connector.connector", None)
        sys.modules["cloud_sql_connector"] = package
        spec.loader.exec_module(package)

    def load_connection_module(self, consumer, env):
        modules = _connection_modules(consumer)
        self.assertEqual(
            len(modules), 1, f"Missing or duplicate shared wiring: {consumer}"
        )
        with patch.dict(os.environ, env, clear=True):
            module = runpy.run_path(str(modules[0]))
            if "get_engine" in module:
                self.create_engine.reset_mock()
                module["get_engine"]()
                args, options = self.create_engine.call_args
                return module, [(args[0], options)]
            configurations = [
                module[class_name.rsplit(".", 1)[-1]]
                for class_name in set(module["CONFIGURATION"].values())
            ]
            if "get_named_config" in module:
                configurations.extend(
                    module["get_named_config"](name) for name in module["CONFIGURATION"]
                )
            return module, [
                (config.SQLALCHEMY_DATABASE_URI, config.SQLALCHEMY_ENGINE_OPTIONS)
                for config in configurations
            ]

    def test_every_consumer_uses_the_same_local_package(self):
        self.assertTrue(DB_CONSUMERS)
        for consumer in DB_CONSUMERS:
            with self.subTest(consumer=consumer.relative_to(REPO_ROOT)):
                project = tomllib.loads((consumer / "pyproject.toml").read_text())
                dependency = project["tool"]["poetry"]["dependencies"][
                    "cloud-sql-connector"
                ]
                self.assertEqual(dependency["path"], SHARED_DEPENDENCY)
                self.assertEqual(
                    (consumer / dependency["path"]).resolve(), SHARED_PACKAGE
                )
                lock = tomllib.loads((consumer / "poetry.lock").read_text())
                packages = [
                    p for p in lock["package"] if p["name"] == "cloud-sql-connector"
                ]
                self.assertEqual(len(packages), 1)
                self.assertEqual(
                    packages[0]["source"],
                    {"type": "directory", "url": SHARED_DEPENDENCY},
                )
                self.assertEqual(len(_connection_modules(consumer)), 1)

    def test_every_deployed_worker_is_classified(self):
        expected = set(DB_CONSUMERS) | {
            REPO_ROOT / consumer for consumer in DB_FREE_CONSUMERS
        }
        for pattern, parent_depth in (
            ("*/Dockerfile", 0),
            ("*/devops/gcp/clouddeploy.yaml", 2),
        ):
            discovered = {
                source.parents[parent_depth]
                for parent in ("jobs", "queue_services")
                for source in (REPO_ROOT / parent).glob(pattern)
            }
            self.assertEqual(discovered, expected, f"Unclassified worker: {pattern}")

    def test_database_free_exception_does_not_import_database_clients(self):
        for consumer in DB_FREE_CONSUMERS:
            for source in (REPO_ROOT / consumer).glob("src/**/*.py"):
                for node in ast.walk(ast.parse(source.read_text())):
                    names = []
                    if isinstance(node, ast.Import):
                        names = [alias.name for alias in node.names]
                    elif isinstance(node, ast.ImportFrom):
                        names = [node.module or ""]
                    with self.subTest(
                        source=source, line=getattr(node, "lineno", None)
                    ):
                        self.assertFalse(
                            {name.split(".")[0] for name in names}
                            & {
                                "cloud_sql_connector",
                                "sqlalchemy",
                                "flask_sqlalchemy",
                                "psycopg",
                                "psycopg2",
                                "pg8000",
                                "strr_api",
                            }
                        )

    def test_all_cloud_configurations_connect_with_iam_despite_legacy_credentials(self):
        for consumer in DB_CONSUMERS:
            for marker in ("CLOUD_RUN_JOB", "K_SERVICE"):
                with self.subTest(
                    consumer=consumer.relative_to(REPO_ROOT), marker=marker
                ):
                    _, settings = self.load_connection_module(
                        consumer,
                        {
                            **LEGACY_ENV,
                            **IAM_ENV,
                            marker: "strr-worker",
                            "FLASK_ENV": "test",
                        },
                    )
                    for uri, options in settings:
                        self.assertEqual(uri, "postgresql+pg8000://")
                        self.assertIn("creator", options)
                        self.transport.reset_mock()
                        options["creator"]()
                        self.transport.connect.assert_called_once_with(
                            instance_connection_string=IAM_ENV[
                                "CLOUDSQL_INSTANCE_CONNECTION_NAME"
                            ],
                            db=IAM_ENV["DATABASE_NAME"],
                            user=IAM_ENV["DATABASE_USERNAME"],
                            ip_type="PUBLIC",
                            driver="pg8000",
                            enable_iam_auth=True,
                        )

    def test_all_cloud_consumers_fail_when_required_iam_settings_are_missing(self):
        for consumer in DB_CONSUMERS:
            for marker in ("CLOUD_RUN_JOB", "K_SERVICE"):
                for missing in IAM_ENV:
                    with self.subTest(
                        consumer=consumer.relative_to(REPO_ROOT),
                        marker=marker,
                        missing=missing,
                    ):
                        env = {**LEGACY_ENV, **IAM_ENV, marker: "strr-worker"}
                        del env[missing]
                        with self.assertRaisesRegex(RuntimeError, missing):
                            self.load_connection_module(consumer, env)

    def test_local_test_database_overrides_remain_available(self):
        for consumer in DB_CONSUMERS:
            with self.subTest(consumer=consumer.relative_to(REPO_ROOT)):
                module, _ = self.load_connection_module(
                    consumer,
                    {
                        **LEGACY_ENV,
                        "DATABASE_USERNAME": "local-user",
                        "DATABASE_NAME": "local-db",
                    },
                )
                config = module.get("TestConfig")
                if config is not None and hasattr(config, "DATABASE_TEST_USERNAME"):
                    self.assertIn(
                        "test-user:test-password@test-host:5432/test-db",
                        config.SQLALCHEMY_DATABASE_URI,
                    )
                    self.assertNotIn("creator", config.SQLALCHEMY_ENGINE_OPTIONS)


if __name__ == "__main__":
    unittest.main()
