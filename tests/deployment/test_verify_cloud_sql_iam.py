"""Exercise smoke-check decisions and read-only SQL without Google credentials."""

import contextlib
import importlib.util
import io
import json
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch


SCRIPT = Path(__file__).resolve().parents[2] / "scripts/verify-cloud-sql-iam.py"
SPEC = importlib.util.spec_from_file_location("verify_cloud_sql_iam", SCRIPT)
SMOKE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SMOKE)
IAM_ENV = {
    "CLOUDSQL_INSTANCE_CONNECTION_NAME": "project:region:instance",
    "DATABASE_NAME": "strr-db",
    "DATABASE_USERNAME": "sa-api@project.iam",
}


class Result:
    def __init__(self, value):
        self.value = value

    def scalar_one(self):
        return self.value

    def mappings(self):
        return self

    def one(self):
        return self.value

    def all(self):
        return self.value


class Connection:
    def __init__(self):
        self.calls = []
        self.identity = {
            "username": IAM_ENV["DATABASE_USERNAME"],
            "database": "strr-db",
            "read_only": "on",
        }
        self.missing_roles = set()
        self.rows = {
            SMOKE.SCHEMAS_SQL: [{"schema": "public", "can_usage": True}],
            SMOKE.TABLES_SQL: [
                {
                    "schema": "public",
                    "name": "registration",
                    "can_select": True,
                    "can_insert": True,
                    "can_update": True,
                    "can_delete": True,
                }
            ],
            SMOKE.SEQUENCES_SQL: [
                {"schema": "public", "name": "registration_id_seq", "can_usage": True}
            ],
        }

    def exec_driver_sql(self, statement):
        self.calls.append((statement, {}))

    def execute(self, statement, parameters=None):
        self.calls.append((statement, parameters or {}))
        if statement == SMOKE.IDENTITY_SQL:
            return Result(self.identity)
        if statement == SMOKE.ROLE_SQL:
            return Result(parameters["role"] not in self.missing_roles)
        return Result(self.rows[statement])


class CloudSqlIamSmokeTest(unittest.TestCase):
    def setUp(self):
        self.connection = Connection()
        self.engine = Mock()
        self.engine.begin.side_effect = lambda: contextlib.nullcontext(self.connection)
        self.sqlalchemy = SimpleNamespace(
            text=lambda statement: statement,
            create_engine=Mock(return_value=self.engine),
        )
        self.helper = SimpleNamespace(
            sqlalchemy_settings_from_env=Mock(
                return_value=("postgresql+pg8000://", {"creator": Mock()})
            ),
            close_connector=Mock(),
        )
        modules = patch.dict(
            sys.modules,
            {"sqlalchemy": self.sqlalchemy, "cloud_sql_connector": self.helper},
        )
        modules.start()
        self.addCleanup(modules.stop)

    def run_cli(self, arguments=(), env=None):
        output, error = io.StringIO(), io.StringIO()
        with patch.dict(os.environ, IAM_ENV if env is None else env, clear=True):
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(error):
                status = SMOKE.main(arguments)
        return status, output.getvalue(), error.getvalue()

    def test_successful_login_reports_identity_and_read_only_catalog_results(self):
        status, output, error = self.run_cli(["--require-writes"])
        report = json.loads(output)
        self.assertEqual(status, 0)
        self.assertEqual(error, "")
        self.assertEqual(
            report["identity"]["current_user"], IAM_ENV["DATABASE_USERNAME"]
        )
        self.assertTrue(report["identity"]["read_only"])
        self.assertEqual(
            report["principals"][0]["inventory_counts"],
            {"schemas": 1, "tables": 1, "sequences": 1},
        )
        self.assertEqual(self.connection.calls[0], ("SET TRANSACTION READ ONLY", {}))
        for query, _ in self.connection.calls[1:]:
            self.assertTrue(query.lstrip().startswith("SELECT "))
            self.assertIn(
                query,
                [
                    SMOKE.IDENTITY_SQL,
                    SMOKE.ROLE_SQL,
                    *(query for _, query, _ in SMOKE.INVENTORIES),
                ],
            )
        self.engine.dispose.assert_called_once()
        self.helper.close_connector.assert_called_once()

    def test_optional_roles_are_bound_parameters_and_deduplicated(self):
        role = "sa-job'; GRANT ALL ON DATABASE strr TO public; --"
        status, output, _ = self.run_cli(["--check-role", role, "--check-role", role])
        self.assertEqual(status, 0)
        self.assertEqual(
            [item["role"] for item in json.loads(output)["principals"]], [role]
        )
        queries = [
            (query, params)
            for query, params in self.connection.calls
            if params.get("role") == role
        ]
        self.assertEqual(len(queries), 4)
        for query, params in queries:
            self.assertNotIn(role, query)
            expected = (
                {"role": role}
                if query == SMOKE.ROLE_SQL
                else {"role": role, "schema": "public"}
            )
            self.assertEqual(params, expected)

    def test_schema_is_bound_and_selected_roles_are_independent_of_observer(self):
        schema = "app'; DROP SCHEMA public; --"
        status, output, _ = self.run_cli(
            ["--schema", schema, "--check-role", "sa-job", "--require-writes"]
        )
        self.assertEqual(status, 0)
        report = json.loads(output)
        self.assertEqual(
            report["identity"]["current_user"], IAM_ENV["DATABASE_USERNAME"]
        )
        self.assertEqual(
            [principal["role"] for principal in report["principals"]], ["sa-job"]
        )
        for query, params in self.connection.calls:
            self.assertNotIn(schema, query)
            if query in self.connection.rows:
                self.assertEqual(params, {"role": "sa-job", "schema": schema})

    def test_write_gate_checks_each_required_privilege(self):
        for _, query, privileges in SMOKE.INVENTORIES:
            for privilege in privileges:
                with self.subTest(query=query, privilege=privilege):
                    self.connection.rows[query][0][f"can_{privilege}"] = False
                    status, output, _ = self.run_cli(["--require-writes"])
                    self.assertEqual(status, 1)
                    self.assertIn(
                        privilege.upper(),
                        json.loads(output)["principals"][0]["missing_privileges"][0][
                            "privileges"
                        ],
                    )
                    self.connection.rows[query][0][f"can_{privilege}"] = True

    def test_inspection_without_write_gate_accepts_read_only_role(self):
        self.connection.rows[SMOKE.TABLES_SQL][0]["can_insert"] = False
        status, output, _ = self.run_cli()
        self.assertEqual(status, 0)
        self.assertFalse(json.loads(output)["principals"][0]["write_requirements_met"])

    def test_write_gate_rejects_each_empty_inventory(self):
        for _, query, _ in SMOKE.INVENTORIES:
            with self.subTest(query=query):
                rows = self.connection.rows[query]
                self.connection.rows[query] = []
                status, _, _ = self.run_cli(["--require-writes"])
                self.assertEqual(status, 1)
                self.connection.rows[query] = rows

    def test_missing_role_fails_without_querying_its_privileges(self):
        self.connection.missing_roles.add("missing")
        status, output, _ = self.run_cli(["--check-role", "missing"])
        self.assertEqual(status, 1)
        self.assertFalse(json.loads(output)["principals"][-1]["exists"])
        self.assertEqual(
            [
                query
                for query, params in self.connection.calls
                if params.get("role") == "missing"
            ],
            [SMOKE.ROLE_SQL],
        )

    def test_identity_or_database_mismatch_fails(self):
        for field in ("username", "database"):
            with self.subTest(field=field):
                original = self.connection.identity[field]
                self.connection.identity[field] = "unexpected"
                status, output, _ = self.run_cli()
                self.assertEqual(status, 1)
                self.assertFalse(json.loads(output)["success"])
                self.connection.identity[field] = original

    def test_read_only_guard_failure_stops_before_catalog_access(self):
        self.connection.identity["read_only"] = "off"
        status, output, _ = self.run_cli()
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertEqual(len(self.connection.calls), 2)

    def test_missing_iam_values_never_fall_back_to_legacy_password(self):
        for missing in IAM_ENV:
            with self.subTest(missing=missing):
                env = {
                    **IAM_ENV,
                    "DATABASE_PASSWORD": "synthetic-secret",
                    "DATABASE_HOST": "legacy",
                }
                del env[missing]
                status, output, error = self.run_cli(env=env)
                self.assertEqual(status, 2)
                self.assertEqual(output, "")
                self.assertEqual(json.loads(error)["variables"], [missing])
        self.helper.sqlalchemy_settings_from_env.assert_not_called()

    def test_connection_errors_do_not_expose_credentials_or_urls(self):
        secret = "postgresql://user:synthetic-secret@private-host/db?access_token=token"
        self.engine.begin.side_effect = RuntimeError(secret)
        status, output, error = self.run_cli()
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertNotIn(secret, error)
        self.assertNotIn("synthetic-secret", error)
        self.assertNotIn("token", error)
        self.engine.dispose.assert_called_once()
        self.helper.close_connector.assert_called_once()


if __name__ == "__main__":
    unittest.main()
