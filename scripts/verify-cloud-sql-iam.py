#!/usr/bin/env python3
"""Verify a Cloud SQL IAM login and catalog privileges without reading business rows."""

import argparse
import json
import logging
import os
import sys
import warnings
from pathlib import Path


REQUIRED_ENV = (
    "CLOUDSQL_INSTANCE_CONNECTION_NAME",
    "DATABASE_NAME",
    "DATABASE_USERNAME",
)
SHARED_SOURCE = (
    Path(__file__).resolve().parents[1] / "shared/python/cloud-sql-connector/src"
)
IDENTITY_SQL = """
SELECT current_user AS username, current_database() AS database,
       current_setting('transaction_read_only') AS read_only
"""
ROLE_SQL = "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :role) AS present"
SCHEMAS_SQL = """
SELECT n.nspname AS schema, has_schema_privilege(:role, n.oid, 'USAGE') AS can_usage
FROM pg_namespace n
WHERE n.nspname = :schema
ORDER BY n.nspname
"""
TABLES_SQL = """
SELECT n.nspname AS schema, c.relname AS name,
       has_table_privilege(:role, c.oid, 'SELECT') AS can_select,
       has_table_privilege(:role, c.oid, 'INSERT') AS can_insert,
       has_table_privilege(:role, c.oid, 'UPDATE') AS can_update,
       has_table_privilege(:role, c.oid, 'DELETE') AS can_delete
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname = :schema
ORDER BY n.nspname, c.relname
"""
SEQUENCES_SQL = """
SELECT n.nspname AS schema, c.relname AS name,
       has_sequence_privilege(:role, c.oid, 'USAGE') AS can_usage
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'S'
  AND n.nspname = :schema
ORDER BY n.nspname, c.relname
"""
INVENTORIES = (
    ("schemas", SCHEMAS_SQL, ("usage",)),
    ("tables", TABLES_SQL, ("select", "insert", "update", "delete")),
    ("sequences", SEQUENCES_SQL, ("usage",)),
)


def inspect_role(connection, role, schema):
    """Check effective privileges, including role membership and PUBLIC grants."""
    from sqlalchemy import text

    present = connection.execute(text(ROLE_SQL), {"role": role}).scalar_one()
    result = {
        "role": role,
        "exists": present,
        "inventory_counts": {},
        "missing_privileges": [],
    }
    if not present:
        result["write_requirements_met"] = False
        return result
    for kind, query, privileges in INVENTORIES:
        rows = (
            connection.execute(text(query), {"role": role, "schema": schema})
            .mappings()
            .all()
        )
        result["inventory_counts"][kind] = len(rows)
        for row in rows:
            missing = [
                privilege.upper()
                for privilege in privileges
                if not row[f"can_{privilege}"]
            ]
            if missing:
                result["missing_privileges"].append(
                    {
                        "kind": kind,
                        "schema": row["schema"],
                        "name": row.get("name"),
                        "privileges": missing,
                    }
                )
    result["write_requirements_met"] = (
        all(result["inventory_counts"].values()) and not result["missing_privileges"]
    )
    return result


def verify(engine, expected_user, expected_database, check_roles, schema="public"):
    """Run only identity/catalog reads inside an explicitly read-only transaction."""
    from sqlalchemy import text

    with engine.begin() as connection:
        connection.exec_driver_sql("SET TRANSACTION READ ONLY")
        identity = dict(connection.execute(text(IDENTITY_SQL)).mappings().one())
        identity["current_user"] = identity.pop("username")
        identity["read_only"] = identity["read_only"] == "on"
        identity["expected_user"] = expected_user
        identity["matches_expected_user"] = identity["current_user"] == expected_user
        identity["matches_expected_database"] = (
            identity["database"] == expected_database
        )
        if not identity["read_only"]:
            raise RuntimeError("Read-only transaction was not established")
        roles = dict.fromkeys(check_roles or [identity["current_user"]])
        return {
            "identity": identity,
            "principals": [inspect_role(connection, role, schema) for role in roles],
            "schema": schema,
            "scope": "Schema, ordinary/partitioned tables, and sequences; catalog privileges only",
        }


def result_succeeded(result, require_writes):
    identity = result["identity"]
    return (
        identity["read_only"]
        and identity["matches_expected_user"]
        and identity["matches_expected_database"]
        and all(principal["exists"] for principal in result["principals"])
        and (
            not require_writes
            or all(
                principal["write_requirements_met"]
                for principal in result["principals"]
            )
        )
    )


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check-role",
        action="append",
        default=[],
        help="Inspect this PostgreSQL role's privileges; repeatable, defaults to current_user, does not log in as that role",
    )
    parser.add_argument(
        "--schema",
        default="public",
        help="Application schema to inspect (default: public)",
    )
    parser.add_argument(
        "--require-writes",
        action="store_true",
        help="Require schema USAGE, table SELECT/INSERT/UPDATE/DELETE and sequence USAGE for every inspected role; empty inventories fail",
    )
    args = parser.parse_args(argv)
    missing = [name for name in REQUIRED_ENV if not os.environ.get(name, "").strip()]
    if missing:
        print(
            json.dumps(
                {"error": "Missing required IAM configuration", "variables": missing}
            ),
            file=sys.stderr,
        )
        return 2

    # Use this checkout's helper, even if a different version is installed.
    sys.path.insert(0, str(SHARED_SOURCE))
    previous_log_level = logging.root.manager.disable
    logging.disable(logging.CRITICAL)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            from cloud_sql_connector import (
                close_connector,
                sqlalchemy_settings_from_env,
            )
            from sqlalchemy import create_engine

            engine = None
            try:
                uri, options = sqlalchemy_settings_from_env()
                engine = create_engine(uri, **options)
                result = verify(
                    engine,
                    os.environ["DATABASE_USERNAME"],
                    os.environ["DATABASE_NAME"],
                    args.check_role,
                    args.schema,
                )
            finally:
                try:
                    if engine is not None:
                        engine.dispose()
                finally:
                    close_connector()
        result["require_writes"] = args.require_writes
        result["success"] = result_succeeded(result, args.require_writes)
        print(json.dumps(result, indent=2))
        return 0 if result["success"] else 1
    except Exception as error:
        # Connector/driver errors can contain URLs, tokens or connection details.
        print(
            json.dumps(
                {
                    "error": "IAM verification failed; check ADC, IAM access, database configuration and connectivity",
                    "error_type": type(error).__name__,
                }
            ),
            file=sys.stderr,
        )
        return 1
    finally:
        logging.disable(previous_log_level)
        sys.path.remove(str(SHARED_SOURCE))


if __name__ == "__main__":
    raise SystemExit(main())
