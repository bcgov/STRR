variable "project_id" {
  description = "The single GCP project managed by this initial dev-only configuration."
  type        = string

  validation {
    condition     = var.project_id == "bcrbk9-dev"
    error_message = "This initial configuration is intentionally limited to bcrbk9-dev."
  }
}

variable "region" {
  description = "Regional location for STRR Eventarc resources."
  type        = string
  default     = "northamerica-northeast1"
}

variable "bulk_validation_requests_bucket" {
  description = "GCS bucket that emits finalized-object events for bulk validation."
  type        = string
}

variable "bulk_validation_listener_service" {
  description = "Cloud Run service receiving the bulk validation Eventarc trigger."
  type        = string
}

variable "eventarc_service_account" {
  description = "Existing STRR service account used for Eventarc delivery."
  type        = string
}

variable "email_push_service_account" {
  description = "Existing STRR service account used for authenticated email delivery."
  type        = string
}
