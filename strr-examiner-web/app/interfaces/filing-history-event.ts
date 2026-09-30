import type { FilingHistoryEventName } from '~/enums/filing-history'

export interface EmailRecipientStatus {
  email_address?: string
  status?: string
  provider_status?: string
  failure_type?: string | null
  failure_reason?: string | null
  notify_reference?: string
  provider_reference?: string
  request_date?: string
  sent_date?: string
}

export interface EmailStructuredDetails {
  emailType?: string
  interactionStatus?: string
  recipientStatuses?: EmailRecipientStatus[]
}

export interface FilingHistoryEvent {
  createdDate: string
  eventName: FilingHistoryEventName
  eventType: string
  idir: string | null
  message: string
  details: string | null
  structuredDetails: EmailStructuredDetails | Record<string, unknown> | unknown[] | null
}
