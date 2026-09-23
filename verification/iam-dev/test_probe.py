"""Guard and failure-path tests; no live credentials or database connections."""

import contextlib
import io
import json
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import make_build_config
import probe


class ProbeTests(unittest.TestCase):
    def setUp(self):
        from cloud_sql_connector import connector as helper

        self.helper = helper
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        self.addCleanup(setattr, helper, "_connector", None)
        source = Mock(service_account_email=probe.BUILD_IDENTITY)
        self.source = source
        self.default = self.stack.enter_context(
            patch("google.auth.default", return_value=(source, probe.BUILD_PROJECT))
        )
        self.credentials = self.stack.enter_context(patch("google.auth.impersonated_credentials.Credentials"))
        self.credentials.side_effect = lambda **args: Mock(service_account_email=args["target_principal"])
        self.connector = self.stack.enter_context(patch("google.cloud.sql.connector.Connector"))
        self.close = self.stack.enter_context(patch.object(helper, "close_connector"))
        self.engines = []
        self.statements = []
        self.missing_dml = 0
        self.table_total = 1
        self.row_security = 0
        self.wrong_user = False
        self.create_engine = self.stack.enter_context(patch("sqlalchemy.create_engine", side_effect=self.make_engine))

    def make_engine(self, uri, **options):
        self.assertEqual(uri, "postgresql+pg8000://")
        self.assertTrue(callable(options["creator"]))
        name = self.credentials.call_args_list[-1].kwargs["target_principal"].split("@")[0]
        username = f"{name}@bcrbk9-dev.iam"
        engine = Mock()
        connection = Mock()
        connection_context = Mock()
        connection_context.__enter__ = Mock(return_value=connection)
        connection_context.__exit__ = Mock(return_value=False)
        engine.connect.return_value = connection_context
        seen = []

        def execute(statement):
            sql = str(statement)
            seen.append(sql)
            if sql.startswith("SET "):
                return Mock()
            self.assertEqual(seen[:2], ["SET TRANSACTION READ ONLY", "SET LOCAL statement_timeout = '5s'"])
            label = next(key for key, value in probe.QUERIES.items() if value == sql)
            rows = {
                "identity": [
                    {
                        "current_user": "unexpected" if self.wrong_user else username,
                        "session_user": username,
                        "current_database": "strr-db",
                        "read_only": "on",
                        "schema_usage": True,
                    }
                ],
                "server": [{"version_number": "180006"}],
                "extensions": [{"extname": "postgis", "extversion": "3.6.4"}],
                "roles": [{"rolname": "readwrite", "usable": True}],
                "tables": [
                    {
                        "total": self.table_total,
                        "missing_select": 0,
                        "missing_dml": self.missing_dml,
                        "with_row_security": self.row_security,
                    }
                ],
                "sequences": [{"total": 1, "missing_privileges": 0}],
            }
            return SimpleNamespace(mappings=lambda: rows[label])

        connection.execute.side_effect = execute
        self.engines.append((engine, connection))
        self.statements.append(seen)
        return engine

    def test_both_fixed_identities_use_read_only_catalog_transactions(self):
        result = probe.main()
        self.assertTrue(result["success"])
        self.assertFalse(result["consumersVerified"])
        self.assertEqual(len(result["principals"]), 2)
        self.assertEqual(
            [call.kwargs["target_principal"] for call in self.credentials.call_args_list],
            ["sa-api@bcrbk9-dev.iam.gserviceaccount.com", "sa-job@bcrbk9-dev.iam.gserviceaccount.com"],
        )
        self.assertTrue(all(call.kwargs["lifetime"] == 600 for call in self.credentials.call_args_list))
        for engine, connection in self.engines:
            connection.begin.return_value.rollback.assert_called_once()
            engine.dispose.assert_called_once()
        self.assertEqual(self.close.call_count, 2)

    def test_wrong_worker_stops_before_impersonation(self):
        self.source.service_account_email = "unexpected@example.test"
        with self.assertRaisesRegex(ValueError, "build_identity_mismatch"):
            probe.main()
        self.credentials.assert_not_called()

    def test_wrong_helper_stops_before_authentication(self):
        with patch.object(probe, "HELPER_SHA256", "wrong"), self.assertRaisesRegex(
            ValueError, "helper_source_mismatch"
        ):
            probe.main()
        self.default.assert_not_called()

    def test_wrong_database_identity_fails_and_rolls_back_both_connections(self):
        self.wrong_user = True
        result = probe.main()
        self.assertFalse(result["success"])
        self.assertTrue(all(not row["loginVerified"] for row in result["principals"]))
        for engine, connection in self.engines:
            connection.begin.return_value.rollback.assert_called_once()
            engine.dispose.assert_called_once()

    def test_missing_write_privilege_is_not_a_login_failure(self):
        self.missing_dml = 1
        result = probe.main()
        self.assertFalse(result["success"])
        self.assertTrue(all(row["loginVerified"] and not row["writeCatalogReady"] for row in result["principals"]))

    def test_impersonation_failure_is_redacted_and_next_identity_is_attempted(self):
        failed = Mock(service_account_email="sa-api@bcrbk9-dev.iam.gserviceaccount.com")
        failed.refresh.side_effect = RuntimeError("private token diagnostic")
        succeeded = Mock(service_account_email="sa-job@bcrbk9-dev.iam.gserviceaccount.com")
        self.credentials.side_effect = [failed, succeeded]
        result = probe.main()
        self.assertFalse(result["success"])
        self.assertEqual(self.credentials.call_count, 2)
        self.assertEqual(result["principals"][0]["errorStage"], "impersonation")
        self.assertTrue(result["principals"][1]["loginVerified"])
        self.assertNotIn("private token diagnostic", json.dumps(result))
        self.assertEqual(self.close.call_count, 2)

    def test_empty_schema_is_not_ready(self):
        self.table_total = 0
        self.assertFalse(probe.main()["success"])

    def test_row_security_requires_further_review(self):
        self.row_security = 1
        self.assertFalse(probe.main()["success"])

    def test_cleanup_failure_does_not_claim_success(self):
        self.close.side_effect = RuntimeError("private diagnostic")
        result = probe.main()
        self.assertFalse(result["success"])
        self.assertTrue(all(row["cleanupErrorType"] == "RuntimeError" for row in result["principals"]))
        self.assertNotIn("private diagnostic", json.dumps(result))

    def test_exception_diagnostics_are_redacted(self):
        def fail():
            print("private stdout")
            raise RuntimeError("private exception detail")

        output = io.StringIO()
        with patch.object(probe, "main", side_effect=fail), contextlib.redirect_stdout(output):
            code = probe.run()
        self.assertEqual(code, 1)
        self.assertEqual(
            json.loads(output.getvalue()),
            {"success": False, "errorStage": "initialization", "errorType": "RuntimeError"},
        )


class BuildConfigTests(unittest.TestCase):
    def test_render_is_no_source_and_contains_the_reviewed_probe(self):
        config = make_build_config.build_config()
        self.assertNotIn("source", config)
        self.assertNotIn("availableSecrets", config)
        self.assertEqual(len(config["steps"]), 1)
        step = config["steps"][0]
        self.assertIn("@sha256:", step["name"])
        self.assertIn((make_build_config.DIRECTORY / "probe.py").read_text(), step["script"])
        self.assertIn("--require-hashes", step["script"])
        self.assertIn("--no-deps --no-build-isolation", step["script"])


if __name__ == "__main__":
    unittest.main()
