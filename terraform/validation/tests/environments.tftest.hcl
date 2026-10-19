mock_provider "google" {}

override_resource {
  target = google_pubsub_topic.bulk_validation_response
}

override_resource {
  target = google_pubsub_topic.bulk_validation_response_dlq
}

override_resource {
  target = google_pubsub_subscription.bulk_validation_response
}

override_resource {
  target = google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher
}

override_resource {
  target = google_pubsub_subscription_iam_member.bulk_validation_response_subscriber
}

override_resource {
  target = google_storage_bucket.bulk_validation_requests
}

override_resource {
  target = google_storage_bucket.bulk_validation_responses
}

override_resource {
  target = google_eventarc_trigger.bulk_permit_validation
}

run "preserve_test_resources" {
  command = plan
  variables {
    environment = "test"
  }
  assert {
    condition = (
      google_storage_bucket.bulk_validation_requests.name == "strr_bulk_validation_requests_test" &&
      google_storage_bucket.bulk_validation_responses.project == "bcrbk9-test" &&
      google_storage_bucket.bulk_validation_requests.logging[0].log_bucket == "bcrbk9-test-strr-access-logs" &&
      google_pubsub_topic.bulk_validation_response.name == "strr-bulk-validation-response-test" &&
      google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher.member == "serviceAccount:service-166050292631@gcp-sa-pubsub.iam.gserviceaccount.com" &&
      length(google_pubsub_subscription.bulk_validation_response) == 0 &&
      length(google_pubsub_subscription_iam_member.bulk_validation_response_subscriber) == 0 &&
      length(google_eventarc_trigger.bulk_permit_validation) == 0
    )
    error_message = "Preserve the selected environment's resource names, routing and existing topology."
  }
}

run "preserve_sandbox_resources" {
  command = plan
  variables {
    environment = "sandbox"
  }
  assert {
    condition = (
      google_storage_bucket.bulk_validation_requests.name == "strr_bulk_validation_requests_sandbox" &&
      google_storage_bucket.bulk_validation_responses.project == "bcrbk9-tools" &&
      google_storage_bucket.bulk_validation_requests.logging[0].log_bucket == "bcrbk9-sandbox-strr-access-logs" &&
      google_pubsub_topic.bulk_validation_response.name == "strr-bulk-validation-response-sandbox" &&
      google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher.member == "serviceAccount:service-865508335279@gcp-sa-pubsub.iam.gserviceaccount.com" &&
      length(google_pubsub_subscription.bulk_validation_response) == 0 &&
      length(google_pubsub_subscription_iam_member.bulk_validation_response_subscriber) == 0 &&
      google_eventarc_trigger.bulk_permit_validation[0].destination[0].cloud_run_service[0].service == "batch-permit-listener-sandbox" &&
      google_eventarc_trigger.bulk_permit_validation[0].project == "bcrbk9-tools"
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
      google_storage_bucket.bulk_validation_requests.name == "strr_bulk_validation_requests_prod" &&
      google_storage_bucket.bulk_validation_responses.project == "bcrbk9-prod" &&
      google_storage_bucket.bulk_validation_requests.logging[0].log_bucket == "bcrbk9-prod-strr-access-logs" &&
      google_pubsub_topic.bulk_validation_response.name == "strr-bulk-validation-response-prod" &&
      google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher.member == "serviceAccount:service-575122678722@gcp-sa-pubsub.iam.gserviceaccount.com" &&
      google_pubsub_subscription.bulk_validation_response[0].push_config[0].push_endpoint == "https://batch-permit-listener-prod-575122678722.northamerica-northeast1.run.app/bulk-validation-response" &&
      google_pubsub_subscription.bulk_validation_response[0].push_config[0].oidc_token[0].service_account_email == "sa-pubsub@bcrbk9-prod.iam.gserviceaccount.com" &&
      google_eventarc_trigger.bulk_permit_validation[0].destination[0].cloud_run_service[0].service == "batch-permit-listener-prod" &&
      google_eventarc_trigger.bulk_permit_validation[0].project == "bcrbk9-prod"
    )
    error_message = "Preserve the selected environment's resource names, routing and existing topology."
  }
}
