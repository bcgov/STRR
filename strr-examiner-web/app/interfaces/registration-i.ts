export interface ApiApplicationEntry {
  applicationNumber: string
  applicationDateTime: string
  organizationName?: string
  applicationStatus: ApplicationStatus
  applicationType?: string
  assignee?: {
    username: string
    displayName: string
  }
  decider?: {
    username: string
    displayName: string
  }
}

export interface ApiRegistrationHeader {
  hostStatus: string
  hostActions: string[]
  examinerStatus: string
  examinerActions: string[]
  applications?: ApiApplicationEntry[]
  assignee?: {
    username: string
    displayName: string
  }
  decider?: {
    username: string
    displayName: string
  }
  isSetAside: boolean | null
}

export interface ApiRegistrationListResp {
  registrations: HousRegistrationResponse[]
  limit: number
  page: number
  total: number
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
  strRequirements?: PropertyRequirements
}

export interface StrataHotelRegistrationResp extends ApiExtraRegistrationDetails {
  header: ApiRegistrationHeader
  registrationType: ApplicationType
  businessDetails?: ApiBusinessDetails
  strataHotelRepresentatives?: ApiRep[]
  strataHotelDetails?: ApiStrataDetails
  documents?: ApiDocument[]
}

export interface PlatformRegistrationResp extends ApiExtraRegistrationDetails {
  header: ApiRegistrationHeader
  registrationType: ApplicationType
  businessDetails?: ApiBusinessDetails
  platformRepresentatives?: ApiRep[]
  platformDetails?: ApiPlatformDetails
  documents?: ApiDocument[]
}

export interface ApiSnapshot {
  id: number
  snapshotDateTime: string
  snapshotEndpoint: string
  version: number
}

export interface ExaminerActiveHeader extends
  Partial<Omit<ApplicationHeader, 'applicationDateTime'>>,
  Partial<Omit<ApiRegistrationHeader, 'applications'>> {
  applicationDateTime?: Date | string
  applications?: ApiApplicationEntry[]
  applicationStatus?: ApplicationStatus
  registrationNumber?: string
  status?: ApplicationStatus
}

export interface ExaminerActiveRegistration extends
  Partial<Omit<ApiHostApplication, 'header' | 'listingDetails'>>,
  Partial<Omit<ApiBasePlatformApplication, 'header' | 'businessDetails'>>,
  Partial<Omit<ApiBaseStrataApplication, 'header' | 'businessDetails'>>,
  Partial<Omit<ApiExtraRegistrationDetails, 'header'>> {
  header?: Partial<ApiRegistrationHeader> & { paymentMethod?: ConnectPaymentMethod }
  conditionsOfApproval?: ConditionsOfApproval[]
  registrationType?: ApplicationType
  listingDetails?: string[] | { url: string }[]
  businessDetails?: ApiBusinessDetails | ApiPlatformBusinessDetails
}
