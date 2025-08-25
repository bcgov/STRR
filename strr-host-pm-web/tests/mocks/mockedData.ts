import { DateTime } from 'luxon'

const mockDocuments: ApiDocument[] = [
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

const mockPrimaryContactPerson: ApiHostContactPerson = {
  contactType: OwnerType.INDIVIDUAL,
  dateOfBirth: '1985-05-15',
  emailAddress: 'alice.smith@example.com',
  extension: '',
  firstName: 'Alice',
  lastName: 'Smith',
  mailingAddress: {
    address: '123 Main St',
    addressLineTwo: '',
    city: 'Vancouver',
    country: 'CA',
    locationDescription: '',
    postalCode: 'V5K 0A1',
    province: 'BC'
  },
  phoneCountryCode: '1',
  phoneNumber: '6041234567',
  socialInsuranceNumber: '123 456 789'
}

const mockConditionsOfApproval: ConditionsOfApproval = {
  predefinedConditions: [
    'principalResidence',
    'validBL',
    'minBookingDays'
  ],
  customConditions: [
    'Custom Condition 1'
  ],
  minBookingDays: 28
}

export const mockApplication: HostApplicationResp = {
  header: {
    applicationDateTime: new Date('2025-01-01T10:30:00.000000+00:00'),
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
    status: ApplicationStatus.FULL_REVIEW,
    isSetAside: null
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
    unitAddress: {
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
    },
    unitDetails: {
      hostResidence: ResidenceType.SAME_UNIT,
      isUnitOnPrincipalResidenceProperty: true,
      numberOfRoomsForRent: 2,
      ownershipType: OwnershipType.OWN,
      parcelIdentifier: '123-456-789',
      propertyType: PropertyType.CONDO_OR_APT,
      rentalUnitSpaceType: RentalUnitType.ENTIRE_HOME,
      businessLicense: '123123123',
      strataHotelCategory: StrataHotelCategory.FULL_SERVICE
    }
  }
}

const mockMailingAddress: ConnectAddress = {
  street: '456 Elm St',
  streetAdditional: 'Suite 200',
  city: 'Victoria',
  region: 'BC',
  postalCode: 'V1V2B2',
  country: 'CA',
  locationDescription: 'Next to the library',
  streetName: 'Elm St',
  streetNumber: '456',
  unitNumber: '200'
}

export const mockHostOwner: HostOwner = {
  ownerType: OwnerType.INDIVIDUAL,
  preferredName: 'Jane Smith',
  mailingAddress: mockMailingAddress,
  businessLegalName: 'Jane Smith Consulting',
  businessNumber: '987654321',
  dateOfBirth: '1990-05-15',
  role: OwnerRole.HOST,
  isCompParty: true,
  taxNumber: '123456789',
  firstName: 'Jane',
  middleName: 'A.',
  lastName: 'Smith',
  faxNumber: '555-987-6543',
  emailAddress: 'jane.smith@example.com',
  phone: {
    number: '555-123-4567'
  }
}

const mockUnitAddress: ApiUnitAddress = {
  addressLineTwo: 'Apt 3B',
  city: 'Victoria',
  country: 'CA',
  locationDescription: 'Close to the Inner Harbour',
  nickname: 'Harbour View Unit',
  postalCode: 'V8W 1P6',
  province: 'BC',
  streetName: 'Government St',
  streetNumber: '789',
  unitNumber: '3B'
}

export const mockHostRegistration: HostRegistrationResp = {
  header: {
    applicationDateTime: DateTime.utc(2025, 1, 1).setZone('America/Vancouver').toString(),
    applicationNumber: '12345678901234',
    examinerActions: ['CANCEL', 'SUSPEND'],
    examinerStatus: 'Registered',
    hostActions: [],
    hostStatus: 'Registered',
    assignee: {
      username: 'examiner@idir',
      displayName: 'Examiner One'
    }
  },
  id: 308,
  registrationType: ApplicationType.HOST,
  status: RegistrationStatus.ACTIVE,
  nocStatus: RegistrationNocStatus.NOC_PENDING,
  nocStartDate: DateTime.utc(2025, 10, 10).setZone('America/Vancouver'),
  nocEndDate: DateTime.utc(2025, 10, 18).setZone('America/Vancouver'),
  startDate: DateTime.utc(2025, 1, 1).setZone('America/Vancouver'),
  expiryDate: DateTime.utc(2026, 1, 1).setZone('America/Vancouver'),
  registrationNumber: 'REG12345678',
  primaryContact: mockPrimaryContactPerson,
  unitAddress: mockUnitAddress,
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
    organizationNm: 'City of Victoria'
  },
  documents: mockDocuments,
  listingDetails: [],
  conditionsOfApproval: mockConditionsOfApproval,
  sbc_account_id: 12345,
  updatedDate: DateTime.utc(2026, 2, 2).toLocal(),
  user_id: 123
}
