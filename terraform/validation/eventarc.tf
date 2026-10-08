resource "google_eventarc_trigger" "bulk_permit_validation" {
  name     = "bulk-permit-validation-trigger"
  location = local.region
  project  = local.project_id

  event_data_content_type = "application/json"
  service_account         = "sa-eventarc@bcrbk9-dev.iam.gserviceaccount.com"

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
      service = "batch-permit-listener-dev"
      region  = local.region
      path    = "/"
    }
  }
}

import {
  to = google_eventarc_trigger.bulk_permit_validation
  id = "projects/bcrbk9-dev/locations/northamerica-northeast1/triggers/bulk-permit-validation-trigger"
}
