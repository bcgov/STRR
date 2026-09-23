type FilingHistoryRecord = {
  id?: number
  header?: {
    applicationNumber?: string
    applications?: Array<{ applicationNumber?: string }>
  }
}

// Maps structured-details field paths returned by the API to filing history i18n keys.
export const FILING_HISTORY_FIELD_MAP: Record<string, string> = {
  'primaryContact.emailAddress': 'filingHistoryFields.primaryContactEmail'
}

const HIDDEN_EVENTS: Set<FilingHistoryEventName> = new Set([
  FilingHistoryEventName.AUTO_APPROVAL_FULL_REVIEW,
  FilingHistoryEventName.AUTO_APPROVAL_PROVISIONAL,
  FilingHistoryEventName.AUTO_APPROVAL_APPROVED
])

const EXPANDABLE_EVENTS: Set<FilingHistoryEventName> = new Set([
  FilingHistoryEventName.CONDITIONS_OF_APPROVAL_UPDATED,
  FilingHistoryEventName.REGISTRATION_UPDATED,
  FilingHistoryEventName.EMAIL_QUEUED,
  FilingHistoryEventName.EMAIL_SENT,
  FilingHistoryEventName.EMAIL_DELIVERED,
  FilingHistoryEventName.EMAIL_FAILED,
  FilingHistoryEventName.EMAIL_OPENED
])

const EMAIL_EVENTS: Set<FilingHistoryEventName> = new Set([
  FilingHistoryEventName.EMAIL_QUEUED,
  FilingHistoryEventName.EMAIL_SENT,
  FilingHistoryEventName.EMAIL_DELIVERED,
  FilingHistoryEventName.EMAIL_FAILED,
  FilingHistoryEventName.EMAIL_OPENED
])

type EmailRecipientStatus = {
  email_address?: string
  failure_reason?: string | null
  failure_type?: string | null
  notify_reference?: string
  provider_reference?: string
  request_date?: string
  sent_date?: string
  status?: string
}

type EmailStructuredDetails = {
  emailType?: string
  interactionStatus?: string
  recipientStatuses?: EmailRecipientStatus[]
}

export type EmailRecipientAccordionDetail = {
  email: string
  status: string
  statusLabel: string
  sentDate?: string
  failureReason?: string
}

export type EmailAccordionDetail = {
  emailTypeLabel: string
  recipients: EmailRecipientAccordionDetail[]
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  HOST_RENEWAL_REMINDER: 'Host renewal reminder',
  STRATA_HOTEL_RENEWAL_REMINDER: 'Strata hotel renewal reminder',
  PLATFORM_RENEWAL_REMINDER: 'Platform renewal reminder',
  HOST_FULL_REVIEW_APPROVED: 'Host full review approved',
  HOST_REGISTRATION_ACTIVE: 'Host registration active'
}

const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  IN_TRANSIT: 'In transit',
  PENDING: 'Pending',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  UNKNOWN: 'Unknown'
}

const humanizeEmailType = (value: string | undefined): string => {
  if (!value) {
    return 'Unknown'
  }

  if (EMAIL_TYPE_LABELS[value]) {
    return EMAIL_TYPE_LABELS[value]
  }

  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const humanizeRecipientStatus = (value: string | undefined): string => {
  if (!value) {
    return RECIPIENT_STATUS_LABELS.UNKNOWN || 'Unknown'
  }

  const mapped = RECIPIENT_STATUS_LABELS[value]
  if (mapped) {
    return mapped
  }

  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const getEmailAccordionDetails = (event: FilingHistoryEvent): string[] => {
  if (!event.structuredDetails || Array.isArray(event.structuredDetails)) {
    return []
  }

  const structured = event.structuredDetails as EmailStructuredDetails
  const recipients = Array.isArray(structured.recipientStatuses)
    ? structured.recipientStatuses
    : []

  const lines: string[] = [
    `Email type: ${humanizeEmailType(structured.emailType)}`
  ]

  for (const recipient of recipients) {
    const email = recipient.email_address || 'Unknown email'
    const details: string[] = [`Status: ${humanizeRecipientStatus(recipient.status)}`]

    if (recipient.sent_date && (recipient.status === 'SENT' || recipient.status === 'DELIVERED')) {
      details.push(`Sent: ${recipient.sent_date}`)
    }

    if (recipient.status === 'FAILED' && recipient.failure_reason) {
      details.push(`Failure reason: ${recipient.failure_reason}`)
    }

    if (details.length > 0) {
      lines.push(`- ${email} (${details.join(', ')})`)
    } else {
      lines.push(`- ${email}`)
    }
  }

  return lines
}

export const isEmailFilingHistoryEvent = (event: FilingHistoryEvent): boolean => {
  return EMAIL_EVENTS.has(event.eventName)
}

export const getEmailFilingHistoryDetails = (event: FilingHistoryEvent): EmailAccordionDetail => {
  if (!event.structuredDetails || Array.isArray(event.structuredDetails)) {
    return {
      emailTypeLabel: humanizeEmailType(undefined),
      recipients: []
    }
  }

  const structured = event.structuredDetails as EmailStructuredDetails
  const recipients = Array.isArray(structured.recipientStatuses)
    ? structured.recipientStatuses
    : []

  return {
    emailTypeLabel: humanizeEmailType(structured.emailType),
    recipients: recipients.map((recipient) => {
      return {
        email: recipient.email_address || 'Unknown email',
        status: recipient.status || 'UNKNOWN',
        statusLabel: humanizeRecipientStatus(recipient.status),
        sentDate: recipient.sent_date && (recipient.status === 'SENT' || recipient.status === 'DELIVERED')
          ? recipient.sent_date
          : undefined,
        failureReason: recipient.status === 'FAILED' ? recipient.failure_reason || undefined : undefined
      }
    })
  }
}

export const getEmailFilingHistoryTypeLabel = (event: FilingHistoryEvent): string => {
  if (!isEmailFilingHistoryEvent(event)) {
    return ''
  }

  return getEmailFilingHistoryDetails(event).emailTypeLabel
}

const stringifyChangeValue = (value: unknown, translate: (key: string) => string): string => {
  if (value === null || value === undefined || value === '') {
    return translate('filingHistoryChangeLog.noValue')
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    if (Array.isArray(value)) {
      return translate('filingHistoryChangeLog.unavailableValue')
    }

    if (typeof value === 'object') {
      return translate('filingHistoryChangeLog.unavailableValue')
    }

    return String(value)
  }
}

const resolveFieldLabel = (fieldPath: string, translate: (key: string) => string): string => {
  const i18nKey = FILING_HISTORY_FIELD_MAP[fieldPath]
  return i18nKey ? translate(i18nKey) : fieldPath
}

export const formatFilingHistoryChange = (
  fieldPath: string,
  oldValue: unknown,
  newValue: unknown,
  translate: (key: string, params?: Record<string, string>) => string
): string => {
  const field = resolveFieldLabel(fieldPath, translate)
  const hasOld = oldValue !== null && oldValue !== undefined && oldValue !== ''
  const hasNew = newValue !== null && newValue !== undefined && newValue !== ''

  if (hasOld || hasNew) {
    return translate('filingHistoryChangeLog.template', {
      field,
      old: stringifyChangeValue(oldValue, translate),
      new: stringifyChangeValue(newValue, translate)
    })
  }

  return translate('filingHistoryChangeLog.fallbackTemplate', { field })
}

const getRegistrationUpdateChanges = (
  event: FilingHistoryEvent,
  translate: (key: string, params?: Record<string, string>) => string
): string[] => {
  if (!event.structuredDetails || Array.isArray(event.structuredDetails)) {
    return []
  }

  const structured = event.structuredDetails as {
    changes?: Array<{ field?: string, oldValue?: unknown, newValue?: unknown }>
  }

  if (!Array.isArray(structured.changes)) {
    return []
  }

  return structured.changes.map((change) => {
    return formatFilingHistoryChange(
      change.field || translate('label.unknownField'),
      change.oldValue,
      change.newValue,
      translate
    )
  })
}

export const sortAndFilterFilingHistory = (events: FilingHistoryEvent[]): FilingHistoryEvent[] => {
  return [...events]
    .sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime())
    .filter(event => !HIDDEN_EVENTS.has(event.eventName))
    .reverse()
}

export const buildFilingHistory = async (
  isApplication: boolean,
  activeRecord: FilingHistoryRecord | null | undefined,
  getApplicationFilingHistory: (applicationNumber: string) => Promise<FilingHistoryEvent[]>,
  getRegistrationFilingHistory: (registrationId: number) => Promise<FilingHistoryEvent[]>
): Promise<FilingHistoryEvent[]> => {
  if (!activeRecord) {
    return []
  }

  if (isApplication) {
    const applicationNumber = activeRecord.header?.applicationNumber
    return applicationNumber ? await getApplicationFilingHistory(applicationNumber) : []
  }

  const registrationId = activeRecord.id
  if (registrationId === undefined) {
    return []
  }

  const applicationNumber = activeRecord.header?.applications?.[0]?.applicationNumber
  const [applicationHistory, registrationHistory] = await Promise.all([
    applicationNumber ? getApplicationFilingHistory(applicationNumber) : Promise.resolve([]),
    getRegistrationFilingHistory(registrationId)
  ])

  const registrationCreatedEvent = FilingHistoryEventName.REGISTRATION_CREATED
  const hasDuplicatedRegistrationCreatedEvent =
    applicationHistory.some(event => event.eventName === registrationCreatedEvent) &&
    registrationHistory.some(event => event.eventName === registrationCreatedEvent)

  if (!hasDuplicatedRegistrationCreatedEvent) {
    return [...applicationHistory, ...registrationHistory]
  }

  return [
    ...applicationHistory.filter(event => event.eventName !== registrationCreatedEvent),
    ...registrationHistory
  ]
}

export const getFilingHistoryAccordionContent = (
  event: FilingHistoryEvent,
  translate: (key: string, params?: Record<string, string>) => string
): string => {
  if (EMAIL_EVENTS.has(event.eventName)) {
    const details = getEmailAccordionDetails(event)
    return details.join('\n')
  }

  if (event.eventName === FilingHistoryEventName.CONDITIONS_OF_APPROVAL_UPDATED) {
    return event.details || translate('label.noApprovalConditions')
  }

  if (event.eventName === FilingHistoryEventName.REGISTRATION_UPDATED) {
    const changes = getRegistrationUpdateChanges(event, translate)
    if (changes.length > 0) {
      return changes.join('\n\n')
    }

    return event.details || translate('label.noRegistrationUpdateDetails')
  }

  return ''
}

export const shouldRenderFilingHistoryAccordion = (event: FilingHistoryEvent): boolean => {
  return EXPANDABLE_EVENTS.has(event.eventName)
}

export const isEmptyFilingHistoryAccordion = (
  event: FilingHistoryEvent,
  translate: (key: string, params?: Record<string, string>) => string
): boolean => {
  if (EMAIL_EVENTS.has(event.eventName)) {
    return getEmailAccordionDetails(event).length === 0
  }

  if (event.eventName === FilingHistoryEventName.CONDITIONS_OF_APPROVAL_UPDATED) {
    return !event.details
  }

  if (event.eventName === FilingHistoryEventName.REGISTRATION_UPDATED) {
    return getRegistrationUpdateChanges(event, translate).length === 0 && !event.details
  }

  return false
}

export const useFilingHistory = async () => {
  const { t } = useI18n()
  const { getApplicationFilingHistory, getRegistrationFilingHistory } = useExaminerStore()
  const { isApplication, activeRecord } = storeToRefs(useExaminerStore())

  const historyTableColumns = [
    { key: 'createdDate', width: 200 },
    { key: 'message' }
  ]

  const record = activeRecord.value as FilingHistoryRecord | null | undefined

  let cacheKey: string
  if (record) {
    cacheKey = isApplication.value
      ? `filing-history-application-${record.header?.applicationNumber || 'unknown'}`
      : `filing-history-registration-${record.id ?? 'unknown'}`
  } else {
    cacheKey = 'filing-history-empty'
  }

  const { data: filingHistory, status } = await useLazyAsyncData<FilingHistoryEvent[]>(
    cacheKey,
    async () => {
      const allFilingHistory = await buildFilingHistory(
        isApplication.value,
        activeRecord.value as FilingHistoryRecord,
        getApplicationFilingHistory,
        getRegistrationFilingHistory
      )

      return sortAndFilterFilingHistory(allFilingHistory)
    },
    { default: () => [] }
  )

  return {
    filingHistory,
    status,
    historyTableColumns,
    isEmailFilingHistoryEvent,
    getEmailFilingHistoryDetails,
    getEmailFilingHistoryTypeLabel,
    shouldRenderFilingHistoryAccordion,
    getFilingHistoryAccordionContent,
    isEmptyFilingHistoryAccordion,
    t
  }
}
