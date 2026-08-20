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

QUEUE_VAULTS = {
    "queue_services/strr-email/devops/vaults.gcp.env",
    "queue_services/strr-pay/devops/vaults.gcp.env",
}

REMOVED_DEPLOYED_DB_VARS = (
    "DATABASE_PASSWORD=",
    "DATABASE_PORT=",
    "DATABASE_UNIX_SOCKET=",
    "INSTANCE_CONNECTION_NAME=",
    "DB_USER=",
    "DB_USER==",
    "DB_NAME=",
)


class GcpIamDeploymentContractTest(unittest.TestCase):
    def test_migrated_vaults_use_cloudsql_iam_envs(self):
        for vault_file in MIGRATED_GCP_VAULTS:
            with self.subTest(vault_file=vault_file):
                contents = (REPO_ROOT / vault_file).read_text(encoding="utf-8")
                lines = contents.splitlines()

                self.assertIn("CLOUDSQL_INSTANCE_CONNECTION_NAME=", contents)
                self.assertIn('CLOUDSQL_IP_TYPE="PUBLIC"', contents)
                self.assertIn("DATABASE_USERNAME=", contents)
                self.assertIn("DATABASE_NAME=", contents)
                self.assertFalse(
                    any(
                        line.startswith(removed_var)
                        for line in lines
                        for removed_var in REMOVED_DEPLOYED_DB_VARS
                    )
                )

    def test_vaults_use_expected_iam_user_fields(self):
        for vault_file in MIGRATED_GCP_VAULTS:
            with self.subTest(vault_file=vault_file):
                contents = (REPO_ROOT / vault_file).read_text(encoding="utf-8")
                expected_field = (
                    "DATABASE_IAM_USERNAME"
                    if vault_file in QUEUE_VAULTS
                    else "DATABASE_JOB_IAM_USERNAME"
                )
                unexpected_field = (
                    "DATABASE_JOB_IAM_USERNAME"
                    if vault_file in QUEUE_VAULTS
                    else "DATABASE_IAM_USERNAME"
                )
                self.assertIn(expected_field, contents)
                self.assertNotIn(unexpected_field, contents)

    def test_strr_email_sandbox_uses_the_database_region(self):
        clouddeploy_file = (
            REPO_ROOT / "queue_services/strr-email/devops/gcp/clouddeploy.yaml"
        )
        contents = clouddeploy_file.read_text(encoding="utf-8")

        self.assertIn("bcrbk9-tools:northamerica-northeast1:strr-db-sandbox", contents)
        self.assertNotIn("bcrbk9-tools:us-central1:strr-db-sandbox", contents)


if __name__ == "__main__":
    unittest.main()
