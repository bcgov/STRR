"""DEV helper-only IAM/catalog probe; no business rows or DML."""

import contextlib
import hashlib
import io
import json
import logging
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

HELPER_COMMIT = "395a3bdd402d918f2ba3df6d6cf26a629872a121"
HELPER_SHA256 = "28408882bf0af32b17aa9c008f22bf461679ae1fa72a7a368a70847ad0900252"
BUILD_PROJECT = "c4hnrd-tools"
BUILD_IDENTITY = "331250273634@cloudbuild.gserviceaccount.com"
INSTANCE = "bcrbk9-dev:northamerica-northeast1:strr-db-dev"
DATABASE = "strr-db"
SCOPES = ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/sqlservice.login"]

QUERIES = {
    "identity": """SELECT current_user, session_user, current_database(),
        current_setting('transaction_read_only') AS read_only,
        has_schema_privilege(current_user, 'public', 'USAGE') AS schema_usage""",
    "server": """SELECT current_setting('server_version_num') AS version_number""",
    "extensions": """SELECT extname, extversion FROM pg_catalog.pg_extension
        WHERE extname IN ('postgis', 'anon') ORDER BY extname""",
    "roles": """SELECT rolname, pg_has_role(current_user, oid, 'USAGE') AS usable
        FROM pg_catalog.pg_roles
        WHERE rolname IN ('readonly', 'readwrite', 'admin') ORDER BY rolname""",
    "tables": """SELECT count(*) AS total,
        count(*) FILTER (WHERE NOT has_table_privilege(current_user, c.oid, 'SELECT')) AS missing_select,
        count(*) FILTER (WHERE NOT (has_table_privilege(current_user, c.oid, 'INSERT')
            AND has_table_privilege(current_user, c.oid, 'UPDATE')
            AND has_table_privilege(current_user, c.oid, 'DELETE'))) AS missing_dml,
        count(*) FILTER (WHERE c.relrowsecurity) AS with_row_security
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')""",
    "sequences": """SELECT count(*) AS total,
        count(*) FILTER (WHERE NOT (has_sequence_privilege(current_user, c.oid, 'USAGE')
            AND has_sequence_privilege(current_user, c.oid, 'SELECT'))) AS missing_privileges
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'S'""",
}


def main():
    from cloud_sql_connector import connector as helper
    import google.auth
    from google.auth import impersonated_credentials
    from google.auth.transport.requests import Request
    from google.cloud.sql.connector import Connector
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool

    if hashlib.sha256(Path(helper.__file__).read_bytes()).hexdigest() != HELPER_SHA256:
        raise ValueError("helper_source_mismatch")
    source, project = google.auth.default(scopes=SCOPES)
    source.refresh(Request())
    if project != BUILD_PROJECT or source.service_account_email != BUILD_IDENTITY:
        raise ValueError("build_identity_mismatch")

    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "helperCommit": HELPER_COMMIT,
        "helperSourceVerified": True,
        "buildIdentityVerified": True,
        "consumersVerified": False,
        "versions": {
            name: version(name) for name in ("cloud-sql-python-connector", "google-auth", "pg8000", "sqlalchemy")
        },
        "principals": [],
    }
    for name in ("sa-api", "sa-job"):
        username = f"{name}@bcrbk9-dev.iam"
        target = f"{name}@bcrbk9-dev.iam.gserviceaccount.com"
        row = {"expectedDatabaseUser": username, "loginVerified": False, "writeCatalogReady": False}
        engine = None
        stage = "impersonation"
        try:
            credentials = impersonated_credentials.Credentials(
                source_credentials=source, target_principal=target, target_scopes=SCOPES, lifetime=600
            )
            credentials.refresh(Request())
            if credentials.service_account_email != target:
                raise ValueError("target_identity_mismatch")
            # Inject a real Connector; the exact helper still creates/uses getconn.
            helper._connector = Connector(credentials=credentials, refresh_strategy="lazy", timeout=30)
            uri, options = helper.sqlalchemy_settings_from_env(
                {
                    "CLOUDSQL_INSTANCE_CONNECTION_NAME": INSTANCE,
                    "DATABASE_NAME": DATABASE,
                    "DATABASE_USERNAME": username,
                    "CLOUDSQL_IP_TYPE": "PUBLIC",
                }
            )
            if uri != "postgresql+pg8000://" or set(options) != {"creator"}:
                raise ValueError("unexpected_helper_settings")
            engine = create_engine(uri, **options, poolclass=NullPool)
            stage = "helper_iam_login"
            with engine.connect() as connection:
                transaction = connection.begin()
                try:
                    connection.execute(text("SET TRANSACTION READ ONLY"))
                    connection.execute(text("SET LOCAL statement_timeout = '5s'"))
                    stage = "catalog"
                    for label, query in QUERIES.items():
                        rows = [dict(value) for value in connection.execute(text(query)).mappings()]
                        if label == "identity":
                            identity = rows[0]
                            if not (
                                identity["current_user"] == username
                                and identity["session_user"] == username
                                and identity["current_database"] == DATABASE
                                and identity["read_only"] == "on"
                            ):
                                raise ValueError("database_identity_mismatch")
                            row["loginVerified"] = True
                            row["readOnlyTransactionVerified"] = True
                            row["publicSchemaUsage"] = identity["schema_usage"]
                        else:
                            row[label] = rows
                    table = row["tables"][0]
                    sequence = row["sequences"][0]
                    row["writeCatalogReady"] = bool(
                        row["publicSchemaUsage"]
                        and table["total"] > 0
                        and table["missing_select"] == table["missing_dml"] == 0
                        and table["with_row_security"] == 0
                        and sequence["missing_privileges"] == 0
                        and any(role["rolname"] == "readwrite" and role["usable"] for role in row["roles"])
                    )
                finally:
                    transaction.rollback()
        except Exception as error:
            row.update(errorStage=stage, errorType=type(error).__name__)
        finally:
            try:
                try:
                    if engine is not None:
                        engine.dispose()
                finally:
                    helper.close_connector()
            except Exception as error:
                row.update(cleanupErrorType=type(error).__name__)
            result["principals"].append(row)
    result["success"] = all(
        row["loginVerified"] and row["writeCatalogReady"] and "errorType" not in row and "cleanupErrorType" not in row
        for row in result["principals"]
    )
    return result


def run():
    logging.disable(logging.CRITICAL)
    # Suppress library diagnostics/tracebacks; emit only this allowlisted summary.
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        try:
            summary = main()
        except Exception as error:
            summary = {"success": False, "errorStage": "initialization", "errorType": type(error).__name__}
    print(json.dumps(summary, sort_keys=True))
    return 0 if summary["success"] else 1


if __name__ == "__main__":
    raise SystemExit(run())
