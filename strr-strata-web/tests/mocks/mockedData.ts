export const mockEmptyAddress: ConnectAddress = {
  country: 'CA',
  street: '',
  streetAdditional: '',
  city: '',
  region: 'BC',
  postalCode: '',
  locationDescription: ''
}

export const mockAddress: ConnectAddress = {
  country: 'CA',
  street: '123 Main St',
  streetAdditional: 'Suite 1',
  city: 'Victoria',
  region: 'BC',
  postalCode: 'V8V1A1',
  locationDescription: ''
}

export const mockApiAddress: ApiAddress = {
  address: '123 Main St',
  addressLineTwo: '',
  city: 'Victoria',
  province: 'BC',
  country: 'CA',
  postalCode: 'V8V1A1',
  locationDescription: ''
}

export const mockEmptyApiAddress: ApiAddress = {
  address: '',
  addressLineTwo: '',
  city: '',
  province: '',
  country: '',
  postalCode: '',
  locationDescription: ''
}

export const mockStrataBusiness: StrrBusiness = {
  legalName: '',
  homeJurisdiction: '',
  businessNumber: '',
  mailingAddress: mockEmptyAddress,
  hasRegOffAtt: undefined,
  regOfficeOrAtt: {
    sameAsMailAddress: false,
    attorneyName: '',
    mailingAddress: mockEmptyAddress
  }
}

export const mockStrataDetails: StrataDetails = {
  brand: { name: '', website: '' },
  buildings: [],
  location: mockEmptyAddress,
  numberOfUnits: undefined,
  category: undefined,
  unitListings: { primary: '', additional: [] }
}

export const mockStoredDocument: UiDocument = {
  id: 'doc-1',
  name: 'strata-permit.pdf',
  type: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
  file: new File([], 'strata-permit.pdf'),
  apiDoc: {
    documentType: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
    fileKey: 'key-1',
    fileName: 'strata-permit.pdf',
    fileType: 'application/pdf'
  },
  loading: false
}

export const mockCompletingParty: Contact = {
  firstName: 'Jane',
  lastName: 'Doe',
  middleName: '',
  emailAddress: 'jane@test.com',
  phone: { countryCode: '1', number: '5551234567', extension: '' },
  faxNumber: ''
}

export const mockPrimaryRep: StrrContact = {
  firstName: 'Dirty',
  lastName: 'User',
  middleName: '',
  emailAddress: 'a@b.com',
  phone: { countryCode: '1', number: '1234567890', extension: '' },
  position: ''
}

export const mockContactStore = {
  completingParty: mockCompletingParty,
  isCompletingPartyRep: undefined,
  primaryRep: undefined,
  secondaryRep: undefined
}

export const mockStrataBusinessStore = {
  strataBusiness: {
    legalName: '',
    homeJurisdiction: '',
    businessNumber: '',
    mailingAddress: mockEmptyAddress,
    hasRegOffAtt: false,
    regOfficeOrAtt: { sameAsMailAddress: false, attorneyName: '', mailingAddress: mockEmptyAddress }
  }
}

export const mockStrataDetailsStore = {
  strataDetails: mockStrataDetails,
  originalBuildingCount: 0
}

export const mockDocumentStore = {
  storedDocuments: []
}

export const mockStrataApplicationStore = {
  confirmation: { confirmation: false }
}

export const mockReviewConfirmInitialState = {
  'strr/contact': mockContactStore,
  'strr/strataBusiness': mockStrataBusinessStore,
  'strr/strataDetails': mockStrataDetailsStore,
  'strata/document': mockDocumentStore,
  'strr/strataApplication': mockStrataApplicationStore
}

export const mockRenewalStrataDetails: StrataDetails = {
  brand: { name: 'Test', website: 'https://test.com' },
  buildings: [
    {
      country: 'CA',
      street: '123 Main St',
      streetAdditional: '',
      city: 'Victoria',
      region: 'BC',
      postalCode: 'V1V1V1',
      locationDescription: ''
    },
    {
      country: 'CA',
      street: '456 Oak Ave',
      streetAdditional: '',
      city: 'Victoria',
      region: 'BC',
      postalCode: 'V2V2V2',
      locationDescription: ''
    }
  ],
  location: {
    country: 'CA',
    street: '100 Hotel Rd',
    streetAdditional: '',
    city: 'Victoria',
    region: 'BC',
    postalCode: 'V3V3V3',
    locationDescription: ''
  },
  numberOfUnits: 10,
  category: undefined,
  unitListings: { primary: '', additional: ['', ''] }
}

export const mockApiParty: ApiParty = {
  firstName: 'Jane',
  middleName: '',
  lastName: 'Doe',
  emailAddress: 'jane@example.com',
  phoneCountryCode: '1',
  phoneNumber: '2501234567',
  extension: ''
}

export const mockApiRepMatchingParty: ApiRep = {
  ...mockApiParty,
  jobTitle: 'Manager'
}

export const mockApiStrataDetails: ApiStrataDetails = {
  brand: {
    name: 'Test Brand',
    website: 'https://test.com'
  },
  buildings: [mockApiAddress, mockApiAddress],
  location: mockApiAddress,
  numberOfUnits: 10,
  category: StrataHotelCategory.FULL_SERVICE,
  unitListings: {
    primary: 'Suite 1',
    additional: ['Room A', 'Room B']
  }
}

export const mockBusinessDetails: ApiBusinessDetails = {
  legalName: 'Test Corp',
  homeJurisdiction: 'BC',
  businessNumber: '123456789',
  mailingAddress: mockApiAddress,
  registeredOfficeOrAttorneyForServiceDetails: {
    attorneyName: '',
    mailingAddress: mockEmptyApiAddress
  }
}

export const mockPermitDetailsData = {
  completingParty: mockApiParty,
  strataHotelRepresentatives: [mockApiRepMatchingParty],
  businessDetails: mockBusinessDetails,
  strataHotelDetails: mockApiStrataDetails,
  documents: [{
    documentType: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
    fileKey: 'k1',
    fileName: 'permit.pdf',
    fileType: 'application/pdf',
    uploadStep: 'UPLOAD'
  }]
}
