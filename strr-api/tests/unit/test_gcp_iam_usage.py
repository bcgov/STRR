# Copyright © 2023 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
"""Checks that STRR deployments declare explicit GCP IAM identities."""

import re
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]

SERVICE_ACCOUNT_RE = re.compile(r"^sa-(api|job)@(?P<project_id>[-a-z0-9]+)\.iam\.gserviceaccount\.com$")


def _clouddeploy_files() -> list[Path]:
    return sorted(path for path in REPO_ROOT.glob("**/devops/gcp/clouddeploy.yaml") if ".git" not in path.parts)


def _clouddeploy_stages(path: Path) -> list[dict[str, str]]:
    clouddeploy = yaml.safe_load(path.read_text(encoding="utf-8"))
    stages = []

    for stage in clouddeploy.get("serialPipeline", {}).get("stages", []):
        deploy_parameters = stage.get("deployParameters", [])
        values = deploy_parameters[0].get("values", {}) if deploy_parameters else {}
        stages.append({"target_id": stage.get("targetId"), **values})

    return stages


def test_cloud_deploy_targets_use_explicit_runtime_service_accounts():
    """Cloud Run services/jobs should run as STRR IAM service accounts, not defaults."""
    clouddeploy_files = _clouddeploy_files()

    assert clouddeploy_files

    for clouddeploy_file in clouddeploy_files:
        stages = _clouddeploy_stages(clouddeploy_file)

        assert stages, f"{clouddeploy_file} has no deployment stages"

        for stage in stages:
            project_id = stage.get("deploy-project-id")
            service_account = stage.get("service-account")

            assert project_id, f"{clouddeploy_file} {stage['target_id']} is missing deploy-project-id"
            assert service_account, f"{clouddeploy_file} {stage['target_id']} is missing service-account"
            assert SERVICE_ACCOUNT_RE.match(
                service_account
            ), f"{clouddeploy_file} {stage['target_id']} must use a named STRR IAM service account"
            assert service_account.endswith(
                f"@{project_id}.iam.gserviceaccount.com"
            ), f"{clouddeploy_file} {stage['target_id']} service-account must match deploy-project-id"


def test_cd_workflows_use_workload_identity_deployment_secrets():
    """Deployment workflows should authenticate to GCP through workload identity."""
    cd_workflows = sorted((REPO_ROOT / ".github" / "workflows").glob("*-cd.y*ml"))

    assert cd_workflows

    for workflow in cd_workflows:
        contents = workflow.read_text(encoding="utf-8")

        assert "WORKLOAD_IDENTIFY_POOLS_PROVIDER" in contents, f"{workflow} is missing workload identity provider"
        assert "GCP_SERVICE_ACCOUNT" in contents, f"{workflow} is missing deployment service account"


def test_migrated_strr_api_vault_mapping_uses_cloudsql_iam():
    """The migrated API deployment should no longer source DB password/socket values."""
    contents = (REPO_ROOT / "strr-api" / "devops" / "vaults.gcp.env").read_text(encoding="utf-8")

    for forbidden_env in ("DATABASE_PASSWORD=", "DATABASE_PORT=", "DATABASE_UNIX_SOCKET="):
        assert forbidden_env not in contents

    for required_env in (
        "CLOUDSQL_INSTANCE_CONNECTION_NAME=",
        "CLOUDSQL_IP_TYPE=",
        "DATABASE_MIGRATION_USERNAME=",
        "DATABASE_USERNAME=",
    ):
        assert required_env in contents
