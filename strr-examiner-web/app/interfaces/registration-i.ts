interface ApiApplicationEntry {
  applicationNumber: string
  applicationDateTime: string
  organizationName?: string
  status: ApplicationStatus
  reviewer?: {
    username: string
    displayName: string
  }
}

interface ApiRegistrationHeader {
  hostStatus: string
  hostActions: string[]
  examinerStatus: string
  examinerActions: string[]
  applications?: ApiApplicationEntry[]
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
  documents?: ApiDocument[]
  id: number
}

export interface StrataHotelRegistrationResp extends ApiExtraRegistrationDetails {
  header: ApiRegistrationHeader
  registrationType: ApplicationType
  businessDetails?: ApiBusinessDetails
  strataHotelRepresentatives?: ApiRep[]
  strataHotelDetails?: ApiStrataDetails
  documents?: ApiDocument[]
  id: number
}

export interface PlatformRegistrationResp extends ApiExtraRegistrationDetails {
  header: ApiRegistrationHeader
  registrationType: ApplicationType
  businessDetails?: ApiBusinessDetails
  platformRepresentatives?: ApiRep[]
  platformDetails?: ApiPlatformDetails
  documents?: ApiDocument[]
  id: number
}
