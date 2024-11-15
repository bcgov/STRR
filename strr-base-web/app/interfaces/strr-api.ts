export interface ApiPhone {
  phoneCountryCode: string
  phoneNumber: string
  extension: string
}

export interface ApiAddress {
  country: string
  address: string
  addressLineTwo: string
  city: string
  province: string
  postalCode: string,
  locationDescription: string
}

export interface ApiParty extends ApiPhone {
  firstName: string
  lastName: string
  middleName: string
  emailAddress: string
  faxNumber: string
}

export interface ApiRep extends ApiParty {
  jobTitle: string
}

export interface ApiBusinessDetails {
  legalName: string
  homeJurisdiction: string
  businessNumber: string
  mailingAddress: ApiAddress
  registeredOfficeOrAttorneyForServiceDetails: {
    attorneyName: string
    mailingAddress: ApiAddress
  }
}

export interface ApiBaseRegistration {
  registrationType: ApplicationType
  businessDetails: ApiBusinessDetails
}

export interface ApiBaseApplication extends ApiBaseRegistration {
  completingParty: ApiParty
}

export interface ApiExtraRegistrationDetails {
  expiryDate: Date
  id: number
  registration_number: string
  sbc_account_id: number
  startDate: Date
  status: RegistrationStatus,
  updatedDate: Date
  user_id: number
}

export interface ApplicationHeader {
  applicationDateTime: Date
  applicationNumber: string
  decisionDate: Date | undefined
  examinerActions: string[]
  examinerStatus: string
  hostActions: string[] // SUBMIT_PAYMENT is currently the only case where this has anything
  hostStatus: string
  isCertificateIssued: boolean
  name: string
  paymentAccount: string
  paymentStatus: string
  paymentToken: number // invoice id
  status: ApplicationStatus
  // below will only exist for applications that have a linked registration
  registrationEndDate?: Date
  registrationId?: number
  registrationNumber?: string
  registrationStartDate?: Date
  registrationStatus?: RegistrationStatus
}

export interface ApiRegistrationResp extends ApiBaseRegistration, ApiExtraRegistrationDetails { }
export interface ApiApplicationResp {
  registration: ApiBaseApplication
  header: ApplicationHeader
}
