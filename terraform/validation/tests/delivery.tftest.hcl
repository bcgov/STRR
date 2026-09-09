mock_provider "google" {}

override_resource {
  target = google_storage_bucket.bulk_validation_requests
}

override_resource {
  target = google_storage_bucket.bulk_validation_responses
}

override_resource {
  target = google_eventarc_trigger.bulk_permit_validation
}

override_resource {
  target = google_pubsub_subscription.bulk_validation_response
  values = { id = "projects/bcrbk9-dev/subscriptions/strr-bulk-validation-response-dev-sub" }
}

override_resource {
  target = google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher
}

override_resource {
  target = google_pubsub_subscription_iam_member.bulk_validation_response_subscriber
}

override_resource {
  target = google_pubsub_topic.bulk_validation_response
  values = { id = "projects/bcrbk9-dev/topics/strr-bulk-validation-response-dev" }
}

override_resource {
  target = google_pubsub_topic.bulk_validation_response_dlq
  values = { id = "projects/bcrbk9-dev/topics/strr-bulk-validation-response-dlq-dev" }
}

run "preserve_dev_validation_pipeline" {
  command = plan

  assert {
    condition = alltrue([
      for bucket in [google_storage_bucket.bulk_validation_requests, google_storage_bucket.bulk_validation_responses] :
      bucket.project == "bcrbk9-dev" && bucket.location == "NORTHAMERICA-NORTHEAST1" &&
      bucket.uniform_bucket_level_access && bucket.public_access_prevention == "enforced" &&
      !bucket.force_destroy && bucket.soft_delete_policy[0].retention_duration_seconds == 604800
    ])
    error_message = "Both DEV validation buckets must preserve their region, private access, recovery window, and contents."
  }

  assert {
    condition = (
      google_storage_bucket.bulk_validation_requests.name == "strr_bulk_validation_requests_dev" &&
      google_storage_bucket.bulk_validation_responses.name == "strr_bulk_validation_responses_dev" &&
      google_eventarc_trigger.bulk_permit_validation.project == "bcrbk9-dev" &&
      google_eventarc_trigger.bulk_permit_validation.service_account == "sa-eventarc@bcrbk9-dev.iam.gserviceaccount.com" &&
      google_eventarc_trigger.bulk_permit_validation.destination[0].cloud_run_service[0].service == "batch-permit-listener-dev" &&
      google_eventarc_trigger.bulk_permit_validation.destination[0].cloud_run_service[0].region == "northamerica-northeast1" &&
      google_eventarc_trigger.bulk_permit_validation.destination[0].cloud_run_service[0].path == "/" &&
      alltrue([
        for criterion in google_eventarc_trigger.bulk_permit_validation.matching_criteria :
        criterion.attribute == "bucket" ? criterion.value == google_storage_bucket.bulk_validation_requests.name :
        criterion.attribute == "type" && criterion.value == "google.cloud.storage.object.v1.finalized"
      ]) &&
      length(google_eventarc_trigger.bulk_permit_validation.matching_criteria) == 2
    )
    error_message = "Only finalized DEV request objects should start the existing validation listener."
  }

  assert {
    condition = (
      google_pubsub_subscription.bulk_validation_response.project == "bcrbk9-dev" &&
      google_pubsub_subscription.bulk_validation_response.topic == google_pubsub_topic.bulk_validation_response.id &&
      google_pubsub_subscription.bulk_validation_response.dead_letter_policy[0].dead_letter_topic == google_pubsub_topic.bulk_validation_response_dlq.id &&
      google_pubsub_subscription.bulk_validation_response.push_config[0].push_endpoint == "https://batch-permit-listener-dev-382361722867.northamerica-northeast1.run.app/bulk-validation-response" &&
      google_pubsub_subscription.bulk_validation_response.push_config[0].oidc_token[0].service_account_email == "sa-pubsub@bcrbk9-dev.iam.gserviceaccount.com" &&
      google_pubsub_subscription.bulk_validation_response.push_config[0].attributes["x-goog-version"] == "v1"
    )
    error_message = "Validation results must retain their authenticated callback route and dedicated dead-letter topic."
  }

  assert {
    condition = (
      google_pubsub_subscription.bulk_validation_response.ack_deadline_seconds == 600 &&
      google_pubsub_subscription.bulk_validation_response.message_retention_duration == "604800s" &&
      google_pubsub_subscription.bulk_validation_response.expiration_policy[0].ttl == "2678400s" &&
      google_pubsub_subscription.bulk_validation_response.dead_letter_policy[0].max_delivery_attempts == 5 &&
      google_pubsub_subscription.bulk_validation_response.retry_policy[0].minimum_backoff == "10s" &&
      google_pubsub_subscription.bulk_validation_response.retry_policy[0].maximum_backoff == "600s"
    )
    error_message = "Adoption must preserve the response subscription's existing expiry, retention, acknowledgement, and retry settings."
  }

  assert {
    condition = (
      google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher.topic == google_pubsub_topic.bulk_validation_response_dlq.name &&
      google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher.role == "roles/pubsub.publisher" &&
      google_pubsub_subscription_iam_member.bulk_validation_response_subscriber.subscription == google_pubsub_subscription.bulk_validation_response.id &&
      google_pubsub_subscription_iam_member.bulk_validation_response_subscriber.role == "roles/pubsub.subscriber" &&
      google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher.member == "serviceAccount:service-382361722867@gcp-sa-pubsub.iam.gserviceaccount.com" &&
      google_pubsub_subscription_iam_member.bulk_validation_response_subscriber.member == google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher.member
    )
    error_message = "Dead-letter permissions must stay on the DEV Pub/Sub service agent and validation resources."
  }
}
