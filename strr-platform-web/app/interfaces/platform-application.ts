export interface PlatAppAddress {
  country: string
  address: string
  addressLineTwo: string
  city: string
  province: string
  postalCode: string
}

export interface PlatAppParty {
  firstName: string
  lastName: string
  middleName: string
  phoneNumber: string
  extension: string
  faxNumber: string
  emailAddress: string
}

export interface PlatAppRep extends PlatAppParty {
  jobTitle: string
}

export interface PlatAppBusinessDetails {
  legalName: string
  homeJurisdiction: string
  businessNumber: string
  consumerProtectionBCLicenceNumber: string
  noticeOfNonComplianceEmail: string
  noticeOfNonComplianceOptionalEmail: string
  takeDownRequestEmail: string
  takeDownRequestOptionalEmail: string
  mailingAddress: PlatAppAddress
  registeredOfficeOrAttorneyForServiceDetails: {
    attorneyName: string
    mailingAddress: PlatAppAddress
  }
}

export interface PlatAppPlatformDetails {
  brands: PlatBrand[]
  listingSize: ListingSize
}

export interface PlatAppRegistration {
  registrationType: ApplicationType
  completingParty: PlatAppParty
  platformRepresentatives: PlatAppRep[]
  businessDetails: PlatAppBusinessDetails
  platformDetails: PlatAppPlatformDetails
}

export interface PlatApp {
  registration: PlatAppRegistration
}
