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
}
