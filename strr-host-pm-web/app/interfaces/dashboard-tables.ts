export interface ApplicationRow {
  number: string
  status?: string
  statusKey?: ApplicationStatus
  hostActions: HostActions[]
  address: ApiUnitAddress
  localGovernment: string
  dateSubmitted?: Date | string
  applicationNumber: string
  paymentToken?: number
  disabled?: boolean
  class?: string
}

export interface RegistrationApplicationSummary {
  applicationType?: string
  applicationStatus?: ApplicationStatus
  applicationNumber?: string
}

export interface RegistrationRecord {
  id: number
  registrationNumber: string
  registrationType?: ApplicationType
  expiryDate?: string
  status?: RegistrationStatus
  header?: {
    hostStatus?: string
    applications?: RegistrationApplicationSummary[]
  }
  unitAddress: ApiUnitAddress
  unitDetails?: {
    jurisdiction?: string
  }
}

export interface RegistrationRow {
  number: string
  status?: string
  address: ApiUnitAddress
  localGovernment: string
  expiryDate?: string
  expiryState: ExpiryState
  hasRenewalDraft: boolean
  renewalDraftApplicationNumber?: string
  canRenew: boolean
  registrationId: number
}
