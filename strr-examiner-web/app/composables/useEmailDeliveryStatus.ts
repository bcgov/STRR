export interface EmailDeliveryEvaluation {
  isFailed: boolean
  reason?: string
  type?: string
  event: FilingHistoryEvent | null
}

export interface EmailDeliveryStatusResult {
  isEmailFailed: ComputedRef<boolean>
  failureReason: ComputedRef<string | undefined>
  failureType: ComputedRef<string | undefined>
  failedEvent: ComputedRef<FilingHistoryEvent | null>
}

const getEmailEventRecipients = (event: FilingHistoryEvent): EmailRecipientStatus[] => {
  if (!EMAIL_EVENTS.has(event.eventName)) {
    return []
  }

  if (!event.structuredDetails || Array.isArray(event.structuredDetails)) {
    return []
  }

  const structured = event.structuredDetails as EmailStructuredDetails
  return Array.isArray(structured.recipientStatuses) ? structured.recipientStatuses : []
}

const FAILURE_TYPE_TOKENS = new Set([
  'PERMANENT',
  'TEMPORARY',
  'TECHNICAL',
  'PERMANENT_FAILURE',
  'TEMPORARY_FAILURE',
  'TECHNICAL_FAILURE',
  'PERMANENT_BOUNCE',
  'MAILBOX_FULL',
  'GATEWAY_ERROR',
  'SUPPRESSION_LIST'
])

export const hasRecordEmailDeliveryFailure = (record: any): boolean => {
  return Boolean(
    record?.header?.hasEmailDeliveryFailure ||
    record?.header?.has_email_delivery_failure ||
    record?.hasEmailDeliveryFailure ||
    record?.has_email_delivery_failure
  )
}

const isDeliveryFailure = (recipient: EmailRecipientStatus): boolean => {
  const status = (recipient.status || '').toUpperCase()
  const providerStatus = (recipient.provider_status || '').toUpperCase()
  const failureType = (recipient.failure_type || '').toUpperCase()

  return (
    FAILURE_RECIPIENT_STATUSES.has(status) ||
    FAILURE_RECIPIENT_STATUSES.has(providerStatus) ||
    providerStatus === 'VIRUS_SCAN_FAILED' ||
    FAILURE_TYPE_TOKENS.has(failureType)
  )
}

const isSuccessfulDelivery = (recipient: EmailRecipientStatus): boolean => {
  const status = (recipient.status || '').toUpperCase()
  const providerStatus = (recipient.provider_status || '').toUpperCase()

  return (
    status === 'DELIVERED' ||
    status === 'SENT' ||
    providerStatus === 'DELIVERED' ||
    providerStatus === 'SENT'
  )
}

/**
 * Pure evaluation function checking if a target email address has an unresolved delivery failure.
 *
 * @param emailAddress - The target email address to evaluate.
 * @param events - Chronological or un-ordered list of filing history events.
 * @returns EmailDeliveryEvaluation
 */
export const evaluateEmailDeliveryStatus = (
  emailAddress: string | undefined | null,
  events: FilingHistoryEvent[] = []
): EmailDeliveryEvaluation => {
  if (!emailAddress || typeof emailAddress !== 'string') {
    return { isFailed: false, reason: undefined, type: undefined, event: null }
  }

  const normalizedTarget = emailAddress.trim().toLowerCase()
  if (!normalizedTarget || !events.length) {
    return { isFailed: false, reason: undefined, type: undefined, event: null }
  }

  // Sort events in chronological order (oldest to newest)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
  )

  let latestFailedEvent: FilingHistoryEvent | null = null
  let latestFailureReason: string | undefined
  let latestFailureType: string | undefined
  let hasResolved = true

  for (const event of sortedEvents) {
    const recipients = getEmailEventRecipients(event)

    for (const recipient of recipients) {
      const recipientEmail = recipient.email_address?.trim().toLowerCase()
      if (recipientEmail !== normalizedTarget) {
        continue
      }

      if (isDeliveryFailure(recipient)) {
        hasResolved = false
        latestFailedEvent = event
        latestFailureReason = recipient.failure_reason || undefined
        latestFailureType = recipient.provider_status || recipient.failure_type || 'FAILED'
      } else if (isSuccessfulDelivery(recipient)) {
        hasResolved = true
        latestFailedEvent = null
        latestFailureReason = undefined
        latestFailureType = undefined
      }
    }
  }

  return {
    isFailed: !hasResolved && latestFailedEvent !== null,
    reason: latestFailureReason,
    type: latestFailureType,
    event: latestFailedEvent
  }
}

const extractFilingHistoryEvents = (rawEvents: unknown): FilingHistoryEvent[] => {
  if (Array.isArray(rawEvents)) {
    return rawEvents
  }

  if (rawEvents && typeof rawEvents === 'object' && 'value' in rawEvents) {
    const value = (rawEvents as { value: unknown }).value
    if (Array.isArray(value)) {
      return value as FilingHistoryEvent[]
    }
  }

  return []
}

/**
 * Reactive composable for tracking email delivery failure status from the examiner store.
 */
export const useEmailDeliveryStatus = (
  emailAddress: MaybeRefOrGetter<string | undefined | null>
): EmailDeliveryStatusResult => {
  const examinerStore = useExaminerStore()

  const matchingEvaluation = computed(() => {
    const rawEmail = toValue(emailAddress)
    const events = extractFilingHistoryEvents(examinerStore?.filingHistoryEvents)

    return evaluateEmailDeliveryStatus(rawEmail, events)
  })

  return {
    isEmailFailed: computed(() => matchingEvaluation.value.isFailed),
    failureReason: computed(() => matchingEvaluation.value.reason),
    failureType: computed(() => matchingEvaluation.value.type),
    failedEvent: computed(() => matchingEvaluation.value.event)
  }
}
