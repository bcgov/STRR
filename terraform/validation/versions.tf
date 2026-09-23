terraform {
  required_version = "~> 1.10.5"

  backend "gcs" {
    bucket = "strr-tools-terraform-state"
    prefix = "strr/dev/validation"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

locals {
  project_id           = "bcrbk9-dev"
  region               = "northamerica-northeast1"
  pubsub_service_agent = "service-382361722867@gcp-sa-pubsub.iam.gserviceaccount.com"
}

provider "google" {
  project                         = local.project_id
  region                          = local.region
  add_terraform_attribution_label = false
}
