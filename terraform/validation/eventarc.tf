resource "google_eventarc_trigger" "bulk_permit_validation" {
  count = local.config.validation.eventarc_trigger == null ? 0 : 1

  name     = local.config.validation.eventarc_trigger
  location = local.region
  project  = local.project_id

  event_data_content_type = "application/json"
  service_account         = "sa-eventarc@${local.project_id}.iam.gserviceaccount.com"

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.storage.object.v1.finalized"
  }

  matching_criteria {
    attribute = "bucket"
    value     = google_storage_bucket.bulk_validation_requests.name
  }

  destination {
    cloud_run_service {
      service = "batch-permit-listener-${var.environment}"
      region  = local.region
      path    = "/"
    }
  }
}

import {
  for_each = local.config.validation.eventarc_trigger == null ? [] : ["existing"]
  to       = google_eventarc_trigger.bulk_permit_validation[0]
  id       = "projects/${local.project_id}/locations/northamerica-northeast1/triggers/${local.config.validation.eventarc_trigger}"
}

moved {
  from = google_eventarc_trigger.bulk_permit_validation
  to   = google_eventarc_trigger.bulk_permit_validation[0]
}
