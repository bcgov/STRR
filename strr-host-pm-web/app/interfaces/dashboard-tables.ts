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

export interface RenewalTodoDetails {
  hasRenewalTodo?: boolean
  hasRenewalDraft?: boolean
  hasRenewalPaymentPending?: boolean
  renewalDraftId?: string | null
  renewalPaymentPendingId?: string | null
}

export interface RegistrationRecordWithTodos extends RegistrationRecord, RenewalTodoDetails {}

export type TreeRowType = 'registration' | 'application' | 'standalone_application'

export interface TreeTableRow {
  id: string
  rowType: TreeRowType
  number: string
  nickname?: string
  status?: string
  statusKey?: ApplicationStatus | RegistrationStatus
  hostActions?: HostActions[]
  address?: ApiUnitAddress
  localGovernment?: string
  dateSubmitted?: Date | string
  expiryDate?: string
  expiryState?: ExpiryState
  applicationNumber?: string
  applicationType?: string
  paymentToken?: number
  hasRenewalDraft?: boolean
  renewalDraftApplicationNumber?: string
  canRenew?: boolean
  registrationId?: number
  isExpanded?: boolean
  children?: TreeTableRow[]
  isChild?: boolean
  isParent?: boolean
  parentId?: string
  level?: number
  disabled?: boolean
  class?: string
}
