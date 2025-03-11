import type { ListingSize } from '~/enums/platform-e'

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
  documents: ApiDocument[]
}

export interface ApiBasePlatformRegistration extends ApiBaseRegistration {
  businessDetails: ApiPlatformBusinessDetails
  platformRepresentatives: ApiRep[]
  platformDetails: ApiPlatformDetails
}

export interface ApiBasePlatformApplication extends ApiBasePlatformRegistration {
  completingParty: ApiParty
}

export interface PlatformApplicationPayload {
  registration: ApiBasePlatformApplication
}

export interface PlatformApplicationResp extends PlatformApplicationPayload {
  header: ApplicationHeader
}
