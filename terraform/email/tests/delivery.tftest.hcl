mock_provider "google" {}

override_resource {
  target = google_pubsub_subscription.emailer
  values = { id = "projects/bcrbk9-dev/subscriptions/strr-emailer-sub-dev" }
}

override_resource {
  target = google_pubsub_subscription.emailer_dlq
}

override_resource {
  target = google_pubsub_topic_iam_member.emailer_dlq_publisher
}

override_resource {
  target = google_pubsub_subscription_iam_member.emailer_subscriber
}

override_resource {
  target = google_pubsub_topic.emailer
  values = { id = "projects/bcrbk9-dev/topics/strr-emailer-dev" }
}

override_resource {
  target = google_pubsub_topic.emailer_dlq
  values = { id = "projects/bcrbk9-dev/topics/strr-emailer-dlq-dev" }
}

run "preserve_dev_email_delivery" {
  command = plan

  assert {
    condition = (
      google_pubsub_subscription.emailer.project == "bcrbk9-dev" &&
      google_pubsub_topic.emailer.project == "bcrbk9-dev" &&
      google_pubsub_topic.emailer_dlq.project == "bcrbk9-dev" &&
      google_pubsub_subscription.emailer.push_config[0].push_endpoint == "https://strr-email-dev-i2rbretwta-nn.a.run.app" &&
      google_pubsub_subscription.emailer.push_config[0].oidc_token[0].service_account_email == "sa-pubsub@bcrbk9-dev.iam.gserviceaccount.com" &&
      google_pubsub_subscription.emailer.push_config[0].attributes["x-goog-version"] == "v1"
    )
    error_message = "Email delivery must stay authenticated and routed to the existing DEV email service."
  }

  assert {
    condition = (
      google_pubsub_subscription.emailer.topic == google_pubsub_topic.emailer.id &&
      google_pubsub_subscription.emailer.dead_letter_policy[0].dead_letter_topic == google_pubsub_topic.emailer_dlq.id &&
      google_pubsub_subscription.emailer_dlq.topic == google_pubsub_topic.emailer_dlq.id &&
      google_pubsub_subscription.emailer.dead_letter_policy[0].max_delivery_attempts == 5 &&
      google_pubsub_subscription.emailer.expiration_policy[0].ttl == "" &&
      google_pubsub_subscription.emailer_dlq.expiration_policy[0].ttl == "" &&
      google_pubsub_subscription.emailer.message_retention_duration == "604800s" &&
      google_pubsub_subscription.emailer_dlq.message_retention_duration == "604800s"
    )
    error_message = "Preserve email dead-letter routing, delivery attempts, retention, and non-expiring subscriptions."
  }

  assert {
    condition = (
      google_pubsub_topic_iam_member.emailer_dlq_publisher.topic == google_pubsub_topic.emailer_dlq.name &&
      google_pubsub_topic_iam_member.emailer_dlq_publisher.role == "roles/pubsub.publisher" &&
      google_pubsub_subscription_iam_member.emailer_subscriber.subscription == google_pubsub_subscription.emailer.id &&
      google_pubsub_subscription_iam_member.emailer_subscriber.role == "roles/pubsub.subscriber" &&
      google_pubsub_topic_iam_member.emailer_dlq_publisher.member == "serviceAccount:service-382361722867@gcp-sa-pubsub.iam.gserviceaccount.com" &&
      google_pubsub_subscription_iam_member.emailer_subscriber.member == google_pubsub_topic_iam_member.emailer_dlq_publisher.member
    )
    error_message = "Dead-letter forwarding permissions must remain scoped to the DEV Pub/Sub service agent and email resources."
  }
}
