"""Guard deployed STRR database mappings for Cloud SQL IAM authentication."""

import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# The batch listener only invokes a Cloud Run job; its job is a DB consumer.
DB_FREE_CONSUMERS = {"queue_services/batch-permit-validator"}
DB_CONSUMERS = tuple(
    sorted(
        project.parent
        for parent in ("jobs", "queue_services")
        for project in (REPO_ROOT / parent).glob("*/pyproject.toml")
        if project.parent.relative_to(REPO_ROOT).as_posix() not in DB_FREE_CONSUMERS
    )
)
MIGRATED_GCP_VAULTS = tuple(
    (consumer / "devops/vaults.gcp.env").relative_to(REPO_ROOT).as_posix()
    for consumer in DB_CONSUMERS
)

EXPECTED_DATABASE_MAPPINGS = {
    "CLOUDSQL_IP_TYPE": "PUBLIC",
    "DATABASE_NAME": "op://database/$APP_ENV/strr-db/DATABASE_NAME",
    "CLOUDSQL_INSTANCE_CONNECTION_NAME": '"" # from-param: ${cloudsql-instances}',
    "DATABASE_USERNAME": '"" # from-param: ${database-iam-username}',
}

REMOVED_DEPLOYED_DB_VARS = (
    # Cloud deployments must not retain password or socket fallbacks.
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
                self.assertEqual(
                    {key: mappings.get(key) for key in EXPECTED_DATABASE_MAPPINGS},
                    EXPECTED_DATABASE_MAPPINGS,
                )
                self.assertFalse(
                    set(REMOVED_DEPLOYED_DB_VARS) & mappings.keys(),
                    f"Legacy database mappings remain active in {vault_file}",
                )

    def test_all_clouddeploy_targets_bind_iam_to_the_runtime_identity_and_instance(
        self,
    ):
        for vault_file in MIGRATED_GCP_VAULTS:
            with self.subTest(vault_file=vault_file):
                project_ids = _clouddeploy_values(vault_file, "deploy-project-id")
                self.assertEqual(len(project_ids), 5)
                runtime_accounts = [
                    f"{_expected_runtime_account(vault_file)}@{project_id}.iam.gserviceaccount.com"
                    for project_id in project_ids
                ]
                self.assertEqual(
                    _clouddeploy_values(vault_file, "service-account"),
                    runtime_accounts,
                )
                self.assertEqual(
                    _clouddeploy_values(vault_file, "database-iam-username"),
                    [
                        account.removesuffix(".gserviceaccount.com")
                        for account in runtime_accounts
                    ],
                )
                self.assertEqual(
                    _clouddeploy_values(vault_file, "cloudsql-instances"),
                    [
                        f"{project}:northamerica-northeast1:strr-db-{environment}"
                        for project, environment in zip(
                            project_ids, ("dev", "test", "test", "sandbox", "prod")
                        )
                    ],
                )

    def test_consumers_require_cloud_deploy_to_resolve_iam_parameters(self):
        workflows = tuple((REPO_ROOT / ".github/workflows").glob("*-cd.yaml"))
        for consumer in DB_CONSUMERS:
            directory = consumer.relative_to(REPO_ROOT).as_posix()
            with self.subTest(consumer=directory):
                matching = [
                    workflow.read_text()
                    for workflow in workflows
                    if re.search(
                        rf"working_directory: ['\"](?:\./)?{re.escape(directory)}['\"]",
                        workflow.read_text(),
                    )
                ]
                self.assertEqual(len(matching), 1)
                workflow = matching[0]
                self.assertIn('redeploy: "false"', workflow)
                self.assertNotIn("inputs.redeploy", workflow)
                self.assertIn("uses: bcgov/bcregistry-sre/.github/workflows/", workflow)

    def test_strr_email_sandbox_uses_the_database_region(self):
        clouddeploy_file = (
            REPO_ROOT / "queue_services/strr-email/devops/gcp/clouddeploy.yaml"
        )
        contents = clouddeploy_file.read_text(encoding="utf-8")

        self.assertIn("bcrbk9-tools:northamerica-northeast1:strr-db-sandbox", contents)
        self.assertNotIn("bcrbk9-tools:us-central1:strr-db-sandbox", contents)


if __name__ == "__main__":
    unittest.main()
