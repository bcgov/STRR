# STRR DEV infrastructure

API uploads, email and bulk validation use separate Terraform roots in
`bcrbk9-dev`. Terraform 1.10.5 and Google provider 6.50.0 are pinned.

| Root | State prefix in `strr-tools-terraform-state` | Existing resources |
| --- | --- | --- |
| `api` | `strr/dev/api` | Registration-document bucket (1) |
| `email` | `strr/dev/email` | Email topics, subscriptions and dead-letter IAM (6) |
| `validation` | `strr/dev/validation` | Request/response buckets, Eventarc, callback topics/subscription and dead-letter IAM (8) |

Both batch-validator deployments share the validation root and concurrency group.
Eventarc owns its generated transport resources. Other environments, runtime
identities, project IAM and the dedicated log bucket remain outside these roots.

## Deployment

On protected `main`, application deployments targeting DEV run their Terraform
root first. Other application targets and feature/hotfix/release deployments
retain their existing behavior. Infrastructure-only pushes to `main` run all three
roots through [STRR Terraform](https://github.com/bcgov/STRR/blob/Jacky/regbacklog-336-terraform/.github/workflows/strr-terraform.yaml), without deploying an application.

The workflow uses the existing `dev` GitHub environment and keyless WIF binding
for `sa-strr-infra@bcrbk9-tools.iam.gserviceaccount.com`. It saves a plan, rejects
pending imports, deletions, replacements and non-DEV changes, then applies that
exact plan. A fresh plan must report no remaining changes. Failure blocks the
calling application deployment. Plans and state are not uploaded as artifacts.

## First DEV adoption

Before running bootstrap, confirm that no other Terraform state owns these 15
resources. Do not import the same object into two states. Confirm the dedicated
log destination using the
[bucket setup](https://github.com/bcgov/STRR/blob/Jacky/regbacklog-336-terraform/terraform/dev-bucket-security.md).
SRE manages the destination writer binding; actual log delivery verifies that
it works without requiring the operator to read bucket IAM. The three source buckets do not need their logging/versioning settings applied
manually first. [SRE #399](https://github.com/bcgov/bcregistry-sre/pull/399) grants
the workflow identity metadata get/update on those buckets.

After this workflow is reviewed and merged, run `STRR Terraform` from protected
`main`, selecting `bootstrap` once for each root: `api`, `email`, `validation`.
GitHub enables manual runs after the workflow reaches the default branch. Until
bootstrap completes, ordinary apply runs stop on pending imports.

Bootstrap first plans against the live resources, then uses `terraform import`
to write their existing state without changing cloud resources. It imports only
resources still missing from that root's state, so a failed run can be retried.
A partial failure stops before applying changes; retain the imported
state and rerun after resolving the failure.

After import, bootstrap generates a fresh plan. Only updates to the existing
buckets' logging, versioning and lifecycle fields are allowed; other resources
must be unchanged. The workflow applies that saved plan and verifies a no-change
plan. Only the fresh post-import plan is applied.

Verify log delivery and version recovery with fresh synthetic files before closing
DEV verification. A no-change plan proves configuration convergence, not working
log delivery or application behavior.

## Remove the temporary setup

After all three roots are adopted and DEV verification passes, remove the
`bootstrap` choice, its validation branch, the `Import existing resources` step,
and the bootstrap-only bucket-field restriction from the workflow. Remove the
bootstrap-specific tests and these first-adoption instructions in the same change.
Normal plan/apply, state, resource definitions and deployment checks stay. The
import blocks can stay too; they are inert for addresses already in state.

## Local checks

```bash
terraform fmt -check -diff -recursive terraform
for stack in api email validation; do
  terraform -chdir="terraform/$stack" init -backend=false -input=false -lockfile=readonly
  terraform -chdir="terraform/$stack" validate
  terraform -chdir="terraform/$stack" test
done
# Use a virtual environment with PyYAML==6.0.2 installed.
python3 -m unittest discover -s tests/workflows -v
```

PR checks use mocked providers and no cloud credentials. Workflow tests cover
branch/target routing, state-only import ordering, retry/failure behavior and
rejection of unsafe plans. Live workflow access still needs a real run.
