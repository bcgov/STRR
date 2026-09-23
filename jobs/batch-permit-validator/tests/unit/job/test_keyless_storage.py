import base64
from unittest.mock import patch

from google.auth.credentials import Credentials
from google.cloud import storage

from batch_permit_validator.job import GCPStorageService


class RuntimeCredentials(Credentials):
    """Token-only credentials, like the job receives from its runtime identity."""

    service_account_email = "sa-job@example.iam.gserviceaccount.com"

    def __init__(self):
        super().__init__()
        self.token = "synthetic-access-token"

    def refresh(self, request):
        raise AssertionError("The synthetic token is already valid")


def test_installed_api_can_sign_response_url_with_runtime_credentials():
    """The job's installed API dependency must support IAM signing without a key."""
    credentials = RuntimeCredentials()
    client = storage.Client(project="synthetic-project", credentials=credentials)
    bucket = client.bucket("synthetic-response-bucket")

    with (
        patch.object(GCPStorageService, "get_bucket", return_value=bucket),
        patch(
            "google.cloud.storage._signing._sign_message",
            return_value=base64.b64encode(b"synthetic-signature"),
        ) as signer,
    ):
        url = GCPStorageService.get_presigned_url(bucket.name, "response.json", 10)

    assert "X-Goog-Signature=" in url
    assert signer.call_count == 1
    assert signer.call_args.args[1] == credentials.token
    assert signer.call_args.args[2] == credentials.service_account_email
