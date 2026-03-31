# Runbook: strr-api

Flask backend for STRR. Source: `strr-api/`.

## Health checks

| Endpoint | Behavior |
|----------|----------|
| `GET /ops/healthz` | Runs `SELECT 1` against the database. Returns **500** if DB is unavailable. |
| `GET /ops/readyz` | Always **200**; it does **not** verify the database or downstream dependencies. |

**Operational note:** If Kubernetes/Cloud Run readiness uses only `readyz`, pods may be marked ready while the DB is down. Prefer `healthz` for meaningful liveness when troubleshooting.

**Code reference:** `strr-api/src/strr_api/resources/ops.py`

## Configuration

- Primary config: `strr-api/src/strr_api/config.py`
- **URL pair pattern:** Many services are built from `*_URL` + `*_VERSION` (e.g. `AUTH_SVC_URL`, `PAYMENT_SVC_URL`, `LEGAL_SVC_URL`). Omitting either yields wrong or empty endpoints.
- Vault mapping (GCP): `strr-api/devops/vaults.gcp.env`
- Local sample: `strr-api/.env.sample`

### External service timeouts (typical)

| Setting | Notes |
|---------|--------|
| `PAY_API_TIMEOUT` | Default 20s |
| `AUTH_SVC_TIMEOUT` | Default 20s |
| `LTSA_API_TIMEOUT` | Per config |
| `GEOCODER_API_TIMEOUT` | Per config |
| `CONNECT_TIMEOUT` | 60s in `rest_service` |

## Error handling

- Global handlers: `strr-api/src/strr_api/common/error.py`; JSON `{"message": "..."}`.
- Custom exceptions: `strr-api/src/strr_api/exceptions/exceptions.py` (`ValidationException`, `AuthException`, `ExternalServiceException` → often **502**, etc.).
- API error text enum: `ErrorMessage` in `strr-api/src/strr_api/enums/enum.py`.

## Database migrations

- Alembic revisions: `strr-api/migrations/versions/`
- When `POD_NAMESPACE == "migration"`, the app factory registers **only** Flask-Migrate (no normal HTTP routes) (`strr-api/src/strr_api/__init__.py`).
- **Driver note:** Migrations may use `postgresql+pg8000` while runtime uses `postgresql`/psycopg2. See `config.py` and `migrations/env.py`.
- Standalone Alembic (no Flask context) uses `DATABASE_URL` with `NullPool` in `migrations/env.py`.

## Scaling (prod)

From `strr-api/devops/gcp/clouddeploy.yaml` (typical): prod may set **`max-scale: "10"`** and **`container-concurrency: "20"`**. Confirm in the current file for your environment.

## Logging

- **Format:** Plain text (`%(asctime)s - %(name)s - %(levelname)s in %(module)s:%(filename)s:%(lineno)d - %(funcName)s: %(message)s`)
- **Logger names:** `api`, `strr_api` (Flask app logger)
- **No application correlation/request IDs** in code. Use Cloud Run request logs and timestamps for correlation.

### GCP Cloud Logging: strr-api

**All API errors:**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-api"
textPayload=~" - ERROR in "
```

**500 / uncaught exceptions:**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-api"
textPayload=~"Uncaught exception"
```

**DB connection failures during health check (/ops/healthz):**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-api"
textPayload=~"(DB connection failed|DB connection pool unhealthy)"
severity="ERROR"
```

**External service timeouts (Pay API, Auth, LTSA, Geocoder):**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-api"
textPayload=~"(ConnectionError|ConnectTimeout|ReadTimeout|ExternalServiceException)"
```

**Migration pod logs:**

```text
resource.type="cloud_run_revision"
resource.labels.service_name="strr-api"
textPayload=~"(alembic|migration|upgrade)"
```

Adjust `resource.labels.service_name` if your Cloud Run service name differs.

## SQL: general investigation (strr-db)

**Application by application number:**

```sql
SELECT id, application_number, type, registration_type, status,
       invoice_id, payment_status_code, payment_completion_date, payment_account,
       registration_id, application_date, decision_date, is_set_aside,
       submitter_id, reviewer_id, created, modified
FROM application
WHERE application_number = '<APP_NUMBER>';
```

**Recent events for an application:**

```sql
SELECT e.id, e.event_type, e.event_name, e.details,
       e.created_date, e.visible_to_applicant,
       u.username AS event_user
FROM events e
LEFT JOIN users u ON e.user_id = u.id
WHERE e.application_id = (SELECT id FROM application WHERE application_number = '<APP_NUMBER>')
ORDER BY e.created_date DESC;
```

**Registration by registration number:**

```sql
SELECT r.id, r.registration_number, r.registration_type, r.status,
       r.start_date, r.expiry_date, r.noc_status, r.sbc_account_id,
       r.cancelled_date, r.provisional_extension_applied,
       u.username AS owner, rv.username AS reviewer
FROM registrations r
LEFT JOIN users u ON r.user_id = u.id
LEFT JOIN users rv ON r.reviewer_id = rv.id
WHERE r.registration_number = '<REG_NUMBER>';
```

**Stuck in PAYMENT_DUE > 24h:**

```sql
SELECT application_number, invoice_id, payment_status_code,
       application_date, created, modified
FROM application
WHERE status = 'PAYMENT_DUE'
  AND application_date < NOW() - INTERVAL '24 hours'
ORDER BY application_date;
```

**Auto-approval records:**

```sql
SELECT aar.id, aar.record, aar.creation_date
FROM auto_approval_records aar
JOIN application a ON aar.application_id = a.id
WHERE a.application_number = '<APP_NUMBER>';
```

**LTSA records:**

```sql
SELECT l.id, l.record, l.creation_date
FROM ltsa l
JOIN application a ON l.application_id = a.id
WHERE a.application_number = '<APP_NUMBER>';
```
