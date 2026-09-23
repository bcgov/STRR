# STRR DEV bucket security — local rollout draft

For review only. No bucket, IAM, remote state, or deployment has been changed.
This covers only STRR in `bcrbk9-dev`; TEST, UAT, PROD, and other applications are
not included. Do not merge the application change until the prerequisites below
are complete. Do not weaken `scripts/check_plan.py` to combine hardening with
the initial imports.

Publishing a draft for review and running Sonar/CI do not require applying these
settings first. The SRE prerequisites below are merge/deployment gates, not a
reason to skip the PR checks. A passing scan would not prove live log delivery.

## Dedicated log destination

Proposed name: `bcrbk9-dev-strr-access-logs`. SRE must confirm name availability,
ownership, permitted log access, and the same VPC Service Controls perimeter, if
one applies. The bucket must be in `NORTHAMERICA-NORTHEAST1`, like the three source
buckets. It is a Cloud Storage access-log bucket, not a Cloud Logging log bucket.

Draft bucket metadata for SRE's provisioning process (not an executable command):

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

## Order of work before merge

1. Check live bucket metadata, lifecycle rules, effective permissions, and Terraform
   ownership. If another state already manages a bucket, stop and coordinate with
   that owner; do not duplicate ownership. Do not overwrite unreviewed live rules.
2. Through SRE's reviewed process, create/manage the dedicated STRR log destination
   and its writer binding. Verify its region, private access, lifecycle policy,
   and audit coverage. This is a prerequisite, not an action the app workflow can do.
3. Have the authorized owner apply the three application buckets' matching logging,
   versioning, and seven-day noncurrent-cleanup settings as a reviewed prerequisite
   change. Keep all unrelated bucket metadata intact. If an existing Terraform
   state owns them, use that state rather than making out-of-band edits.
4. Using fresh synthetic files only, verify log delivery under all three prefixes,
   version creation on replacement/deletion, and recovery behaviour. Inspect
   lifecycle configuration; do not shorten live retention to speed up tests.
   Mock tests do not prove delivery or waiting-period behaviour.
5. Run full live read-only plans for API, email, and validation. Initial adoption
   must still be 1/6/8 imports with zero additions, updates, or deletions. Recheck
   ownership of the state prefixes and reject any drift or replacements.
6. Require the published candidate's Sonar/CI results and review before merging;
   merge triggers DEV adoption. After adoption, verify no-change plans
   and application upload/validation behaviour. Do not promote other environments.

## References

- [Google: log delivery requirements and writer role](https://docs.cloud.google.com/storage/docs/access-logs)
- [Google: Object Versioning and soft delete](https://docs.cloud.google.com/storage/docs/object-versioning)
- [Google provider 6.50.0: lifecycle and logging fields](https://github.com/hashicorp/terraform-provider-google/blob/v6.50.0/website/docs/r/storage_bucket.html.markdown)

Google generally recommends Cloud Audit Logs and soft delete for their respective
use cases. The proposed bucket logging and bounded version history add the explicit
controls requested for STRR; they do not replace audit-policy verification. No
scanner rules, findings, or files are excluded by this draft.
