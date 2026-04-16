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

export const mockPlatBusiness: PlatBusiness = {
  legalName: 'Acme Rentals Ltd.',
  homeJurisdiction: 'BC',
  businessNumber: '',
  hasCpbc: true,
  cpbcLicenceNumber: '12345',
  nonComplianceEmail: 'nc@example.com',
  nonComplianceEmailOptional: '',
  takeDownEmail: 'td@example.com',
  takeDownEmailOptional: '',
  mailingAddress: mockAddress,
  hasRegOffAtt: false,
  regOfficeOrAtt: {
    sameAsMailAddress: false,
    attorneyName: '',
    mailingAddress: mockEmptyAddress
  }
}

export const mockApiPlatformBusiness: ApiPlatformBusinessDetails = {
  legalName: 'Acme Rentals Ltd.',
  homeJurisdiction: 'BC',
  businessNumber: '123456789',
  consumerProtectionBCLicenceNumber: '12345',
  noticeOfNonComplianceEmail: 'nc@example.com',
  takeDownRequestEmail: 'td@example.com',
  mailingAddress: mockApiAddress,
  registeredOfficeOrAttorneyForServiceDetails: {
    attorneyName: '',
    mailingAddress: mockEmptyApiAddress
  }
}

export const mockPlatformDetails: ApiPlatformDetails = {
  brands: [{ name: 'AirBnB', website: 'https://airbnb.com' }],
  listingSize: ListingSize.LESS_THAN_250
}

export const mockPlatformDetailsMultiBrand: ApiPlatformDetails = {
  brands: [
    { name: 'AirBnB', website: 'https://airbnb.com' },
    { name: 'VRBO', website: 'https://vrbo.com' }
  ],
  listingSize: ListingSize.THOUSAND_AND_ABOVE
}

export const mockCompletingParty: Contact = {
  firstName: 'Jane',
  lastName: 'Doe',
  middleName: '',
  emailAddress: 'jane@example.com',
  phone: { countryCode: '1', number: '5551234567', extension: '' },
  faxNumber: ''
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

export const mockApiRep: ApiRep = {
  ...mockApiParty,
  jobTitle: 'Manager'
}

export const mockPlatformPermitDetails: ApiBasePlatformApplication = {
  registrationType: ApplicationType.PLATFORM,
  completingParty: mockApiParty,
  platformRepresentatives: [mockApiRep],
  businessDetails: mockApiPlatformBusiness,
  platformDetails: mockPlatformDetails
}
