resource "google_pubsub_topic" "emailer" {
  name    = "strr-emailer-dev"
  project = var.project_id
}

resource "google_pubsub_topic" "emailer_dlq" {
  name    = "strr-emailer-dlq-dev"
  project = var.project_id
}

resource "google_pubsub_topic" "bulk_validation_response" {
  name    = "strr-bulk-validation-response-dev"
  project = var.project_id
}

resource "google_pubsub_subscription" "emailer" {
  name    = "strr-emailer-sub-dev"
  project = var.project_id
  topic   = google_pubsub_topic.emailer.id

  ack_deadline_seconds       = 10
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  expiration_policy {
    ttl = ""
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.emailer_dlq.id
    max_delivery_attempts = 5
  }

  push_config {
    push_endpoint = "https://strr-email-dev-i2rbretwta-nn.a.run.app"

    oidc_token {
      service_account_email = var.email_push_service_account
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

resource "google_pubsub_subscription" "emailer_dlq" {
  name    = "strr-emailer-dlq-sub-dev"
  project = var.project_id
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
  project = var.project_id
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
  id = "projects/bcrbk9-dev/topics/strr-emailer-dev"
}

import {
  to = google_pubsub_topic.emailer_dlq
  id = "projects/bcrbk9-dev/topics/strr-emailer-dlq-dev"
}

import {
  to = google_pubsub_topic.bulk_validation_response
  id = "projects/bcrbk9-dev/topics/strr-bulk-validation-response-dev"
}

import {
  to = google_pubsub_subscription.emailer
  id = "projects/bcrbk9-dev/subscriptions/strr-emailer-sub-dev"
}

import {
  to = google_pubsub_subscription.emailer_dlq
  id = "projects/bcrbk9-dev/subscriptions/strr-emailer-dlq-sub-dev"
}

import {
  to = google_pubsub_topic_iam_member.emailer_dlq_publisher
  id = "projects/bcrbk9-dev/topics/strr-emailer-dlq-dev roles/pubsub.publisher serviceAccount:service-382361722867@gcp-sa-pubsub.iam.gserviceaccount.com"
}

import {
  to = google_pubsub_subscription_iam_member.emailer_subscriber
  id = "projects/bcrbk9-dev/subscriptions/strr-emailer-sub-dev roles/pubsub.subscriber serviceAccount:service-382361722867@gcp-sa-pubsub.iam.gserviceaccount.com"
}
