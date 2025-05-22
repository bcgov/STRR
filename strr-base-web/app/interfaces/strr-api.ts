import type { RegistrationTodoType } from '~/enums/registration-todo-type'

export interface ApiPhone {
  phoneCountryCode: string
  phoneNumber: string
  extension: string
}

export interface ApiBaseAddress {
  country: string
  address?: string // Currently the api does not accept this during registration creation for unit address
  addressLineTwo: string
  city: string
  province: string
  postalCode: string,
  locationDescription: string
}

export interface ApiAddress extends ApiBaseAddress {
  address: string
}

export interface ApiParty extends ApiPhone {
  firstName?: string
  lastName: string
  middleName?: string
  preferredName?: string
  emailAddress: string
  faxNumber?: string
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
  header?: {
    paymentMethod: ConnectPaymentMethod
  }
  registrationType: ApplicationType
  businessDetails: ApiBusinessDetails
  documents?: ApiDocument[]
}

export interface ApiBaseApplication extends ApiBaseRegistration {
  completingParty: ApiParty
}

export interface ApiExtraRegistrationDetails {
  expiryDate: Date
  id: number
  registrationNumber: string
  sbc_account_id: number
  startDate: Date
  status: RegistrationStatus,
  updatedDate: Date
  cancelledDate?: Date
  user_id: number
}

export interface ApplicationHeader {
  applicationDateTime: Date
  applicationNumber: string
  decisionDate: Date | undefined
  examinerActions: string[]
  examinerStatus: string
  existingHostRegistrations?: number
  hostActions: string[] // SUBMIT_PAYMENT is currently the only case where this has anything
  hostStatus: string
  isCertificateIssued: boolean
  isSetAside: boolean | null
  name: string
  paymentAccount: string
  paymentMethod: ConnectPaymentMethod
  paymentStatus: string
  paymentToken: number // invoice id
  status: ApplicationStatus
  // below will only exist for applications that have a linked registration
  registrationEndDate?: Date
  registrationId?: number
  registrationNumber?: string
  registrationStartDate?: Date
  registrationStatus?: RegistrationStatus
  reviewer?: {
    username: string
    displayName: string
  }
  nocStartDate?: Date
  nocEndDate?: Date
}

export interface ApiRegistrationResp extends ApiBaseRegistration, ApiExtraRegistrationDetails { }

// NB: This is temporary.
// Hoping the backend is updated for Hosts eventually so that its easier to share typing across all 3
export interface ApiApplicationBaseResp {
  registration: any
  header: ApplicationHeader
}
export interface ApiApplicationResp extends ApiApplicationBaseResp {
  registration: ApiBaseApplication
}

export interface ApiApplicationsListResp {
  applications: ApiApplicationResp[]
  limit: number
  page: number
  total: number
}

export interface ApiDocument {
  documentType: DocumentUploadType
  fileKey: string
  fileName: string
  fileType: string
  uploadStep?: DocumentUploadStep
  uploadDate?: string
}

export interface ApiRegistrationTodoTaskResp {
  task: {
    type: RegistrationTodoType
  }
}
