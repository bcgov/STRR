# Runbook: Queue Services and Jobs

Pub/Sub-backed workers (`strr-pay`, `strr-email`, `batch-permit-validator` listener) and scheduled or batch Cloud Run Jobs under `jobs/`.

## Queue services (Cloud Run + Pub/Sub)

### strr-pay

- **Role:** HTTP worker consuming payment CloudEvents; on `bc.registry.payment` with `status_code == COMPLETED`, loads `Application` by `invoice_id` and if status is `PAYMENT_DUE`, sets `PAID`, `payment_completion_date`, `payment_status_code`.
- **Retries:** Returns **404** when application not found so the message can be retried (ordering race).
- **Code:** `queue_services/strr-pay/src/strr_pay/resources/pay_listener.py`
- **Logging:** JSON structlog via `structured-logging` (sbc-connect-common), with fields such as `message`, `severity`.

### strr-email

- **Role:** Consumes queue messages, posts to Notify API for email delivery.
- **Config:** `GCP_EMAIL_TOPIC`. If unset, publisher may skip with an info log (`gcp_queue_publisher` pattern in API).
- **Code:** `queue_services/strr-email/src/strr_email/resources/email_listener.py`

### batch-permit-validator (listener)

- **Role:** Batch / permit validation listener (see `queue_services/batch-permit-validator/README.md`).
- **Note:** A job variant also exists under `jobs/batch-permit-validator/`. Do not confuse deployables.

## Jobs (repo folders)

Typical jobs in `jobs/`:

| Job (folder) | Purpose (high level) |
|--------------|---------------------|
| `auto-approval` | Processes `PAID` applications past delay; calls `ApprovalService.process_auto_approval` |
| `provisional-approval` | Provisional approval path |
| `registration_expiry` | Expires registrations |
| `renewal-reminders` | Sends renewal reminders |
| `noc_expiry` | NOC expiry processing |
| `interactions-update` | Customer interaction sync |
| `strr-backfiller` | Backfill utility |
| `batch-permit-validator` | Batch permit validation job |

**Deployment:** Cloud Run **Jobs** via `backend-job-cd.yaml` pattern from `bcregistry-sre`.

**Common failures:**

- **DB pool timeouts:** e.g. `interactions-update` (long-running DB work)
- **Batch timeouts:** e.g. batch-permit-validator Cloud Run Job timeout (check `clouddeploy.yaml` / job template - historically long timeouts like 45 minutes mentioned in design docs)

## Log diving: queue services

strr-pay / strr-email use **JSON** logs (`jsonPayload.message`, `jsonPayload.severity`) when ingested as structured JSON.

**Note:** Queries below are pinned to **prod** service names (`*-prod`). For other environments, replace `-prod` with the appropriate suffix (for example `-test` or `-dev`).

### strr-pay

**Event pipeline:**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-pay-prod"
jsonPayload.message=~"(Incoming raw msg|received ce|Processing payment|completed ce)"
```

**Errors:**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-pay-prod"
severity="ERROR"
```

### strr-email

**Notify failures:**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-email-prod"
jsonPayload.message=~"Error posting email to notify-api"
```

**Activity:**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-email-prod"
jsonPayload.message=~"(completed ce|Error)"
```

## Log diving: Cloud Run Jobs

**Resource type:** `cloud_run_job` (verify in your project; filters differ from `cloud_run_revision`).

**Auto-approval errors (plain text logger in job):**

```text
resource.type="cloud_run_job"
resource.labels.job_name="strr-auto-approval-prod"
textPayload=~" - ERROR in "
```

**Auto-approval verbose:**

```text
resource.type="cloud_run_job"
resource.labels.job_name="strr-auto-approval-prod"
severity>="INFO"
```

**batch-permit-validator (job) errors:**

```text
resource.type="cloud_run_job"
resource.labels.job_name="batch-permit-job-prod"
severity="ERROR"
```

**registration_expiry:**

```text
resource.type="cloud_run_job"
resource.labels.job_name="strr-registration-expiry-prod"
severity>="INFO"
```

**noc_expiry:**

```text
resource.type="cloud_run_job"
resource.labels.job_name="strr-noc-expiry-prod"
severity>="INFO"
```

**Note:** Exact **`job_name`** labels in GCP must match your Cloud Run Job resource names. Adjust filters accordingly.

## SQL: queue / job investigation

**PAID applications (auto-approval backlog):**

```sql
SELECT a.application_number, a.status, a.payment_completion_date,
       a.invoice_id, a.type, a.registration_type
FROM application a
WHERE a.status = 'PAID'
  AND a.payment_completion_date < NOW() - INTERVAL '30 minutes'
ORDER BY a.payment_completion_date;
```

**Recent auto-approval records:**

```sql
SELECT a.application_number, a.status, aar.record->>'suggestedAction' AS suggested_action,
       aar.creation_date AS approval_check_date, a.decision_date
FROM auto_approval_records aar
JOIN application a ON aar.application_id = a.id
WHERE aar.creation_date >= NOW() - INTERVAL '24 hours'
ORDER BY aar.creation_date DESC;
```

**Registrations expiring soon (for expiry job validation):**

```sql
SELECT r.registration_number, r.registration_type, r.status,
       r.expiry_date, r.start_date, u.username AS owner
FROM registrations r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'ACTIVE'
  AND r.expiry_date <= NOW() + INTERVAL '30 days'
ORDER BY r.expiry_date;
```

**NOC on registration (registration NOC):**

```sql
SELECT r.registration_number, r.noc_status, noc.start_date, noc.end_date,
       a.application_number, a.status AS app_status
FROM registrations r
JOIN registration_notice_of_consideration noc ON noc.registration_id = r.id
LEFT JOIN application a ON a.registration_id = r.id
WHERE r.noc_status = 'NOC_PENDING'
ORDER BY noc.end_date;
```

**Application-level NOC:**

```sql
SELECT a.application_number, a.status, noc.start_date, noc.end_date, noc.content
FROM application a
JOIN notice_of_consideration noc ON noc.application_id = a.id
WHERE a.status IN ('NOC_PENDING', 'PROVISIONAL_REVIEW_NOC_PENDING')
ORDER BY noc.end_date;
```

**Interactions (notify/email), last 24h:**

```sql
SELECT i.interaction_uuid, i.channel, i.status, i.created_at,
       i.notify_reference, i.provider_reference,
       a.application_number, r.registration_number
FROM interactions i
LEFT JOIN application a ON i.application_id = a.id
LEFT JOIN registrations r ON i.registration_id = r.id
WHERE i.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY i.created_at DESC;
```

**Failed / non-SENT interactions (7 days):**

```sql
SELECT i.interaction_uuid, i.channel, i.status, i.created_at,
       i.meta_data, i.body_content,
       a.application_number, r.registration_number
FROM interactions i
LEFT JOIN application a ON i.application_id = a.id
LEFT JOIN registrations r ON i.registration_id = r.id
WHERE i.status != 'SENT'
  AND i.created_at >= NOW() - INTERVAL '7 days'
ORDER BY i.created_at DESC;
```

