export const mockDocuments: ApiDocument[] = [
  {
    documentType: DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE,
    fileKey: 'abc12345-6789-0abc-def1-234567890abc',
    fileName: 'business-license.pdf',
    fileType: 'application/pdf'
  },
  {
    documentType: DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE,
    fileKey: 'abc12345-6789-0abc-def1-345245das',
    fileName: 'property-assessment.pdf',
    fileType: 'application/pdf'
  }
]

export const mockDocumentsNOC: ApiDocument[] = [
  {
    documentType: DocumentUploadType.BCSC,
    fileKey: 'e6543ead-286e-4cc1-r4563-3ccae1e49b9f',
    fileName: 'Supporting_Document_1.pdf',
    fileType: 'application/pdf',
    uploadDate: '2025-03-09',
    uploadStep: DocumentUploadStep.NOC
  },
  {
    documentType: DocumentUploadType.BC_DRIVERS_LICENSE,
    fileKey: 'a1f22e9d-9fa4-4605-87d2-33ee7c05f51a',
    fileName: 'Supporting_Document_2.pdf',
    fileType: 'application/pdf',
    uploadDate: '2025-03-09',
    uploadStep: DocumentUploadStep.NOC
  },
  {
    documentType: DocumentUploadType.COMBINED_BCSC_LICENSE,
    fileKey: '34637354-f9ab-425e-8da4-32c33d46fcaa',
    fileName: 'Supporting_Document_3.pdf',
    fileType: 'application/pdf',
    uploadDate: '2025-03-09',
    uploadStep: DocumentUploadStep.NOC
  }
]

const MOCK_DATES = {
  APPLICATION_DATE: new Date('2025-01-01T10:30:00.000000+00:00'),
  STRATA_APPLICATION_DATE: new Date('2025-01-14T19:58:57.549356+00:00'),
  START_DATE: new Date('2025-01-01T10:30:00.000000+00:00'),
  EXPIRY_DATE: new Date('2026-01-01T10:30:00.000000+00:00')
}

const MOCK_MAILING_ADDRESS: ApiAddress = {
  address: '456 Elm St',
  addressLineTwo: '',
  city: 'Victoria',
  country: 'CA',
  locationDescription: 'Near the park',
  postalCode: 'V8W 1A1',
  province: 'BC'
}

export const MOCK_UNIT_ADDRESS: ApiUnitAddress = {
  addressLineTwo: '',
  city: 'Vancouver',
  country: 'CA',
  locationDescription: '',
  nickname: 'Downtown Unit',
  postalCode: 'V6B 1A1',
  province: 'BC',
  streetName: 'Robson St',
  streetNumber: '456',
  unitNumber: '101'
}

const MOCK_HOTEL_ADDRESS: ApiAddress = {
  address: '789 Pine St',
  addressLineTwo: '',
  city: 'Kelowna',
  country: 'CA',
  locationDescription: 'Near the lake',
  postalCode: 'V1Y 1A1',
  province: 'BC'
}

const MOCK_EXAMINER_USER = {
  username: 'examiner1',
  displayName: 'Examiner One'
}

const MOCK_COMPLETING_PARTY = {
  emailAddress: 'alice@example.com',
  extension: '789',
  firstName: 'Alice',
  lastName: 'Johnson',
  phoneCountryCode: '+61',
  phoneNumber: '412345678'
}

const mockPrimaryContactPerson: ApiHostContactPerson = {
  contactType: OwnerType.INDIVIDUAL,
  dateOfBirth: '1985-05-15',
  emailAddress: 'alice.smith@example.com',
  extension: '',
  firstName: 'Alice',
  lastName: 'Smith',
  mailingAddress: MOCK_MAILING_ADDRESS,
  phoneCountryCode: '1',
  phoneNumber: '6041234567',
  socialInsuranceNumber: '123 456 789'
}

const mockPrimaryContactBusiness: ApiHostContactBusiness = {
  ...mockPrimaryContactPerson,
  contactType: OwnerType.BUSINESS,
  businessLegalName: 'ABC Rentals',
  businessNumber: '123123123'
}

export const mockHostApplication: HostApplicationResp = {
  header: {
    applicationDateTime: MOCK_DATES.APPLICATION_DATE,
    applicationNumber: '12345678901234',
    decisionDate: undefined,
    examinerActions: ['APPROVE'],
    examinerStatus: 'Full Examination',
    existingHostRegistrations: 0,
    hostActions: [],
    hostStatus: 'Pending Approval',
    isCertificateIssued: false,
    name: 'registration',
    paymentAccount: '9876',
    paymentMethod: ConnectPaymentMethod.PAD,
    paymentStatus: 'COMPLETED',
    paymentToken: 12345,
    status: ApplicationStatus.FULL_REVIEW
  },
  registration: {
    documents: mockDocuments,
    listingDetails: [],
    primaryContact: mockPrimaryContactPerson,
    registrationType: ApplicationType.HOST,
    strRequirements: {
      isBusinessLicenceRequired: true,
      isPrincipalResidenceRequired: true,
      isStrProhibited: false,
      isStraaExempt: false,
      organizationNm: 'City of Vancouver'
    },
    unitAddress: MOCK_UNIT_ADDRESS,
    unitDetails: {
      hostResidence: ResidenceType.SAME_UNIT,
      isUnitOnPrincipalResidenceProperty: true,
      numberOfRoomsForRent: 2,
      ownershipType: OwnershipType.OWN,
      parcelIdentifier: '123-456-789',
      propertyType: PropertyType.CONDO_OR_APT,
      rentalUnitSpaceType: RentalUnitType.ENTIRE_HOME,
      businessLicense: '123123123'
    }
  }
}

export const mockWithPrExemptAndStrataHotel = {
  ...mockHostApplication,
  registration: {
    ...mockHostApplication.registration,
    unitDetails: {
      ...mockHostApplication.registration.unitDetails,
      prExemptReason: PrExemptionReason.STRATA_HOTEL,
      strataHotelCategory: StrataHotelCategory.FULL_SERVICE
    }
  }
}

export const mockWithBlExempt = {
  ...mockHostApplication,
  registration: {
    ...mockHostApplication.registration,
    unitDetails: {
      ...mockHostApplication.registration.unitDetails,
      blExemptReason: 'OVER 30 DAYS'
    }
  }
}

// Host application with flags for Examiner:
export const mockHostApplicationWithFlags: HostApplicationResp = {
  ...mockHostApplication,
  header: {
    ...mockHostApplication.header,
    existingHostRegistrations: 10 // flag
  },
  registration: {
    ...mockHostApplication.registration,
    primaryContact: mockPrimaryContactBusiness, // flag
    strRequirements: {
      isBusinessLicenceRequired: true, // flag
      isPrincipalResidenceRequired: true,
      isStrProhibited: true, // flag
      isStraaExempt: false,
      organizationNm: 'City of Vancouver'
    },
    unitAddress: {
      ...MOCK_UNIT_ADDRESS,
      unitNumber: '' // flag
    } as ApiUnitAddress
  }
}

export const mockHostApplicationNOCExpired: HostApplicationResp = {
  ...mockHostApplication,
  header: {
    ...mockHostApplication.header,
    status: ApplicationStatus.NOC_EXPIRED
  },
  registration: {
    ...mockHostApplication.registration,
    documents: [
      ...mockDocuments,
      ...mockDocumentsNOC
    ]
  }
}

const MOCK_DOE_ENTERPRISES_BUSINESS: ApiBusinessDetails = {
  businessNumber: '987654321',
  homeJurisdiction: 'BC',
  legalName: 'Doe Enterprises',
  mailingAddress: MOCK_MAILING_ADDRESS,
  registeredOfficeOrAttorneyForServiceDetails: {
    attorneyName: 'Jane Smith',
    mailingAddress: MOCK_MAILING_ADDRESS
  }
}

const MOCK_STRATA_HOTEL_BRAND = {
  name: 'Luxury Stays',
  website: 'https://luxurystays.com'
}

const MOCK_STRATA_REP = {
  lastName: 'Smith',
  emailAddress: 'jane.smith@example.com',
  firstName: 'Jane',
  middleName: 'B',
  preferredName: '',
  faxNumber: '987-654-3210'
}

export const mockStrataApplication: StrataApplicationResp =
{
  header: {
    applicationDateTime: MOCK_DATES.STRATA_APPLICATION_DATE,
    applicationNumber: '12345678901234',
    decisionDate: undefined,
    examinerActions: [],
    examinerStatus: 'Draft',
    existingHostRegistrations: 0,
    hostActions: [],
    hostStatus: 'Draft',
    isCertificateIssued: false,
    name: 'strataApplication',
    paymentAccount: '1234',
    paymentStatus: 'COMPLETED',
    paymentToken: 12345,
    status: ApplicationStatus.FULL_REVIEW,
    paymentMethod: ConnectPaymentMethod.DIRECT_PAY
  },
  registration: {
    businessDetails: MOCK_DOE_ENTERPRISES_BUSINESS,
    completingParty: MOCK_COMPLETING_PARTY,
    documents: mockDocuments,
    registrationType: ApplicationType.STRATA_HOTEL,
    strataHotelDetails: {
      brand: MOCK_STRATA_HOTEL_BRAND,
      buildings: [],
      location: MOCK_HOTEL_ADDRESS,
      numberOfUnits: 10,
      category: StrataHotelCategory.FULL_SERVICE,
      documents: []
    },
    strataHotelRepresentatives: [MOCK_STRATA_REP] as ApiRep[]
  }
}

export const mockHostApplicationWithReviewer: HostApplicationResp = {
  ...mockHostApplication,
  header: {
    ...mockHostApplication.header,
    reviewer: MOCK_EXAMINER_USER
  }
}

export const mockHostApplicationWithoutReviewer: HostApplicationResp = {
  ...mockHostApplication,
  header: {
    ...mockHostApplication.header,
    reviewer: {
      username: '',
      displayName: ''
    }
  }
}

export const mockApplications: ApiApplicationBaseResp [] = [
  mockHostApplication,
  mockStrataApplication,
  mockHostApplicationWithReviewer,
  mockHostApplicationWithoutReviewer
]

const createRegistrationHeader = (
  applicationDateTime: Date,
  examinerStatus: string,
  hostStatus: string,
  examinerActions: string[]
) => {
  const header: any = {
    applicationDateTime,
    applicationNumber: '12345678901234',
    examinerActions,
    examinerStatus,
    hostActions: [],
    hostStatus,
    reviewer: MOCK_EXAMINER_USER
  }
  return header
}

export const mockHostRegistration: HostRegistrationResp = {
  header: createRegistrationHeader(
    MOCK_DATES.APPLICATION_DATE,
    'Registered',
    'Registered',
    ['CANCEL', 'SUSPEND']
  ),
  id: 12345,
  registrationType: ApplicationType.HOST,
  status: RegistrationStatus.ACTIVE,
  startDate: MOCK_DATES.START_DATE,
  expiryDate: MOCK_DATES.EXPIRY_DATE,
  registrationNumber: 'REG12345678',
  primaryContact: mockPrimaryContactPerson,
  unitAddress: MOCK_UNIT_ADDRESS,
  unitDetails: {
    hostResidence: ResidenceType.SAME_UNIT,
    isUnitOnPrincipalResidenceProperty: true,
    numberOfRoomsForRent: 2,
    ownershipType: OwnershipType.OWN,
    parcelIdentifier: '123-456-789',
    propertyType: PropertyType.CONDO_OR_APT,
    rentalUnitSpaceType: RentalUnitType.ENTIRE_HOME,
    businessLicense: '123123123'
  },
  strRequirements: {
    isBusinessLicenceRequired: true,
    isPrincipalResidenceRequired: true,
    isStrProhibited: false,
    isStraaExempt: false,
    organizationNm: 'City of Vancouver'
  },
  documents: mockDocuments,
  listingDetails: [],
  sbc_account_id: 12345,
  updatedDate: MOCK_DATES.APPLICATION_DATE,
  user_id: 123
}

export const mockPlatformRegistration: PlatformRegistrationResp = {
  header: createRegistrationHeader(
    MOCK_DATES.APPLICATION_DATE,
    'Registered',
    'Registered',
    ['CANCEL', 'SUSPEND']
  ),
  id: 12346,
  registrationType: ApplicationType.PLATFORM,
  status: RegistrationStatus.ACTIVE,
  startDate: MOCK_DATES.START_DATE,
  expiryDate: MOCK_DATES.EXPIRY_DATE,
  registrationNumber: 'REG87654321',
  documents: [],
  businessDetails: {
    legalName: 'Test Platform Inc.',
    businessNumber: '987654321',
    homeJurisdiction: 'BC',
    mailingAddress: {
      address: '123 Tech St',
      addressLineTwo: 'Suite 200',
      city: 'Victoria',
      country: 'CA',
      locationDescription: 'Downtown',
      postalCode: 'V8V 1A1',
      province: 'BC'
    },
    registeredOfficeOrAttorneyForServiceDetails: {
      attorneyName: 'Jane Smith',
      mailingAddress: MOCK_MAILING_ADDRESS
    }
  },
  platformRepresentatives: [{
    lastName: 'Jones',
    emailAddress: 'bob.jones@example.com',
    firstName: 'Bob',
    middleName: '',
    preferredName: 'Bobby',
    faxNumber: ''
  }] as ApiRep[],
  platformDetails: {
    brands: [
      {
        name: 'Provider A',
        website: 'http://abc.com'
      },
      {
        name: 'Provider B',
        website: 'http://xyz.com'
      }
    ],
    listingSize: ListingSize.THOUSAND_AND_ABOVE,
    documents: mockDocuments
  },
  sbc_account_id: 12345,
  updatedDate: MOCK_DATES.APPLICATION_DATE,
  user_id: 123
}

export const mockStrataHotelRegistration: StrataHotelRegistrationResp = {
  header: createRegistrationHeader(
    MOCK_DATES.STRATA_APPLICATION_DATE,
    'Suspended',
    'Suspended',
    ['REINSTATE', 'CANCEL']
  ),
  id: 12347,
  registrationType: ApplicationType.STRATA_HOTEL,
  status: RegistrationStatus.ACTIVE,
  startDate: MOCK_DATES.START_DATE,
  expiryDate: MOCK_DATES.EXPIRY_DATE,
  registrationNumber: 'REG54321876',
  documents: [],
  businessDetails: MOCK_DOE_ENTERPRISES_BUSINESS,
  strataHotelDetails: {
    brand: MOCK_STRATA_HOTEL_BRAND,
    buildings: [],
    location: MOCK_HOTEL_ADDRESS,
    numberOfUnits: 1,
    category: StrataHotelCategory.FULL_SERVICE,
    documents: []
  },
  strataHotelRepresentatives: [MOCK_STRATA_REP] as ApiRep[],
  sbc_account_id: 12345,
  updatedDate: MOCK_DATES.STRATA_APPLICATION_DATE,
  user_id: 123
}

export const mockExpiredRegistration: HostRegistrationResp = {
  ...mockHostRegistration,
  status: RegistrationStatus.EXPIRED,
  header: {
    ...mockHostRegistration.header,
    examinerStatus: 'Expired',
    hostStatus: 'Expired'
  }
}

export const mockSuspendedRegistration: HostRegistrationResp = {
  ...mockHostRegistration,
  status: RegistrationStatus.SUSPENDED,
  header: {
    ...mockHostRegistration.header,
    examinerStatus: 'Suspended',
    hostStatus: 'Suspended'
  }
}

export const mockCancelledRegistration: HostRegistrationResp = {
  ...mockHostRegistration,
  status: RegistrationStatus.CANCELLED,
  header: {
    ...mockHostRegistration.header,
    examinerStatus: 'Cancelled',
    hostStatus: 'Cancelled'
  }
}

export const mockApplicationFilingHistory: FilingHistoryEvent[] =
  [
    {
      createdDate: '2025-03-20T23:21:13.496375',
      eventName: FilingHistoryEventName.INVOICE_GENERATED,
      eventType: FilingHistoryEventType.APPLICATION,
      idir: null,
      message: 'Invoice generated'
    },
    {
      createdDate: '2025-03-20T23:21:14.008389',
      eventName: FilingHistoryEventName.PAYMENT_COMPLETE,
      eventType: FilingHistoryEventType.APPLICATION,
      idir: null,
      message: 'Payment completed'
    },
    {
      createdDate: '2025-03-20T23:25:24.559788',
      eventName: FilingHistoryEventName.AUTO_APPROVAL_FULL_REVIEW,
      eventType: FilingHistoryEventType.APPLICATION,
      idir: null,
      message: 'Application marked for full review by the auto approval process'
    },
    {
      createdDate: '2025-03-21T16:44:07.559788',
      eventName: FilingHistoryEventName.MANUALLY_APPROVED,
      eventType: FilingHistoryEventType.APPLICATION,
      idir: 'user1@idir',
      message: 'Application approved by staff'
    }
  ]

export const mockRegistrationFilingHistory: FilingHistoryEvent[] =
  [
    {
      createdDate: '2025-02-28T15:45:25.790939',
      eventName: FilingHistoryEventName.REGISTRATION_CREATED,
      eventType: FilingHistoryEventType.REGISTRATION,
      idir: null,
      message: 'Registration created'
    },
    {
      createdDate: '2025-03-05T15:08:41.997418',
      eventName: FilingHistoryEventName.NON_COMPLIANCE_SUSPENDED,
      eventType: FilingHistoryEventType.REGISTRATION,
      idir: '',
      message: 'Registration suspended due to non compliance'
    },
    {
      createdDate: '2025-03-05T15:08:45.966389',
      eventName: FilingHistoryEventName.REGISTRATION_CANCELLED,
      eventType: FilingHistoryEventType.REGISTRATION,
      idir: '',
      message: 'Registration cancelled'
    }
  ]
