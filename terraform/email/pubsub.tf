resource "google_pubsub_topic" "emailer" {
  name    = "strr-emailer-${var.environment}"
  project = local.project_id
}

resource "google_pubsub_topic" "emailer_dlq" {
  name    = "strr-emailer-dlq-${var.environment}"
  project = local.project_id
}

resource "google_pubsub_subscription" "emailer" {
  name    = local.config.email.subscription
  project = local.project_id
  topic   = google_pubsub_topic.emailer.id

  ack_deadline_seconds       = local.config.email.ack_deadline_seconds
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  expiration_policy {
    ttl = local.config.email.expiration_ttl
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.emailer_dlq.id
    max_delivery_attempts = 5
  }

  push_config {
    push_endpoint = local.config.email.push_endpoint

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

resource "google_pubsub_subscription" "emailer_dlq" {
  count = local.config.email.dlq_subscription == null ? 0 : 1

  name    = local.config.email.dlq_subscription
  project = local.project_id
  topic   = google_pubsub_topic.emailer_dlq.id

  ack_deadline_seconds       = 60
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  expiration_policy {
    ttl = ""
  }
}

# Pub/Sub needs these permissions for dead-letter forwarding and tracking.
resource "google_pubsub_topic_iam_member" "emailer_dlq_publisher" {
  project = local.project_id
  topic   = google_pubsub_topic.emailer_dlq.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${local.pubsub_service_agent}"
}

resource "google_pubsub_subscription_iam_member" "emailer_subscriber" {
  subscription = google_pubsub_subscription.emailer.id
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${local.pubsub_service_agent}"
}

import {
  to = google_pubsub_topic.emailer
  id = "projects/${local.project_id}/topics/strr-emailer-${var.environment}"
}

import {
  to = google_pubsub_topic.emailer_dlq
  id = "projects/${local.project_id}/topics/strr-emailer-dlq-${var.environment}"
}

import {
  to = google_pubsub_subscription.emailer
  id = "projects/${local.project_id}/subscriptions/${local.config.email.subscription}"
}

import {
  for_each = local.config.email.dlq_subscription == null ? [] : ["existing"]
  to       = google_pubsub_subscription.emailer_dlq[0]
  id       = "projects/${local.project_id}/subscriptions/${local.config.email.dlq_subscription}"
}

import {
  to = google_pubsub_topic_iam_member.emailer_dlq_publisher
  id = "projects/${local.project_id}/topics/strr-emailer-dlq-${var.environment} roles/pubsub.publisher serviceAccount:${local.pubsub_service_agent}"
}

import {
  to = google_pubsub_subscription_iam_member.emailer_subscriber
  id = "projects/${local.project_id}/subscriptions/${local.config.email.subscription} roles/pubsub.subscriber serviceAccount:${local.pubsub_service_agent}"
}

moved {
  from = google_pubsub_subscription.emailer_dlq
  to   = google_pubsub_subscription.emailer_dlq[0]
}
