mock_provider "google" {}

override_resource {
  target = google_storage_bucket.registration_documents
}

run "preserve_dev_document_storage" {
  command = plan

  assert {
    condition = (
      google_storage_bucket.registration_documents.project == "bcrbk9-dev" &&
      google_storage_bucket.registration_documents.name == "strr_registration_documents_dev" &&
      google_storage_bucket.registration_documents.location == "NORTHAMERICA-NORTHEAST1"
    )
    error_message = "Document storage must remain in the existing DEV bucket and Canadian region."
  }

  assert {
    condition = (
      google_storage_bucket.registration_documents.uniform_bucket_level_access &&
      google_storage_bucket.registration_documents.public_access_prevention == "enforced" &&
      !google_storage_bucket.registration_documents.force_destroy &&
      google_storage_bucket.registration_documents.soft_delete_policy[0].retention_duration_seconds == 604800
    )
    error_message = "Adoption must preserve private bucket access, seven-day recovery, and protection against deleting contents."
  }

  assert {
    condition = try(
      google_storage_bucket.registration_documents.logging[0].log_bucket == "bcrbk9-dev-strr-access-logs" &&
      google_storage_bucket.registration_documents.logging[0].log_object_prefix == "registration-documents/",
      false
    )
    error_message = "Document access logs must use the dedicated STRR DEV log bucket and prefix."
  }

  assert {
    condition     = try(google_storage_bucket.registration_documents.versioning[0].enabled, false)
    error_message = "Document storage must retain noncurrent versions."
  }

  assert {
    condition = try(
      length(google_storage_bucket.registration_documents.lifecycle_rule) == 1 &&
      one(one(google_storage_bucket.registration_documents.lifecycle_rule).action).type == "Delete" &&
      one(one(google_storage_bucket.registration_documents.lifecycle_rule).condition).with_state == "ARCHIVED" &&
      one(one(google_storage_bucket.registration_documents.lifecycle_rule).condition).days_since_noncurrent_time == 7 &&
      !one(one(google_storage_bucket.registration_documents.lifecycle_rule).condition).send_age_if_zero,
      false
    )
    error_message = "Only noncurrent document versions may be cleaned up, after seven days; live files must not expire."
  }
}
