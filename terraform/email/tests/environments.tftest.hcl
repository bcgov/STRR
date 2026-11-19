mock_provider "google" {}

override_resource {
  target = google_pubsub_topic.emailer
}

override_resource {
  target = google_pubsub_topic.emailer_dlq
}

override_resource {
  target = google_pubsub_subscription.emailer
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

run "preserve_test_resources" {
  command = plan
  variables {
    environment = "test"
  }
  assert {
    condition = (
      google_pubsub_subscription.emailer.name == "strr-emailer-test" &&
      google_pubsub_subscription.emailer.project == "bcrbk9-test" &&
      google_pubsub_subscription.emailer.push_config[0].push_endpoint == "https://strr-email-test-5g4775umoq-nn.a.run.app" &&
      google_pubsub_subscription.emailer.push_config[0].oidc_token[0].service_account_email == "sa-pubsub@bcrbk9-test.iam.gserviceaccount.com" &&
      google_pubsub_subscription.emailer.ack_deadline_seconds == 600 &&
      google_pubsub_subscription.emailer.expiration_policy[0].ttl == "" &&
      length(google_pubsub_subscription.emailer_dlq) == 0 &&
      google_pubsub_topic_iam_member.emailer_dlq_publisher.member == "serviceAccount:service-166050292631@gcp-sa-pubsub.iam.gserviceaccount.com"
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
      google_pubsub_subscription.emailer.name == "strr-emailer-prod-sub" &&
      google_pubsub_subscription.emailer.project == "bcrbk9-prod" &&
      google_pubsub_subscription.emailer.push_config[0].push_endpoint == "https://strr-email-prod-r42khalgeq-nn.a.run.app" &&
      google_pubsub_subscription.emailer.push_config[0].oidc_token[0].service_account_email == "sa-pubsub@bcrbk9-prod.iam.gserviceaccount.com" &&
      google_pubsub_subscription.emailer.ack_deadline_seconds == 600 &&
      google_pubsub_subscription.emailer.expiration_policy[0].ttl == "2678400s" &&
      length(google_pubsub_subscription.emailer_dlq) == 0 &&
      google_pubsub_topic_iam_member.emailer_dlq_publisher.member == "serviceAccount:service-575122678722@gcp-sa-pubsub.iam.gserviceaccount.com"
    )
    error_message = "Preserve the selected environment's resource names, routing and existing topology."
  }
}
