# STRR Terraform

This configuration is intentionally limited to the `bcrbk9-dev` project for the initial transfer of STRR infrastructure ownership.

It adopts the existing STRR email Pub/Sub resources and bulk-validation Eventarc trigger into Terraform stored with the application. Eventarc's generated transport topic and subscription remain managed by Eventarc. The application bucket and Cloud Run services are referenced but are not managed by this configuration.

Terraform state is stored in the platform-managed `strr-tools-terraform-state` GCS bucket with the `strr/dev` prefix. The service account, its IAM, and the state bucket remain managed outside this configuration by `bcgov/bcregistry-sre`.

## Local verification

```bash
terraform init
terraform fmt -check -diff -recursive
terraform validate
terraform plan -var-file=dev.tfvars
```

The import blocks are for the initial adoption of existing dev resources. The first reviewed plan must contain only the expected imports, with no resources added, changed, or destroyed.

## GitHub Actions authentication

The workflow uses keyless Workload Identity Federation with:

- Provider: `projects/331250273634/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider`
- Service account: `sa-strr-infra@bcrbk9-tools.iam.gserviceaccount.com`
- GitHub environment: `dev`

These resource identifiers are not secrets. SRE-managed IAM restricts the GitHub `dev` environment identity that can impersonate the service account. The service account can write Terraform state and act as the existing Eventarc and Pub/Sub runtime service accounts.

## Initial adoption

1. Run the workflow with `action: plan`.
2. Confirm that the plan contains only the expected imports and reports `0 to add, 0 to change, 0 to destroy`.
3. Run the workflow from `main` with `action: apply` to record the imports in Terraform state.
4. Run `action: plan` again and confirm that Terraform reports no changes.

Changes that add missing environment-parity resources should be reviewed separately from this no-change adoption.
