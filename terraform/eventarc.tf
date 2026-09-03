resource "google_eventarc_trigger" "bulk_permit_validation" {
  name     = "bulk-permit-validation-trigger"
  location = var.region
  project  = var.project_id

  event_data_content_type = "application/json"
  service_account         = var.eventarc_service_account

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.storage.object.v1.finalized"
  }

  matching_criteria {
    attribute = "bucket"
    value     = var.bulk_validation_requests_bucket
  }

  destination {
    cloud_run_service {
      service = var.bulk_validation_listener_service
      region  = var.region
      path    = "/"
    }
  }
}

import {
  to = google_eventarc_trigger.bulk_permit_validation
  id = "projects/bcrbk9-dev/locations/northamerica-northeast1/triggers/bulk-permit-validation-trigger"
}
