terraform {
  required_version = "~> 1.10.5"

  backend "gcs" {
    bucket = "strr-tools-terraform-state"
    prefix = "strr/dev"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
