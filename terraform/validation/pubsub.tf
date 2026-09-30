resource "google_pubsub_topic" "bulk_validation_response" {
  name    = "strr-bulk-validation-response-dev"
  project = local.project_id
}

resource "google_pubsub_topic" "bulk_validation_response_dlq" {
  name    = "strr-bulk-validation-response-dlq-dev"
  project = local.project_id
}

resource "google_pubsub_subscription" "bulk_validation_response" {
  name    = "strr-bulk-validation-response-dev-sub"
  project = local.project_id
  topic   = google_pubsub_topic.bulk_validation_response.id

  ack_deadline_seconds       = 600
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  expiration_policy {
    ttl = "2678400s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.bulk_validation_response_dlq.id
    max_delivery_attempts = 5
  }

  push_config {
    push_endpoint = "https://batch-permit-listener-dev-382361722867.northamerica-northeast1.run.app/bulk-validation-response"

    attributes = {
      x-goog-version = "v1"
    }

    oidc_token {
      service_account_email = "sa-pubsub@bcrbk9-dev.iam.gserviceaccount.com"
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

# Pub/Sub needs these permissions for dead-letter forwarding and tracking.
resource "google_pubsub_topic_iam_member" "bulk_validation_response_dlq_publisher" {
  project = local.project_id
  topic   = google_pubsub_topic.bulk_validation_response_dlq.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${local.pubsub_service_agent}"
}

resource "google_pubsub_subscription_iam_member" "bulk_validation_response_subscriber" {
  subscription = google_pubsub_subscription.bulk_validation_response.id
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${local.pubsub_service_agent}"
}

import {
  to = google_pubsub_topic.bulk_validation_response
  id = "projects/bcrbk9-dev/topics/strr-bulk-validation-response-dev"
}

import {
  to = google_pubsub_topic.bulk_validation_response_dlq
  id = "projects/bcrbk9-dev/topics/strr-bulk-validation-response-dlq-dev"
}

import {
  to = google_pubsub_subscription.bulk_validation_response
  id = "projects/bcrbk9-dev/subscriptions/strr-bulk-validation-response-dev-sub"
}

import {
  to = google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher
  id = "projects/bcrbk9-dev/topics/strr-bulk-validation-response-dlq-dev roles/pubsub.publisher serviceAccount:service-382361722867@gcp-sa-pubsub.iam.gserviceaccount.com"
}

import {
  to = google_pubsub_subscription_iam_member.bulk_validation_response_subscriber
  id = "projects/bcrbk9-dev/subscriptions/strr-bulk-validation-response-dev-sub roles/pubsub.subscriber serviceAccount:service-382361722867@gcp-sa-pubsub.iam.gserviceaccount.com"
}
