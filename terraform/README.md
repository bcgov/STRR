# STRR infrastructure

API uploads, email and bulk validation use three Terraform roots. Terraform
1.10.5 and Google provider 6.50.0 are pinned. Existing names and delivery settings
come from the [environment configuration](https://github.com/bcgov/STRR/tree/Jacky/regbacklog-336-terraform/terraform/environments).

| Target | Project | State owner | Configured roots |
| --- | --- | --- | --- |
| DEV | `bcrbk9-dev` | `dev` | api, email, validation |
| TEST | `bcrbk9-test` | `test` | api, email, validation |
| UAT | `bcrbk9-test` | `test` | api, email (shared with TEST) |
| Sandbox | `bcrbk9-tools` | `sandbox` | validation |
| PROD | `bcrbk9-prod` | `prod` | api, email, validation |

State stays in `strr-tools-terraform-state`, under `strr/<owner>/<root>`.
Existing DEV prefixes are unchanged. UAT uses TEST's document bucket and email
topic, so both targets use the same state and concurrency lock. They continue
routing email to the TEST service. UAT's unconfigured batch resources and
sandbox's unconfigured document/email resources are not provisioned here.

Both batch-validator deployments share the validation root. Optional resources
preserve existing differences: only DEV has an email DLQ receiver; TEST and
sandbox have no response callback subscription configured here. TEST Eventarc is
not configured. Sandbox/PROD trigger names are identified from their existing
Eventarc transport topics; confirm their full trigger settings in a live plan
before adoption. Eventarc retains ownership of its generated transport resources.
Runtime identities, project IAM and dedicated log buckets remain under SRE ownership.

## Deployment and rollout

[STRR Terraform](https://github.com/bcgov/STRR/blob/Jacky/regbacklog-336-terraform/.github/workflows/strr-terraform.yaml)
accepts a target and root for manual plan, bootstrap or apply. Every write requires
protected `main` and uses the selected GitHub environment, including PROD's
existing reviewer gate. Each run checks and applies the same saved plan, rejects
deletions, replacements, pending imports and resources in another project, then
requires a no-change plan. Plans and state are not uploaded as artifacts.

PR approval and merge authorize automatic DEV apply without another live-plan
approval. Infrastructure-only pushes run the three DEV roots. Application CD
runs Terraform first for enabled targets on protected `main`; a Terraform failure
blocks that deployment. Feature/hotfix/release deployment behavior is unchanged.

Validate DEV first. After each target's access, bootstrap and runtime checks pass,
add it to the repository variable `STRR_TERRAFORM_ENVIRONMENTS` (a JSON array,
default `["dev"]`). For example, `["dev","test","uat"]` enables those application
CD targets. Enabling UAT covers its shared API/email resources only. Unsupported
root/target combinations are skipped by application CD and rejected by manual
Terraform runs. This setting enables routing; it does not grant cloud access.

The workflow identity is `sa-strr-infra@bcrbk9-tools.iam.gserviceaccount.com`.
Its current WIF trust is DEV-only. Before adopting another target, SRE must
configure trust for that GitHub environment and resource/state access through the
existing IAM process. Do not use the DEV environment to bypass PROD approval.

## First adoption

1. Confirm no other Terraform state owns the selected resources. Check the
   dedicated log destination and writer access using the
   [bucket setup](https://github.com/bcgov/STRR/blob/Jacky/regbacklog-336-terraform/terraform/dev-bucket-security.md),
   substituting the selected environment's configured log bucket. Confirm
   environment-specific routing against a live plan before bootstrap.
2. After review and merge, run `STRR Terraform` from protected `main`, selecting
   the target, root and `bootstrap`. Repeat for each configured root. UAT shares
   TEST's state, so do not adopt those resources a second time elsewhere.
3. Bootstrap imports missing resources into state without changing them, then
   replans. Only bucket logging, versioning and lifecycle updates are allowed;
   other resources must be unchanged. A failed import stops before apply and can
   be retried without discarding imported state. Ordinary apply stops on pending imports.
4. Verify log delivery, version recovery and application behavior with fresh
   synthetic files before enabling the target in application CD. A no-change
   plan proves configuration convergence, not runtime behavior.

After all configured roots are adopted and verified, remove the temporary
`bootstrap` choice, validation branch, import step, bootstrap-only policy/tests
and these first-adoption instructions. Keep normal plan/apply and resource
configuration. Import blocks may remain; they are inert for resources already
in state. The moved blocks preserve previously adopted DEV resource addresses.

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

PR checks use mocked providers without cloud credentials. They cover environment
names/routing, shared state, deployment gates and import/apply safety. Actual
workflow access and runtime behavior require verification in each target.
