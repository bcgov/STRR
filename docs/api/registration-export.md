# Registration Export API

## Purpose

The Registration Export API provides current registration snapshots for:

- `HOST`
- `PLATFORM`
- `STRATA_HOTEL`

It supports two client use cases:

- Incremental polling (CDC) for the Ministry of Finance.
- Targeted registration lookup for the Data Portal.

Each returned registration is a complete current snapshot, not a field-level diff.

> **NOTE**:
> This document outlines the initial request/response contracts and workflow for early developer alignment. The full OpenAPI specification will be shared once finalized.

## HTTP method

`QUERY` is under consideration for a safe, idempotent body-based request. If client libraries, gateways, WAFs, or other infrastructure do not support it, an equivalent `POST` endpoint will be provided as needed. Method availability will be confirmed before integration begins.

Potential request:

```http
QUERY /registrations/export HTTP/1.1
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

If provided, the POST compatibility endpoint will use the same path, JSON body, authentication, and response contract.

## Authentication

### Ministry of Fin. authentication

The Ministry integration uses a machine-to-machine credential for unattended incremental polling.

### Data Portal authentication

The Data Portal may access the API using either:

- A machine-to-machine credential for backend and unattended requests.
- An IDIR user token for portal UI requests when the user has `ceu_staff` or `ceu_admin`.

## Common request fields

| Field | Description |
| --- | --- |
| `updatedSince` | Optional ISO 8601 timestamp. Returns registrations changed after this value. **Must be URL encoded if using the '+' or '-' signs for offsets. |
| `cursor` | Opaque cursor returned by the previous page. Do not parse or construct it. |
| `limit` | Optional page size. Defaults to `100`; maximum allowed value is `500`. |

## Ministry of Finance request

```
{
  "updatedSince": "2026-09-01T00:00:00Z",
  "cursor": "<opaque cursor>",
  "limit": 500
}
```

For the initial full synchronization, omit `updatedSince` and `cursor`.

## Data Portal request

```
{
  "registrationNumbers": ["H123456789", "H987654321", "P000123456"],
  "limit": 100,
  "cursor": "<opaque cursor>"
}
```

`registrationNumbers` is required for a targeted Data Portal request. The API will enforce a maximum list size and automatically deduplicate repeated numbers. Each registration appears at most once in the response.

## Response

The response returns an array of current registration snapshots and an opaque cursor.

```json
{
  "items": [
    /* array of complete registration snapshots (HOST, PLATFORM, or STRATA_HOTEL) */
  ],
  "nextCursor": "eyJ2ZXJzaW9uIjoxLCJwb3NpdGlvbiI6ey..."
}
```

- A non-null `nextCursor` means another page is available.
- `nextCursor: null` means the request is complete.

If the request contains `registrationNumbers`, the response may also include a structured `errors` array for per-item failures:

```json
{
  "items": [
    /* matching snapshots */
  ],
  "errors": [
    {
      "registrationNumber": "H999999999",
      "code": "NOT_FOUND"
    }
  ],
  "nextCursor": null
}
```

The error `code` is stable:
- `INVALID_REGISTRATION_NUMBER`: Format or structure of the registration number is invalid.
- `NOT_FOUND`: Registration number does not exist.
- `NOT_AVAILABLE`: Registration cannot be returned (used where authorization failure should not reveal whether the registration exists).

---

## Registration Payloads by Type

Every item in `items` contains top-level metadata (`registrationId`, `registrationNumber`, `registrationType`, `status`, `startDate`, `expiryDate`, `updatedDate`). The detailed payload structure depends on `registrationType`.

### 1. `HOST` Registration Payload

```json
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
  "secondaryContact": {
    "contactType": "INDIVIDUAL",
    "firstName": "John",
    "middleName": null,
    "lastName": "Doe",
    "preferredName": null,
    "dateOfBirth": "1978-11-20",
    "socialInsuranceNumber": "987 654 321",
    "businessNumber": null,
    "businessLegalName": null,
    "emailAddress": "john.doe@example.com",
    "phoneNumber": "250-555-0101",
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
```

### 2. `PLATFORM` Registration Payload

```json
{
  "registrationId": 5100,
  "registrationNumber": "PL100000001",
  "registrationType": "PLATFORM",
  "status": "ACTIVE",
  "startDate": "2026-02-01T00:00:00Z",
  "expiryDate": "2027-02-01T00:00:00Z",
  "updatedDate": "2026-09-08T10:15:30.123000Z",
  "businessDetails": {
    "legalName": "Global Booking Services Inc.",
    "homeJurisdiction": "BC, Canada",
    "businessNumber": "123456789BC0001",
    "consumerProtectionBCLicenceNumber": "CPBC-99881",
    "noticeOfNonComplianceEmail": "compliance@globalbooking.example.com",
    "noticeOfNonComplianceOptionalEmail": "legal@globalbooking.example.com",
    "takeDownRequestEmail": "takedown@globalbooking.example.com",
    "takeDownRequestOptionalEmail": null,
    "mailingAddress": {
      "address": "1200 Burrard St",
      "addressLineTwo": "Suite 800",
      "city": "Vancouver",
      "province": "BC",
      "postalCode": "V6Z 2C7",
      "country": "CA",
      "locationDescription": null
    },
    "registeredOfficeOrAttorneyForServiceDetails": {
      "attorneyName": "Pacific Corporate Legal Services",
      "mailingAddress": {
        "address": "1055 W Georgia St",
        "addressLineTwo": "Suite 1500",
        "city": "Vancouver",
        "province": "BC",
        "postalCode": "V6E 4N7",
        "country": "CA",
        "locationDescription": null
      }
    }
  },
  "platformRepresentatives": [
    {
      "firstName": "Alice",
      "middleName": null,
      "lastName": "Wong",
      "jobTitle": "Director of Regulatory Compliance",
      "emailAddress": "alice.wong@globalbooking.example.com",
      "phoneNumber": "604-555-0144",
      "phoneCountryCode": "001",
      "extension": null,
      "faxNumber": null
    }
  ],
  "platformDetails": {
    "listingSize": "THOUSAND_AND_ABOVE",
    "brands": [
      {
        "name": "GlobalStay",
        "website": "https://www.globalstay.example.com"
      }
    ]
  }
}
```

### 3. `STRATA_HOTEL` Registration Payload

```json
{
  "registrationId": 6200,
  "registrationNumber": "ST200000001",
  "registrationType": "STRATA_HOTEL",
  "status": "ACTIVE",
  "startDate": "2026-03-01T00:00:00Z",
  "expiryDate": "2027-03-01T00:00:00Z",
  "updatedDate": "2026-09-09T14:22:45.542000Z",
  "businessDetails": {
    "legalName": "Whistler Peak Lodging Ltd.",
    "homeJurisdiction": "BC, Canada",
    "businessNumber": "888777666BC0001",
    "mailingAddress": {
      "address": "4000 Whistler Way",
      "addressLineTwo": null,
      "city": "Whistler",
      "province": "BC",
      "postalCode": "V8E 1J2",
      "country": "CA",
      "locationDescription": null
    },
    "registeredOfficeOrAttorneyForServiceDetails": {
      "attorneyName": "Mountain Law Group LLP",
      "mailingAddress": {
        "address": "1000 Village Gate Blvd",
        "addressLineTwo": "Suite 201",
        "city": "Whistler",
        "province": "BC",
        "postalCode": "V8E 1A1",
        "country": "CA",
        "locationDescription": null
      }
    }
  },
  "strataHotelRepresentatives": [
    {
      "firstName": "David",
      "middleName": null,
      "lastName": "Miller",
      "jobTitle": "General Manager",
      "emailAddress": "dmiller@whistlerpeak.example.com",
      "phoneNumber": "604-555-0188",
      "phoneCountryCode": "001",
      "extension": "101",
      "faxNumber": null
    }
  ],
  "strataHotelDetails": {
    "brand": {
      "name": "Whistler Peak Residences",
      "website": "https://whistlerpeak.example.com"
    },
    "location": {
      "address": "4000 Whistler Way",
      "addressLineTwo": null,
      "city": "Whistler",
      "province": "BC",
      "postalCode": "V8E 1J2",
      "country": "CA",
      "locationDescription": null
    },
    "numberOfUnits": 120,
    "category": "FULL_SERVICE",
    "buildings": [
      {
        "address": "4000 Whistler Way - North Tower",
        "addressLineTwo": null,
        "city": "Whistler",
        "province": "BC",
        "postalCode": "V8E 1J2",
        "country": "CA",
        "locationDescription": null
      }
    ],
    "unitListings": "101, 102, 103, 104, 201, 202, 203"
  }
}
```

---

## Database Enums Reference

The following table lists the valid enum values used across the payload fields:

| Field | Enum Name | Allowed Values |
| --- | --- | --- |
| `registrationType` | `RegistrationType` | `HOST`, `PLATFORM`, `STRATA_HOTEL` |
| `status` | `RegistrationStatus` | `ACTIVE`, `EXPIRED`, `SUSPENDED`, `CANCELLED` |
| `primaryContact.contactType`, `secondaryContact.contactType` | `ContactType` | `INDIVIDUAL`, `BUSINESS` |
| `unitDetails.propertyType` | `PropertyType` | `SINGLE_FAMILY_HOME`, `SECONDARY_SUITE`, `ACCESSORY_DWELLING`, `MULTI_UNIT_HOUSING`, `TOWN_HOME`, `CONDO_OR_APT`, `RECREATIONAL`, `BED_AND_BREAKFAST`, `STRATA_HOTEL`, `FLOAT_HOME` |
| `unitDetails.ownershipType` | `OwnershipType` | `OWN`, `RENT`, `CO_OWN`, `OTHER` |
| `unitDetails.rentalUnitSpaceType` | `RentalUnitSpaceType` | `ENTIRE_HOME`, `SHARED_ACCOMMODATION` |
| `unitDetails.hostResidence` | `HostResidence` | `SAME_UNIT`, `ANOTHER_UNIT` |
| `unitDetails.hostType` | `HostType` | `OWNER`, `FRIEND_RELATIVE`, `LONG_TERM_TENANT` |
| `unitDetails.rentalUnitSetupOption` | `RentalSpaceOption` | `PRIMARY_RESIDENCE_OR_SHARED_SPACE`, `SEPARATE_UNIT_SAME_PROPERTY`, `DIFFERENT_PROPERTY` |
| `propertyManager.propertyManagerType` | `PropertyManagerType` | `INDIVIDUAL`, `BUSINESS` |
| `platformDetails.listingSize` | `ListingSize` | `LESS_THAN_250`, `BETWEEN_250_AND_999`, `THOUSAND_AND_ABOVE` |
| `strataHotelDetails.category`, `unitDetails.strataHotelCategory` | `StrataHotelCategory` | `FULL_SERVICE`, `MULTI_UNIT_NON_PR`, `POST_DECEMBER_2023` |

---

> [!NOTE]
> The full OpenAPI specification containing complete schema definitions, type constraints, and endpoint parameters will be shared once finalized.
