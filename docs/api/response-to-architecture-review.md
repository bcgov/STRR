# Response to Architecture & Authentication Review: STR Registry Export API

**Date:** 2026-10-26  
**In Response To:** Solution Architecture and Authentication Review (Christian, 2026-10-23)  
**Authors:** STRR API Engineering Team  
**Relevant Artifacts:**
- OpenAPI 3.0 Contract: [`docs/oas/registration-export.yaml`](../oas/registration-export.yaml)
- Export API Guide: [`docs/api/registration-export.md`](./registration-export.md)
- CDC Change Tracking RFC: [`rfcs/rfc-registration-export-cdc.md`](../../rfcs/rfc-registration-export-cdc.md)

---

## Executive Summary

We appreciate the thorough and structured review provided by Architecture. The review highlights essential boundaries around consumer privilege separation, gateway vs. origin enforcement, payload logging, and data minimization.

This document formally captures our response, details where the design has been updated to address findings, and outlines the operational decisions to finalize with the BC Registries API Gateway team.

---

## Detailed Responses to Key Review Findings

### 1. Authentication & Gateway Integration (Resolving the Discrepancy)

> **Review Finding:** The draft specification declared an HTTP Bearer JWT scheme, whereas public BC Registries documentation describes an account-linked gateway API key (`x-apikey` + `Account-Id`).

**Response & Resolution:**
- **Clarification:** STRR is hosted in GCP (Cloud Run); therefore, access to the new registration data APIs is exposed through the **BC Registries Apigee API Gateway** (`api.connect.gov.bc.ca`) rather than directly exposing the STRR Cloud Run service to consuming applications.
- **Backend Machine-to-Machine API Key Model:** Both clients—the **Ministry of Finance** and the **STR Data Portal**—interact with the API exclusively via backend services using their provisioned B2B API key (`x-apikey`).
  1. **Direct API Key Authentication:** Consumers pass `x-apikey: <api-key>`. No client-side Bearer JWT or user token is required by the clients.
  2. **Gateway Responsibility:** Apigee validates the API key, enforces rate limiting and quotas, and forwards the authenticated account identity to STRR.
  3. **Gateway Controls:** Apigee provides gateway-level access control, IP filtering, and quota tracking across all environments.

```bash
curl --location 'https://sandbox.api.connect.gov.bc.ca/strr/v1/registrations/query' \
--header 'x-apikey: <api-key>' \
--header 'Content-Type: application/json' \
--data '{
    "updatedSince": "2026-09-01T00:00:00Z",
    "limit": 100
}'
```

---

### 2. Separation of Consumer Privileges & Response Fields (Data Minimization)

> **Review Finding:** A single snapshot schema sharing host `socialInsuranceNumber` and `dateOfBirth` across both the Ministry of Finance and the STR Data Portal violates data minimization.

**Response & Resolution:**
- **Agreed on Data Minimization:** While the Ministry of Finance has explicit legislative and ISA authority (under STRAA and ISA Appendix D) to collect SIN and Date of Birth for tax compliance and enforcement, STR Data Portal staff (`ceu_staff`/`ceu_admin`) do not require SIN or Date of Birth for operational short-term rental compliance lookups.
- **Unified Query Endpoint with Role-Based Field Masking:** Rather than splitting into artificial RPC sub-paths, we standardize on the RESTful collection query endpoint: `POST /v1/registrations/query`.
  - **Single REST Endpoint:** `POST /v1/registrations/query` handles both CDC synchronization (via `updatedSince`/`cursor`) and targeted batch lookups (via `registrationNumbers`).
  - **Dynamic Field Projection:** The backend serializer inspects the caller's verified JWT token. For Ministry of Finance B2B M2M callers, full ISA snapshots are returned. For Data Portal and non-Finance callers, `socialInsuranceNumber` and `dateOfBirth` are automatically masked (`null`).
  - **Mutual Exclusivity & Broad Sync Guard:** The endpoint enforces that non-Finance callers cannot omit `registrationNumbers` to trigger a full registry dump, returning `403 Forbidden` if an unauthorized consumer attempts a global sync.
     - Authorized for Data Portal workloads / IDIR staff.
     - Requires an explicit array of `registrationNumbers` (max 500).
     - **Projects a privacy-minimized schema that completely excludes `socialInsuranceNumber` and `dateOfBirth`.**

---

### 3. Data Portal Identity Model & Audit Attribution

> **Review Finding:** A backend credential authenticates the Portal workload, not the staff member requesting a lookup. Human authorization and audit attribution must be explicitly defined.

**Response & Resolution:**
- We confirm the **preferred integration path**:
  - The user's browser interacts exclusively with the on-prem OpenShift Data Portal backend.
  - The Data Portal backend authenticates the user via IDIR and verifies role membership (`ceu_staff` or `ceu_admin`).
  - The Portal backend then queries the GCP-hosted Registry API using its approved workload credential.
- **Audit Attribution:** The Data Portal forwards standard audit headers:
  - `X-Correlation-ID`: End-to-end request tracing identifier.
  - `X-Actor-IDIR`: IDIR username of the staff member initiating the lookup.
- The STRR origin records the caller identity, actor reference, timestamp, correlation ID, and requested registration identifiers in centralized audit logs (without logging response PII).

---

### 4. Preventing Sensitive Gateway Payload Logging

> **Review Finding:** BC Registries' message-logging capability can archive `requestPayload` and `responsePayload` in GCP Cloud Storage or BigQuery. Sensitive data (SIN, DOB, full snapshots) must not be logged.

**Response & Resolution:**
- **Query Body over URL:** All query parameters and registration lists are transmitted in the JSON body, preventing registration numbers from leaking into web server or reverse proxy URL access logs.
- **Origin Log Sanitization:** `strr-api` enforces strict application-level log sanitization (`log_sanitization.py`). Export request/response payloads containing PII are excluded from Cloud Logging.
- **Gateway Archiving Gate:** As part of deployment verification, the engineering team will verify with the BC Registries platform team that gateway-level request/response payload capture (BigQuery/GCS message logging) is **explicitly disabled** for the `/registrations/export` and `/registrations/lookup` routes.

---

### 5. Lossless Incremental Synchronization & Keyset Cursors

> **Review Finding:** Incremental synchronization must define a stable high-water mark, tie-break ordering, and handling for nested entity updates without missing concurrent changes.

**Response & Resolution:**
Our design specification and RFC ([`rfcs/rfc-registration-export-cdc.md`](../../rfcs/rfc-registration-export-cdc.md)) already specify this lossless architecture:
- **Change Data Capture across Child Tables:** The query unions `MAX(changed)` across `registrations_history` and all child history tables (`addresses_history`, `contacts_history`, `rental_properties_history`, `property_manager_history`, `platforms_history`, `strata_hotels_history`). Updates to nested entities trigger inclusion in the CDC stream.
- **Deterministic Keyset Ordering:** Records are sorted strictly by `(changed ASC, registration_id ASC)`. This guarantees that concurrent database writes never cause rows to shift or be silently skipped across pagination boundaries.
- **Tamper-Proof, Scoped Cursors:** Cursors are opaque, HMAC-signed, Base64URL tokens containing `(changed, registrationId)`, an expiration timestamp (`expiresAt`), and a `scopeHash` binding the cursor to the normalized request parameters. Cursors cannot be reused across different filter scopes or consumer privileges.
- **Soft-Deletion Representation:** Deleted or cancelled registrations emit a complete snapshot with `status: CANCELLED` and `cancelledDate`, enabling downstream consumers to execute idempotent upserts.

---

### 6. OpenAPI Conformance & Schema Refinements

> **Review Finding:** OpenAPI 3.0.3 `nullable` rules on `$ref` / `allOf` must be respected, and registration number examples/prefixes aligned.

**Response & Resolution:**
- **Resolved:** We updated [`docs/oas/registration-export.yaml`](../oas/registration-export.yaml) to eliminate all `$ref` sibling warnings, wrapping references in `allOf` where overrides exist to maintain strict Swagger/OpenAPI 3.0.3 validator compliance.
- **Prefix Alignment:** Reconciled registration prefixes against production data: `H` for Host registrations (`H123456789`), `PL` for Platform registrations (`PL100000001`), and `ST` for Strata Hotel registrations (`ST200000001`).
- **Normalized Unit Listings:** Strata hotel unit numbers are normalized by splitting on `[\r\n,]+`, trimming whitespace, and returning clean arrays (`primary: string[]`, `additional: string[][]`), freeing downstream clients from multi-line textarea parsing.
- **HTTP Method:** Standard `POST` is specified for immediate production compatibility, avoiding gateway/WAF compatibility hurdles with `QUERY`.

---

## Action Plan & Verification Gates

| # | Action Item | Owner | Target Completion |
|---|-------------|-------|-------------------|
| 1 | Meet with BC Registries API Gateway team to finalize Kong API Account vs. Keycloak M2M configuration | STRR Team / Gateway Team | Prior to integration testing |
| 2 | Split OpenAPI contract into `POST /registrations/export` (Finance) and `POST /registrations/lookup` (Portal) | STRR Team | Next sprint |
| 3 | Verify gateway message logging / payload capture is disabled for export routes | Platform DevOps / STRR Team | Sandbox deployment gate |
| 4 | Finalize Privacy Impact Assessment (PIA) reflecting separated schemas and audit attribution | Privacy Officer / STRR Team | Prior to prod release |
