resource "google_storage_bucket" "registration_documents" {
  name                        = "strr_registration_documents_dev"
  project                     = local.project_id
  location                    = upper(local.region)
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  logging {
    log_bucket        = "bcrbk9-dev-strr-access-logs"
    log_object_prefix = "registration-documents/"
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
  to = google_storage_bucket.registration_documents
  id = "bcrbk9-dev/strr_registration_documents_dev"
}
