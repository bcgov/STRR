# Summary

Add a system-to-system registration export query that incrementally returns current `HOST`, `PLATFORM`, and `STRATA_HOTEL` snapshots using cursor-based pagination. The final HTTP method is an implementation and compatibility decision: `QUERY` is under consideration for the body-based safe query, but consumers must not assume that `QUERY` will be the primary production method or that both methods will be delivered in the first release. If client or gateway infrastructure does not support `QUERY`, an equivalent `POST` endpoint will be provided as needed.

# Basic example

```http
QUERY /registrations/export HTTP/1.1
Content-Type: application/json
Authorization: Bearer <system-role JWT>
```

```json
{
  "updatedSince": "2026-09-01T00:00:00Z",
  "limit": 100
}
```

```json
{
  "items": [
    {
      "registrationId": 4821,
      "registrationNumber": "H123456789",
      "registrationType": "HOST",
      "status": "ACTIVE",
      "startDate": "2026-01-15T00:00:00Z",
      "expiryDate": "2027-01-15T00:00:00Z",
      "updatedDate": "2026-09-07T18:42:11.203000Z",
      "primaryContact": {
        "contactType": "INDIVIDUAL",
        "firstName": "Jane",
        "middleName": "Marie",
        "lastName": "Doe",
        "preferredName": "Janey",
        "dateOfBirth": "1980-05-15",
        "socialInsuranceNumber": "123 456 789",
        "businessNumber": null,
        "businessLegalName": null,
        "emailAddress": "jane.doe@example.com",
        "phoneNumber": "250-555-0100",
        "phoneCountryCode": "001",
        "extension": null,
        "faxNumber": null,
        "mailingAddress": {
          "address": "100 Government St",
          "addressLineTwo": "Unit 402",
          "city": "Victoria",
          "province": "BC",
          "postalCode": "V8W 1W2",
          "country": "CA"
        }
      },
      "secondaryContact": null,
      "unitAddress": {
        "unitNumber": "402",
        "streetNumber": "100",
        "streetName": "Government St",
        "addressLineTwo": null,
        "city": "Victoria",
        "province": "BC",
        "postalCode": "V8W 1W2",
        "country": "CA",
        "nickname": "Downtown Condo",
        "locationDescription": null
      },
      "unitDetails": {
        "parcelIdentifier": "001-234-567",
        "businessLicense": "BL-2026-001",
        "businessLicenseExpiryDate": "2026-12-31",
        "blExemptReason": null,
        "propertyType": "CONDO_OR_APT",
        "ownershipType": "OWN",
        "rentalUnitSpaceType": "ENTIRE_HOME",
        "hostResidence": "SAME_UNIT",
        "isUnitOnPrincipalResidenceProperty": true,
        "numberOfRoomsForRent": 2,
        "strataHotelRegistrationNumber": null,
        "prExemptReason": null,
        "strataHotelCategory": null,
        "jurisdiction": "City of Victoria",
        "prRequired": true,
        "blRequired": true,
        "rentalUnitSetupOption": "PRIMARY_RESIDENCE_OR_SHARED_SPACE",
        "hostType": "OWNER"
      },
      "strRequirements": {
        "organizationNm": "City of Victoria",
        "isPrincipalResidenceRequired": true,
        "isBusinessLicenceRequired": true,
        "isStrProhibited": false,
        "isStraaExempt": null
      },
      "listingDetails": [
        {
          "url": "https://www.airbnb.ca/rooms/12345678"
        }
      ],
      "propertyManager": {
        "propertyManagerType": "BUSINESS",
        "initiatedByPropertyManager": false,
        "business": {
          "legalName": "Island Property Management Ltd.",
          "businessNumber": "987654321BC0001",
          "mailingAddress": {
            "address": "500 Douglas St",
            "city": "Victoria",
            "province": "BC",
            "postalCode": "V8V 2P8",
            "country": "CA"
          },
          "primaryContact": {
            "firstName": "Robert",
            "lastName": "Smith",
            "emailAddress": "robert@islandpm.example.com",
            "phoneNumber": "250-555-0199"
          }
        }
      }
    }
  ],
  "nextCursor": "<opaque cursor>"
}
```

# Motivation

The client team needs a low-latency feed without re-pulling every registration on each synchronization. The endpoint provides one consistent polling contract for all three registration types, supports resumable pagination, and includes SIN (`socialInsuranceNumber`), date of birth (`dateOfBirth`), and business number (`businessNumber`) fields where applicable.

# Product requirements and consumers

The API serves two distinct consumers with different retrieval patterns. The shared data contract should support both without creating separate registration export implementations. The Data Portal team may access the API either with a machine-to-machine credential or on behalf of an IDIR user assigned one of the known roles: `ceu_staff` or `ceu_admin`.

## Ministry of Finance

The Ministry of Finance requires registration data across all supported registration types: `HOST`, `PLATFORM`, and `STRATA_HOTEL`. Its primary requirement is an incremental feed so that changes can be transferred without repeatedly exporting the complete registration population.

The expected integration pattern is:

- The Ministry or its integration service maintains a downstream data layer.
- It performs an initial full synchronization.
- It stores a checkpoint cursor after successfully processing each page.
- It polls for later changes using `updatedSince` and/or the opaque cursor.
- It upserts complete current registration snapshots into its data layer.

The downstream data-layer ownership, retention, reconciliation process, and required polling freshness should be confirmed with the Ministry team. They are consumer responsibilities, but they affect API limits, rate limits, retention, and operational support requirements.

## Data Portal

The Data Portal, managed by the Short-Term Rental branch, has a different requirement: it needs to retrieve registration data for a known list of registration numbers. It does not necessarily need to scan the entire registration population or maintain a global CDC checkpoint for every request.

The expected integration pattern is:

- The Data Portal sends a bounded `registrationNumbers` array in the JSON query body.
- The API returns the current snapshot for the requested registration numbers, subject to authorization and optional type filters.
- The Data Portal may use this for on-demand lookup, refresh, or page composition.
- Any cursor used for a large targeted request is scoped to that request and must not be reused as the Ministry of Finance global-feed cursor.
- The Data Portal may call through its backend with a machine-to-machine credential, or through its UI on behalf of an IDIR user with the `ceu_staff` or `ceu_admin` role.

The targeted query should define behavior for unknown, unauthorized, or deleted registration numbers. Duplicate registration numbers must be automatically deduplicated before querying, and a registration should appear at most once in the response. The response should return matching items plus a structured `errors` array for per-item failures. Initial failure codes should include `INVALID_REGISTRATION_NUMBER`, `NOT_FOUND`, and `NOT_AVAILABLE`; `NOT_AVAILABLE` should be used where reporting authorization failure could disclose whether a registration exists.

## Shared requirements

Both consumers require:

- All three registration types where authorized.
- A stable, documented payload with explicit `registrationType`.
- Inclusion of SIN (`socialInsuranceNumber`), date of birth (`dateOfBirth`), and business number (`businessNumber`) fields in contact/business payloads where applicable.
- System-to-system authentication, authorization, and access auditing.
- Where applicable, IDIR role-based access for approved portal users, with user identity and role recorded in audit events.
- Deterministic pagination and bounded response sizes.
- Clear freshness, availability, rate-limit, and error-handling expectations.

# Detailed design

## Change tracking

The relevant models use `sql_versioning.Versioned`. The globally registered `versioned_session(db.session)` listener writes a `<table>_history` row with a `changed` timestamp whenever an ORM-tracked versioned row is updated or deleted. The service-layer CDC query unions these history sources and groups them by `registration_id`, using `MAX(changed)`.

History sources include:

- Common: `registrations_history`.
- HOST: `rental_properties_history`, `property_contacts_history`, `contacts_history`, `property_manager_history`, and related address history paths.
- PLATFORM: `platform_registration_history`, `platforms_history`, `platform_representatives_history`, `platform_brands_history`, and their address/contact history paths.
- STRATA_HOTEL: `strata_hotel_registration_history`, `strata_hotels_history`, `strata_hotel_representatives_history`, `strata_hotel_buildings_history`, and their address/contact history paths.

The history query identifies changed registration IDs. The response is then built from the current live aggregate tables, so each item is a full upsert snapshot rather than a field-level diff.

## API contract

| Field              | Value                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Method / path      | To be confirmed; `QUERY /registrations/export` is under consideration, with `POST /registrations/export` provided if needed |
| Auth               | Machine-to-machine credential, or approved IDIR role for portal UI access: `ceu_staff` or `ceu_admin`                       |
| Query content      | JSON body: `updatedSince`, opaque `cursor`, optional `limit` (default 100, maximum 500), and optional `registrationNumbers` |
| Registration types | `HOST`, `PLATFORM`, `STRATA_HOTEL`                                                                                          |
| Ordering           | `changed ASC, registration_id ASC`                                                                                          |
| Response           | `{ "items": [...], "nextCursor": "..." }` (and optional `"errors": [...]` for targeted queries) |

The cursor is an opaque, versioned, URL-safe token. A recommended stateless representation is a Base64URL-encoded payload with an HMAC signature, for example:

```json
{
  "version": 1,
  "position": {
    "changed": "2026-09-07T18:42:11.203000",
    "registrationId": 4821
  },
  "scopeHash": "<hash of normalized filters>",
  "expiresAt": "2026-09-17T18:42:11Z"
}
```

The position provides stable ordering. The `scopeHash` binds the cursor to the request’s normalized filters, including `updatedSince` and any `registrationNumbers`, so a cursor from one feed cannot be reused for another. The server must verify the signature, payload version, expiry, and scope hash before using the position. Base64URL is an encoding, not encryption; use authenticated encryption instead if cursor contents must be confidential. A server-side cursor store is an alternative if revocation or confidentiality is required.

Clients must treat the cursor as opaque and resume with `nextCursor` rather than reconstructing it from timestamps. The server reads `limit + 1` records internally, returns a cursor only when another page exists, and returns `nextCursor: null` at completion. `hasMore` is intentionally omitted because it is redundant.

`limit` controls the maximum number of items returned in a page. It defaults to `100` and cannot exceed `500`. Non-positive, non-numeric, or greater-than-`500` values should receive a client error rather than being silently clamped. The server may read `limit + 1` records internally, but returns no more than `limit` items. `registrationNumbers` is an optional JSON allowlist, for example `{ "registrationNumbers": ["H123456789", "H987654321"] }`. Targeted requests must use a separate checkpoint from the client’s general all-registrations feed. If POST is selected or required for compatibility, it will use the same JSON body and response contract.

## Payloads

Every item contains `registrationId`, `registrationNumber`, `registrationType`, `status`, `startDate`, `expiryDate`, and `updatedDate`.

- `HOST`: `primaryContact`, `secondaryContact` (co-host), `propertyManager`, `unitAddress`, `unitDetails`, `strRequirements`, and `listingDetails`.
- `PLATFORM`: `businessDetails`, registered attorney/office, `platformRepresentatives`, and `platformDetails` (`brands`, `listingSize`).
- `STRATA_HOTEL`: `businessDetails`, registered attorney/office, `strataHotelRepresentatives`, and `strataHotelDetails` (`brand`, `location`, `category`, `buildings`, `unitListings`).
- Contact payloads contain name, preferred name, mailing address, phone, fax, email, date of birth (`dateOfBirth`), social insurance number (`socialInsuranceNumber`), and business number (`businessNumber`) where applicable.
- All categorical/enum values (`PropertyType`, `RegistrationStatus`, `OwnershipType`, `ListingSize`, `StrataHotelCategory`, etc.) strictly align with the STRR database enums. The complete OpenAPI specification will be published once this RFC is finalized.

## Indexes

The migration must index `changed` on all history tables used by the union and the foreign-key join columns for rental properties, property contacts, property managers, platform mappings, platform representatives, platform brands, strata mappings, strata representatives, and strata buildings. Without these indexes, the query remains functionally correct but may full-scan history and relationship tables.

## Client integration

1. Confirm the supported HTTP method with the API team before integration. Do not assume `QUERY` is the primary production method. If the consuming client or an intermediary does not support `QUERY`, use the POST endpoint when it is provided.
2. Omit `updatedSince` and `cursor` for the initial full synchronization.
3. Follow `nextCursor` until it is `null`.
4. Upsert each complete item by `registrationId`.
5. Store the last successful cursor as the next polling checkpoint.
6. Treat cancellation and expiry as status changes on the full snapshot. This API does not currently provide tombstones for deleted registrations.

# Drawbacks

- The multi-source union and current-table joins are more complex than a single timestamp filter and require load testing at production scale.
- The design assumes relationship rows are not reassigned between aggregates. Updating fields on an existing address or contact is supported; changing the FK ownership relationship requires additional historical ownership data.
- Clients must poll; the first version does not provide webhooks or Pub/Sub delivery.

# Alternatives

- **GET with URL parameters:** suitable only for small filters and optional as a diagnostic convenience; body-based QUERY/POST avoids URL-length limits and keeps large ID lists out of URLs and intermediary logs.
- **DB view:** deferred in favor of a service-layer query, which is easier to evolve and test. A materialized view would add refresh staleness.
- **Existing Events table:** not selected because it does not consistently capture every child-record mutation across all three aggregate types.
- **Pub/Sub push:** deferred to keep the first client integration as one authenticated polling endpoint.

# Adoption strategy

This is additive and does not change existing endpoints. The Ministry receives an approved machine-to-machine credential. The Data Portal team uses either its machine-to-machine credential or the `ceu_staff` or `ceu_admin` IDIR role, subject to security approval and scope testing.

# Unresolved questions

- Should access be audit-logged with caller, timestamp, record count, and type filters?
- What polling cadence and freshness SLA does the client require?
- Should a future version provide tombstones or push notifications?
- What registration types and registration number ranges may `ceu_staff` and `ceu_admin` access?
