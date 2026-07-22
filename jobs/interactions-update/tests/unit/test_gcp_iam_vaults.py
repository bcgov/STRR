"""Guard deployed STRR DB vault mappings for Cloud SQL IAM auth."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]

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

REMOVED_DEPLOYED_DB_VARS = (
    "DATABASE_PASSWORD=",
    "DATABASE_PORT=",
    "DATABASE_UNIX_SOCKET=",
    "INSTANCE_CONNECTION_NAME=",
    "DB_USER=",
    "DB_USER==",
    "DB_NAME=",
)


def test_migrated_vaults_use_cloudsql_iam_envs():
    for vault_file in MIGRATED_GCP_VAULTS:
        contents = (REPO_ROOT / vault_file).read_text()
        lines = contents.splitlines()

        assert "CLOUDSQL_INSTANCE_CONNECTION_NAME=" in contents
        assert 'CLOUDSQL_IP_TYPE="PUBLIC"' in contents
        assert "DATABASE_USERNAME=" in contents
        assert "DATABASE_NAME=" in contents
        assert all(
            not line.startswith(removed_var)
            for line in lines
            for removed_var in REMOVED_DEPLOYED_DB_VARS
        )


def test_queue_and_job_vaults_use_expected_iam_user_fields():
    queue_vaults = (
        "queue_services/strr-email/devops/vaults.gcp.env",
        "queue_services/strr-pay/devops/vaults.gcp.env",
    )

    for vault_file in queue_vaults:
        contents = (REPO_ROOT / vault_file).read_text()
        assert "DATABASE_IAM_USERNAME" in contents
        assert "DATABASE_JOB_IAM_USERNAME" not in contents

    job_vaults = set(MIGRATED_GCP_VAULTS) - set(queue_vaults)

    for vault_file in job_vaults:
        contents = (REPO_ROOT / vault_file).read_text()
        assert "DATABASE_JOB_IAM_USERNAME" in contents
