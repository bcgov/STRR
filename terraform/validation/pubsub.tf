resource "google_pubsub_topic" "bulk_validation_response" {
  name    = "strr-bulk-validation-response-${var.environment}"
  project = local.project_id
}

resource "google_pubsub_topic" "bulk_validation_response_dlq" {
  name    = "strr-bulk-validation-response-dlq-${var.environment}"
  project = local.project_id
}

resource "google_pubsub_subscription" "bulk_validation_response" {
  count = local.config.validation.response_subscription == null ? 0 : 1

  name    = local.config.validation.response_subscription
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
    push_endpoint = local.config.validation.push_endpoint

    attributes = {
      x-goog-version = "v1"
    }

    oidc_token {
      service_account_email = "sa-pubsub@${local.project_id}.iam.gserviceaccount.com"
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
  count = local.config.validation.response_subscription == null ? 0 : 1

  subscription = google_pubsub_subscription.bulk_validation_response[0].id
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${local.pubsub_service_agent}"
}

import {
  to = google_pubsub_topic.bulk_validation_response
  id = "projects/${local.project_id}/topics/strr-bulk-validation-response-${var.environment}"
}

import {
  to = google_pubsub_topic.bulk_validation_response_dlq
  id = "projects/${local.project_id}/topics/strr-bulk-validation-response-dlq-${var.environment}"
}

import {
  for_each = local.config.validation.response_subscription == null ? [] : ["existing"]
  to       = google_pubsub_subscription.bulk_validation_response[0]
  id       = "projects/${local.project_id}/subscriptions/${local.config.validation.response_subscription}"
}

import {
  to = google_pubsub_topic_iam_member.bulk_validation_response_dlq_publisher
  id = "projects/${local.project_id}/topics/strr-bulk-validation-response-dlq-${var.environment} roles/pubsub.publisher serviceAccount:${local.pubsub_service_agent}"
}

import {
  for_each = local.config.validation.response_subscription == null ? [] : ["existing"]
  to       = google_pubsub_subscription_iam_member.bulk_validation_response_subscriber[0]
  id       = "projects/${local.project_id}/subscriptions/${local.config.validation.response_subscription} roles/pubsub.subscriber serviceAccount:${local.pubsub_service_agent}"
}

moved {
  from = google_pubsub_subscription.bulk_validation_response
  to   = google_pubsub_subscription.bulk_validation_response[0]
}

moved {
  from = google_pubsub_subscription_iam_member.bulk_validation_response_subscriber
  to   = google_pubsub_subscription_iam_member.bulk_validation_response_subscriber[0]
}
