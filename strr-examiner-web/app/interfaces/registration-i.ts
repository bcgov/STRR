interface ApiRegistrationHeader {
  hostStatus: string
  hostActions: string[]
  examinerStatus: string
  examinerActions: string[]
  applicationNumber?: string
  applicationDateTime?: string
  reviewer?: {
    username: string
    displayName: string
  }
}

export interface HostRegistrationResp extends ApiExtraRegistrationDetails {
  header: ApiRegistrationHeader
  registrationType: ApplicationType
  primaryContact?: ApiHostContactPerson | ApiHostContactBusiness
  secondaryContact?: ApiHostContactPerson | ApiHostContactBusiness
  unitAddress?: ApiUnitAddress
  unitDetails?: ApiUnitDetails
  listingDetails?: { url: string }[]
  propertyManager?: ApiPropertyManager
  strRequirements?: PropertyRequirements
  documents?: ApiDocument[]
  id: number
  existingHostRegistrations?: number
}

export interface StrataHotelRegistrationResp extends ApiExtraRegistrationDetails {
  header: ApiRegistrationHeader
  registrationType: ApplicationType
  businessDetails?: ApiBusinessDetails
  strataHotelRepresentatives?: ApiRep[]
  strataHotelDetails?: ApiStrataDetails
  documents?: ApiDocument[]
  id: number
  completingParty?: ApiParty
}

export interface PlatformRegistrationResp extends ApiExtraRegistrationDetails {
  header: ApiRegistrationHeader
  registrationType: ApplicationType
  businessDetails?: ApiBusinessDetails
  platformRepresentatives?: ApiRep[]
  platformDetails?: ApiPlatformDetails
  documents?: ApiDocument[]
  id: number
  completingParty?: ApiParty
}
