export interface ApiAddress {
  country: string
  address: string
  addressLineTwo: string
  city: string
  province: string
  postalCode: string
}

export interface ApiParty {
  firstName: string
  lastName: string
  middleName: string
  phoneNumber: string
  extension: string
  faxNumber: string
  emailAddress: string
}

export interface ApiRep extends ApiParty {
  jobTitle: string
}

export interface ApiBusinessDetails {
  legalName: string
  homeJurisdiction: string
  businessNumber: string
  consumerProtectionBCLicenceNumber: string
  noticeOfNonComplianceEmail: string
  noticeOfNonComplianceOptionalEmail: string
  takeDownRequestEmail: string
  takeDownRequestOptionalEmail: string
  mailingAddress: ApiAddress
  registeredOfficeOrAttorneyForServiceDetails: {
    attorneyName: string
    mailingAddress: ApiAddress
  }
}

export interface ApiPlatformDetails {
  brands: PlatBrand[]
  listingSize: ListingSize
}

export interface PlatformApplicationPayload {
  registration: {
    registrationType: ApplicationType
    completingParty: ApiParty
    platformRepresentatives: ApiRep[]
    businessDetails: ApiBusinessDetails
    platformDetails: ApiPlatformDetails
  }
}
