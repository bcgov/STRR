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
  hasEmailDeliveryFailure?: boolean
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
  hasEmailDeliveryFailure?: boolean
  has_email_delivery_failure?: boolean
  header?: {
    hostStatus?: string
    hasEmailDeliveryFailure?: boolean
    has_email_delivery_failure?: boolean
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
  hasEmailDeliveryFailure?: boolean
}

export interface RenewalTodoDetails {
  hasRenewalTodo?: boolean
  hasRenewalDraft?: boolean
  hasRenewalPaymentPending?: boolean
  renewalDraftId?: string | null
  renewalPaymentPendingId?: string | null
}

export interface RegistrationRecordWithTodos extends RegistrationRecord, RenewalTodoDetails {}
