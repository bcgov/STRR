terraform {
  required_version = "~> 1.10.5"

  backend "gcs" {
    bucket = "strr-tools-terraform-state"
    prefix = "strr/dev/api"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "environment" {
  description = "Resource-owning environment; UAT shares TEST resources."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "sandbox", "prod"], var.environment)
    error_message = "Use a configured resource-owning environment."
  }
}

locals {
  config     = jsondecode(file("${path.module}/../environments/${var.environment}.json"))
  project_id = local.config.project_id
  region     = "northamerica-northeast1"
}

provider "google" {
  project                         = local.project_id
  region                          = local.region
  add_terraform_attribution_label = false
}
