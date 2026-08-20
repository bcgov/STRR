# Copyright © 2023 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
"""Checks that STRR deployments declare explicit GCP IAM identities."""

import re
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
CLOUDDEPLOY_FILE = REPO_ROOT / "strr-api" / "devops" / "gcp" / "clouddeploy.yaml"
CD_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "strr-api-cd.yaml"

SERVICE_ACCOUNT_RE = re.compile(r"^sa-api@(?P<project_id>[-a-z0-9]+)\.iam\.gserviceaccount\.com$")


def _clouddeploy_stages(path: Path) -> list[dict[str, str]]:
    clouddeploy = yaml.safe_load(path.read_text(encoding="utf-8"))
    stages = []

    for stage in clouddeploy.get("serialPipeline", {}).get("stages", []):
        deploy_parameters = stage.get("deployParameters", [])
        values = deploy_parameters[0].get("values", {}) if deploy_parameters else {}
        stages.append({"target_id": stage.get("targetId"), **values})

    return stages


def test_cloud_deploy_targets_use_explicit_runtime_service_accounts():
    """The API should run as its named IAM service account, not a default account."""
    stages = _clouddeploy_stages(CLOUDDEPLOY_FILE)

    assert stages, f"{CLOUDDEPLOY_FILE} has no deployment stages"

    for stage in stages:
        project_id = stage.get("deploy-project-id")
        service_account = stage.get("service-account")

        assert project_id, f"{CLOUDDEPLOY_FILE} {stage['target_id']} is missing deploy-project-id"
        assert service_account, f"{CLOUDDEPLOY_FILE} {stage['target_id']} is missing service-account"
        assert SERVICE_ACCOUNT_RE.match(
            service_account
        ), f"{CLOUDDEPLOY_FILE} {stage['target_id']} must use the named API service account"
        assert service_account.endswith(
            f"@{project_id}.iam.gserviceaccount.com"
        ), f"{CLOUDDEPLOY_FILE} {stage['target_id']} service-account must match deploy-project-id"


def test_cd_workflow_uses_workload_identity_deployment_secrets():
    """The API deployment should authenticate to GCP through workload identity."""
    contents = CD_WORKFLOW.read_text(encoding="utf-8")

    assert "WORKLOAD_IDENTIFY_POOLS_PROVIDER" in contents
    assert "GCP_SERVICE_ACCOUNT" in contents


def test_migrated_strr_api_vault_mapping_uses_cloudsql_iam():
    """The migrated API deployment should use the passwordless Cloud SQL connector."""
    contents = (REPO_ROOT / "strr-api" / "devops" / "vaults.gcp.env").read_text(encoding="utf-8")

    for forbidden_env in ("DATABASE_HOST=", "DATABASE_PASSWORD=", "DATABASE_PORT=", "DATABASE_UNIX_SOCKET="):
        assert forbidden_env not in contents

    for required_env in (
        "CLOUDSQL_INSTANCE_CONNECTION_NAME=",
        'CLOUDSQL_IP_TYPE="PUBLIC"',
        "DATABASE_MIGRATION_USERNAME=",
        "DATABASE_OWNER_ROLE=",
        "DATABASE_USERNAME=",
    ):
        assert required_env in contents
