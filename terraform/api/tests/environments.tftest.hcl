mock_provider "google" {}

override_resource {
  target = google_storage_bucket.registration_documents
}

run "preserve_test_resources" {
  command = plan
  variables {
    environment = "test"
  }
  assert {
    condition = (
      google_storage_bucket.registration_documents.name == "strr_registration_documents_test" &&
      google_storage_bucket.registration_documents.project == "bcrbk9-test" &&
      google_storage_bucket.registration_documents.logging[0].log_bucket == "bcrbk9-test-strr-access-logs"
    )
    error_message = "Preserve the selected environment's resource names, routing and existing topology."
  }
}

run "preserve_prod_resources" {
  command = plan
  variables {
    environment = "prod"
  }
  assert {
    condition = (
      google_storage_bucket.registration_documents.name == "strr_registration_document_prod" &&
      google_storage_bucket.registration_documents.project == "bcrbk9-prod" &&
      google_storage_bucket.registration_documents.logging[0].log_bucket == "bcrbk9-prod-strr-access-logs"
    )
    error_message = "Preserve the selected environment's resource names, routing and existing topology."
  }
}
