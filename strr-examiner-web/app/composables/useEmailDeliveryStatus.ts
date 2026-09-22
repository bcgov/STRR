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
    if (!EMAIL_EVENTS.has(event.eventName)) {
      continue
    }

    if (!event.structuredDetails || Array.isArray(event.structuredDetails)) {
      continue
    }

    const structured = event.structuredDetails as EmailStructuredDetails
    const recipients = Array.isArray(structured.recipientStatuses) ? structured.recipientStatuses : []

    for (const recipient of recipients) {
      const recipientEmail = recipient.email_address?.trim().toLowerCase()
      if (recipientEmail !== normalizedTarget) {
        continue
      }

      const status = (recipient.status || '').toUpperCase()
      const providerStatus = (recipient.provider_status || '').toUpperCase()
      const failureType = (recipient.failure_type || '').toLowerCase()

      // Check if delivery failed
      const isFailure =
        status === 'FAILED' ||
        event.eventName === FilingHistoryEventName.EMAIL_FAILED ||
        providerStatus === 'PERMANENT_FAILURE' ||
        failureType === 'permanent'

      // Exclude temporary or technical delivery problems that do not indicate an invalid email
      const isTransientFailure =
        providerStatus === 'TEMPORARY_FAILURE' ||
        providerStatus === 'TECHNICAL_FAILURE' ||
        failureType === 'temporary' ||
        failureType === 'technical'

      if (isFailure && !isTransientFailure) {
        hasResolved = false
        latestFailedEvent = event
        latestFailureReason = recipient.failure_reason || undefined
        latestFailureType = recipient.provider_status || recipient.failure_type || 'PERMANENT_FAILURE'
      } else if (
        status === 'DELIVERED' ||
        status === 'SENT' ||
        event.eventName === FilingHistoryEventName.EMAIL_DELIVERED
      ) {
        // Success after failure clears the flag
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

/**
 * Reactive composable for tracking email delivery failure status from the examiner store.
 */
export const useEmailDeliveryStatus = (
  emailAddress: MaybeRefOrGetter<string | undefined | null>
): EmailDeliveryStatusResult => {
  const examinerStore = useExaminerStore()

  const matchingEvaluation = computed(() => {
    const rawEmail = toValue(emailAddress)
    const rawEvents = examinerStore?.filingHistoryEvents
    const events: FilingHistoryEvent[] = (
      rawEvents && typeof rawEvents === 'object' && 'value' in rawEvents
        ? (rawEvents as Ref<FilingHistoryEvent[]>).value
        : Array.isArray(rawEvents) ? rawEvents : []
    ) || []

    return evaluateEmailDeliveryStatus(rawEmail, events)
  })

  return {
    isEmailFailed: computed(() => matchingEvaluation.value.isFailed),
    failureReason: computed(() => matchingEvaluation.value.reason),
    failureType: computed(() => matchingEvaluation.value.type),
    failedEvent: computed(() => matchingEvaluation.value.event)
  }
}
