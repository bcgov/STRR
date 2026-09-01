# Copyright © 2023 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
"""Checks the STRR API Cloud SQL IAM vault mapping."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_migrated_strr_api_vault_mapping_uses_cloudsql_iam():
    """The migrated API deployment should use the passwordless Cloud SQL connector."""
    vault_file = REPO_ROOT / "strr-api" / "devops" / "vaults.gcp.env"
    active_lines = (
        line.strip()
        for line in vault_file.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )
    mappings = dict(line.split("=", 1) for line in active_lines)

    assert {
        "CLOUDSQL_INSTANCE_CONNECTION_NAME": '"op://database/$APP_ENV/strr-db/DATABASE_INSTANCE_CONNECTION_NAME"',
        "CLOUDSQL_IP_TYPE": '"PUBLIC"',
        "DATABASE_NAME": '"op://database/$APP_ENV/strr-db/DATABASE_NAME"',
        "DATABASE_USERNAME": '"op://database/$APP_ENV/strr-db/DATABASE_IAM_USERNAME"',
        "DATABASE_MIGRATION_USERNAME": '"op://database/$APP_ENV/strr-db/DATABASE_MIGRATION_IAM_USERNAME"',
        "DATABASE_OWNER_ROLE": '"op://database/$APP_ENV/strr-db/DATABASE_OWNER_ROLE"',
    }.items() <= mappings.items()
    assert {
        "DATABASE_HOST",
        "DATABASE_PASSWORD",
        "DATABASE_PORT",
        "DATABASE_UNIX_SOCKET",
    }.isdisjoint(mappings)
