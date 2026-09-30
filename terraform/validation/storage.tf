resource "google_storage_bucket" "bulk_validation_requests" {
  name                        = "strr_bulk_validation_requests_dev"
  project                     = local.project_id
  location                    = upper(local.region)
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  logging {
    log_bucket        = "bcrbk9-dev-strr-access-logs"
    log_object_prefix = "bulk-validation-requests/"
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      with_state                 = "ARCHIVED"
      days_since_noncurrent_time = 7
      send_age_if_zero           = false
    }
  }

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket" "bulk_validation_responses" {
  name                        = "strr_bulk_validation_responses_dev"
  project                     = local.project_id
  location                    = upper(local.region)
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  logging {
    log_bucket        = "bcrbk9-dev-strr-access-logs"
    log_object_prefix = "bulk-validation-responses/"
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      with_state                 = "ARCHIVED"
      days_since_noncurrent_time = 7
      send_age_if_zero           = false
    }
  }

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = google_storage_bucket.bulk_validation_requests
  id = "bcrbk9-dev/strr_bulk_validation_requests_dev"
}

import {
  to = google_storage_bucket.bulk_validation_responses
  id = "bcrbk9-dev/strr_bulk_validation_responses_dev"
}
