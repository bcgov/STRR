export interface ApiPlatformBusinessDetails extends ApiBusinessDetails {
  consumerProtectionBCLicenceNumber: string
  noticeOfNonComplianceEmail: string
  noticeOfNonComplianceOptionalEmail?: string
  takeDownRequestEmail: string
  takeDownRequestOptionalEmail?: string
}

export interface ApiPlatformDetails {
  brands: StrrBrand[]
  listingSize: ListingSize
}

export interface ApiBasePlatformRegistration extends ApiBaseRegistration {
  businessDetails: ApiPlatformBusinessDetails
  platformRepresentatives: ApiRep[]
  platformDetails: ApiPlatformDetails
}

export interface ApiBasePlatformApplication extends ApiBasePlatformRegistration {
  completingParty: ApiParty
}

export interface PlatformRegistrationResp extends ApiBasePlatformRegistration, ApiExtraRegistrationDetails {
}

export interface PlatformApplicationPayload {
  registration: ApiBasePlatformApplication
}

export interface PlatformApplicationResp extends PlatformApplicationPayload {
  header: ApplicationHeader
}
