# STRR DEV infrastructure

Each application deployment owns its related infrastructure through a separate
Terraform root. All three roots are restricted to `bcrbk9-dev` and use Terraform
1.10.5 with the checked-in Google provider 6.50.0 lockfiles.

| Root | State prefix | Existing resources adopted | Deployment workflow |
| --- | --- | --- | --- |
| `api` | `strr/dev/api` | Registration-document bucket (1 import) | `strr-api-cd.yaml` |
| `email` | `strr/dev/email` | Email and dead-letter topics, subscriptions, and dead-letter IAM (6 imports) | `strr-email-cd.yaml` |
| `validation` | `strr/dev/validation` | Request/response buckets, Eventarc, callback and dead-letter topics, callback subscription, and dead-letter IAM (8 imports) | Both batch-validator CD workflows |

The API produces validation request files, but the validation root owns that bucket.
Both validation deployments call the same root and share one queued concurrency
group; neither defines a second copy of the resources. State is stored in the
existing `strr-tools-terraform-state` bucket. No routine `-target` operations are used.

## Automatic deployment

On a push to protected `main`, or a manual application deployment from protected
`main` targeting DEV, the corresponding CD workflow runs Terraform before deploying
the application. Infrastructure-only changes also trigger their owning DEV workflow.
Other application targets and feature/hotfix/release deployments retain their
existing behavior and skip Terraform. Promotion to other environments needs a
separate change with matching state, resource names, workflow routing, and IAM.

The reusable `STRR Terraform` workflow:

1. Validates the selected root and action before authentication.
2. Initializes the root, checks formatting, and validates the configuration.
3. Saves a plan and adds its human-readable output to the job summary.
4. Checks the plan with `scripts/check_plan.py`.
5. For an apply run, applies that exact saved plan. Failure blocks the application deployment.

While any resource is being imported, the plan must contain only imports and
no-op actions: zero additions, changes, or deletions across the root. Once a root
has been adopted, DEV creation and updates are allowed automatically; deletions
and replacements are rejected. Buckets also use `prevent_destroy` and
`force_destroy = false`. Existing public-access prevention, uniform access, and
seven-day soft deletion are preserved. Terraform's default attribution label is
disabled so adoption does not relabel existing resources.

This is automatic deployment of code reviewed on `main`; it does not depend on a
GitHub environment approval rule. A manual `STRR Terraform` plan can be run for an
individual root on a branch once the workflow exists on the default branch.
Manual applies are restricted to protected `main`. Raw saved plans and JSON plans
are not uploaded as artifacts because they can contain sensitive values.

## Prerequisites and first adoption

Authentication uses the existing keyless configuration:

- WIF provider: `projects/331250273634/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider`.
- Infrastructure identity: `sa-strr-infra@bcrbk9-tools.iam.gserviceaccount.com`.
- GitHub environment: `dev` (the existing WIF subject includes this environment).

SRE owns the service accounts, project IAM, WIF binding, state bucket, and runtime
access. The original bootstrap was delivered in `bcgov/bcregistry-sre#386` and
`#387`. The additional [SRE bucket-metadata permission change (#399)](https://github.com/bcgov/bcregistry-sre/pull/399) must
be applied in the `dev` workspace **before this PR is merged**, because merging
starts the automatic DEV workflows. It grants only bucket metadata get/update
on the three named existing DEV buckets, without object or bucket-IAM access.

All 15 imported resources, their Cloud Run destinations, and the runtime IAM must
already exist. This change adopts existing DEV infrastructure; it is not a bootstrap
for a new environment. App authentication, including existing key/ADC behavior,
is unchanged. Eventarc continues to own its generated transport topic and
subscription. The upload-event dead-letter topic, malware-scanning buckets,
unexplained validation DLQ storage buckets, and platform infrastructure are outside
these roots.

The state bucket was empty when inspected on 2026-09-09. Before first adoption,
confirm that the earlier combined root has not since written state under `strr/dev`
and that no other state owns these resources. Do not import the same resource into
two states. If the old combined root has been applied, migrate its ownership
explicitly before enabling these workflows; do not run the old and new roots in parallel.

The first plans must report 1 API, 6 email, and 8 validation imports with
`0 to add, 0 to change, 0 to destroy`. The workflow fails if it observes drift
during adoption. Reconcile any such difference in a reviewed change. After adoption,
a second plan for each root should report no changes.

## Verification

`STRR Terraform CI` runs on relevant pull requests without cloud authentication:

```bash
terraform fmt -check -diff -recursive terraform
for stack in api email validation; do
  terraform -chdir="terraform/$stack" init -backend=false -input=false -lockfile=readonly
  terraform -chdir="terraform/$stack" validate
  terraform -chdir="terraform/$stack" test
done
python3 -m unittest discover -s terraform/tests -v
# Run in a virtual environment with PyYAML==6.0.2 installed:
python3 -m unittest discover -s tests/workflows -v
```

Mock tests verify DEV resource relationships, routing, retention, and bucket
protections. Workflow tests exercise the actual branch/target expressions and
input validation. Plan-policy tests cover drift during import, cross-environment
changes, incomplete plans, and deletion/replacement attempts.

For a read-only live plan with an appropriately authorized identity:

```bash
terraform -chdir=terraform/email init -input=false -lockfile=readonly
terraform -chdir=terraform/email plan -input=false -lock=false -out=tfplan
terraform -chdir=terraform/email show -json tfplan > terraform/email/tfplan.json
python3 terraform/scripts/check_plan.py terraform/email/tfplan.json
```

Repeat for `api` and `validation`. Schema and mocked tests do not establish live
permissions or a drift-free import. A successful live plan is still required before
the workflow applies, and no deployment is needed to run the PR checks.
