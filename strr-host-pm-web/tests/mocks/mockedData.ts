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

const primaryContactPerson: ApiHostContactPerson = {
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

export const mockHostApplication: HostApplicationResp = {
  header: {
    applicationDateTime: new Date('2025-01-01T10:30:00.000000+00:00'),
    applicationNumber: '12345678901234',
    decisionDate: undefined,
    examinerActions: ['APPROVE'],
    examinerStatus: 'Full Examination',
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
    primaryContact: primaryContactPerson,
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
