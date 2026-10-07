# STRR DEV bucket security

This covers only STRR in `bcrbk9-dev`. SRE owns the log destination and its IAM.
The temporary GitHub bootstrap imports existing application resources first, then
applies the reviewed source-bucket settings in a separate plan/apply. Other
environments are outside this rollout.

## Dedicated log destination

Destination: `bcrbk9-dev-strr-access-logs`. Confirm ownership, permitted log
access, and the same VPC Service Controls perimeter, if one applies. The bucket
must be in `NORTHAMERICA-NORTHEAST1`, like the three source buckets. It is a Cloud
Storage access-log bucket, not a Cloud Logging log bucket.

Required destination settings:

```json
{
  "name": "bcrbk9-dev-strr-access-logs",
  "location": "NORTHAMERICA-NORTHEAST1",
  "storageClass": "STANDARD",
  "iamConfiguration": {
    "uniformBucketLevelAccess": { "enabled": true },
    "publicAccessPrevention": "enforced"
  },
  "versioning": { "enabled": true },
  "softDeletePolicy": { "retentionDurationSeconds": "604800" },
  "lifecycle": {
    "rule": [{ "action": { "type": "Delete" }, "condition": { "age": 30 } }]
  }
}
```

The age rule applies to all log generations. Logs become eligible for cleanup
after 30 days; a live version is first made noncurrent, then eligible noncurrent
versions are deleted. Seven-day soft delete follows deletion, so physical removal
is later than day 30. This is not a strict 30-day purge guarantee or a locked
retention policy. Lifecycle processing is asynchronous.

Grant only `roles/storage.objectCreator` on this log bucket to
`group:cloud-storage-analytics@google.com` for log delivery. Do not grant it a
project-wide role. Log readers need separate, approved access: logs may contain
object paths and client information. Do not give the STRR runtime identities log
access merely because they use the source buckets.

SRE owns provisioning and ongoing management of this destination and its IAM;
neither the API nor validation root should also import it. The existing
`sa-strr-infra` permissions cover metadata on the three application buckets only,
not log-bucket creation or IAM. This draft does not widen those permissions or
edit the SRE repository.

Review auditing of the destination itself with SRE, including effective Cloud
Storage Data Access audit logging. Do not configure self-logging, a circular log
route, or an empty `logging` block just to satisfy a scanner. The destination's
security review remains required; fixing the three source definitions is not
security sign-off for this new bucket.

## Three application buckets

| Existing bucket | Prefix in the log bucket |
| --- | --- |
| `strr_registration_documents_dev` | `registration-documents/` |
| `strr_bulk_validation_requests_dev` | `bulk-validation-requests/` |
| `strr_bulk_validation_responses_dev` | `bulk-validation-responses/` |

Each Terraform definition enables versioning and logging to the destination
above. The sole cleanup rule deletes only `ARCHIVED` versions seven days after
they become noncurrent, not seven days after the original upload. No live
application file expires by age. Existing private access, region, bucket names,
seven-day soft delete, and bucket-deletion protections remain unchanged.

Versions cleaned up after seven days enter the existing seven-day soft-delete
window. Old data can therefore remain recoverable for roughly 14 days after
becoming noncurrent, plus lifecycle-processing delays. Versioning and log storage
increase storage use; review these proposed settings before applying them.

An application delete still removes the current file, but versioning keeps a
readable noncurrent copy for identities with the relevant object access. This is
different from soft-deleted data, which must first be restored. Include ordinary
download/list behaviour and generation-specific access in the synthetic-file
review; do not describe an application delete as immediate erasure of all copies.

## Rollout and verification

1. Confirm that the existing source resources are not owned by another Terraform
   state. Keep the destination under SRE ownership; do not import it here.
2. Check the destination settings above. The October 7
   bucket inventory confirmed the destination, region, private access, versioning,
   30-day cleanup rule and seven-day soft delete. Its IAM binding still needs
   verification through actual log delivery; the operator's bucket-policy read
   returned 403. This does not require a new personal IAM grant before bootstrap.
3. After review and merge, run the temporary `bootstrap` action for each DEV
   root using the [workflow instructions](https://github.com/bcgov/STRR/blob/Jacky/regbacklog-336-terraform/terraform/README.md#first-dev-adoption).
   This records the existing resources in state without modifying them, then
   separately plans and applies only the source-bucket settings. Do not have an
   operator apply these settings manually first.
4. Using fresh synthetic files, verify version creation on replacement/deletion,
   recovery and log delivery under all three prefixes. Account for the validation
   bucket's Eventarc routing before choosing fixtures. Use synthetic files only.
   Do not shorten live retention to speed up tests.
5. Confirm no-change plans for all roots. After DEV verification, remove the
   temporary bootstrap action as documented in the workflow instructions.

## References

- [Google: log delivery requirements and writer role](https://docs.cloud.google.com/storage/docs/access-logs)
- [Google: Object Versioning and soft delete](https://docs.cloud.google.com/storage/docs/object-versioning)
- [Google provider 6.50.0: lifecycle and logging fields](https://github.com/hashicorp/terraform-provider-google/blob/v6.50.0/website/docs/r/storage_bucket.html.markdown)

Google generally recommends Cloud Audit Logs and soft delete for their respective
use cases. The proposed bucket logging and bounded version history add the explicit
controls requested for STRR; they do not replace audit-policy verification. No
scanner rules, findings, or files are excluded by this draft.
