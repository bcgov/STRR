"""Guard deployed STRR database mappings for Cloud SQL IAM authentication."""

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

MIGRATED_GCP_VAULTS = (
    "queue_services/strr-email/devops/vaults.gcp.env",
    "queue_services/strr-pay/devops/vaults.gcp.env",
    "jobs/auto-approval/devops/vaults.gcp.env",
    "jobs/batch-permit-validator/devops/vaults.gcp.env",
    "jobs/interactions-update/devops/vaults.gcp.env",
    "jobs/noc_expiry/devops/vaults.gcp.env",
    "jobs/provisional-approval/devops/vaults.gcp.env",
    "jobs/registration_expiry/devops/vaults.gcp.env",
    "jobs/renewal-reminders/devops/vaults.gcp.env",
    "jobs/strr-backfiller/devops/vaults.gcp.env",
)

EXPECTED_DATABASE_MAPPINGS = {
    "CLOUDSQL_INSTANCE_CONNECTION_NAME": (
        "op://database/$APP_ENV/strr-db/DATABASE_INSTANCE_CONNECTION_NAME"
    ),
    "CLOUDSQL_IP_TYPE": "PUBLIC",
    "DATABASE_NAME": "op://database/$APP_ENV/strr-db/DATABASE_NAME",
}

REMOVED_DEPLOYED_DB_VARS = (
    "DATABASE_HOST",
    "DATABASE_PASSWORD",
    "DATABASE_PORT",
    "DATABASE_UNIX_SOCKET",
    "DATABASE_URL",
)


def _active_env_mappings(vault_file: str) -> dict[str, str]:
    mappings = {}
    contents = (REPO_ROOT / vault_file).read_text(encoding="utf-8")
    for raw_line in contents.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        key, separator, value = line.partition("=")
        if not separator:
            continue

        value = value.strip()
        if value.startswith(('"', "'")) and value.endswith(value[0]):
            value = value[1:-1]
        mappings[key.strip()] = value

    return mappings


def _clouddeploy_values(vault_file: str, key: str) -> list[str]:
    vault_path = Path(vault_file)
    clouddeploy_path = vault_path.parent / "gcp/clouddeploy.yaml"
    contents = (REPO_ROOT / clouddeploy_path).read_text(encoding="utf-8")
    values = []
    for raw_line in contents.splitlines():
        line = raw_line.strip()
        if line.startswith(f"{key}:"):
            values.append(line.partition(":")[2].strip().strip("\"'"))
    return values


def _expected_runtime_account(vault_file: str) -> str:
    return "sa-job" if vault_file.startswith("jobs/") else "sa-api"


class GcpIamDeploymentContractTest(unittest.TestCase):
    def test_migrated_vaults_use_exact_cloudsql_iam_mappings(self):
        for vault_file in MIGRATED_GCP_VAULTS:
            with self.subTest(vault_file=vault_file):
                mappings = _active_env_mappings(vault_file)
                expected_runtime_account = _expected_runtime_account(vault_file)
                expected_username_field = (
                    "DATABASE_JOB_IAM_USERNAME"
                    if expected_runtime_account == "sa-job"
                    else "DATABASE_IAM_USERNAME"
                )
                expected_mappings = {
                    **EXPECTED_DATABASE_MAPPINGS,
                    "DATABASE_USERNAME": (
                        "op://database/$APP_ENV/strr-db/" + expected_username_field
                    ),
                }

                self.assertEqual(
                    {key: mappings.get(key) for key in expected_mappings},
                    expected_mappings,
                )
                self.assertFalse(
                    set(REMOVED_DEPLOYED_DB_VARS) & mappings.keys(),
                    f"Legacy database mappings remain active in {vault_file}",
                )

    def test_clouddeploy_runtime_accounts_match_vault_mappings(self):
        for vault_file in MIGRATED_GCP_VAULTS:
            with self.subTest(vault_file=vault_file):
                project_ids = _clouddeploy_values(vault_file, "deploy-project-id")
                self.assertTrue(project_ids)
                self.assertEqual(
                    _clouddeploy_values(vault_file, "service-account"),
                    [
                        f"{_expected_runtime_account(vault_file)}@{project_id}.iam.gserviceaccount.com"
                        for project_id in project_ids
                    ],
                )

    def test_strr_email_sandbox_uses_the_database_region(self):
        clouddeploy_file = (
            REPO_ROOT / "queue_services/strr-email/devops/gcp/clouddeploy.yaml"
        )
        contents = clouddeploy_file.read_text(encoding="utf-8")

        self.assertIn("bcrbk9-tools:northamerica-northeast1:strr-db-sandbox", contents)
        self.assertNotIn("bcrbk9-tools:us-central1:strr-db-sandbox", contents)


if __name__ == "__main__":
    unittest.main()
