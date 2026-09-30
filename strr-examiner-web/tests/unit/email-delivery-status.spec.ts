import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useEmailDeliveryStatus } from '~/composables/useEmailDeliveryStatus'
import { useExaminerStore } from '~/stores/examiner'
import { FilingHistoryEventName, FilingHistoryEventType } from '~/enums/filing-history'
import type { FilingHistoryEvent } from '~/interfaces/filing-history-event'

describe('useEmailDeliveryStatus Composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createEmailEvent = (
    eventName: FilingHistoryEventName,
    createdDate: string,
    recipientStatuses: Array<{
      email_address?: string
      status?: string
      provider_status?: string
      failure_type?: string | null
      failure_reason?: string | null
    }>
  ): FilingHistoryEvent => ({
    eventName,
    eventType: FilingHistoryEventType.APPLICATION,
    createdDate,
    message: 'Email event',
    details: null,
    idir: null,
    structuredDetails: {
      emailType: 'HOST_FULL_REVIEW_APPROVED',
      interactionStatus: eventName === FilingHistoryEventName.EMAIL_FAILED ? 'FAILED' : 'DELIVERED',
      recipientStatuses
    }
  })

  it('should flag an email when recipient status is FAILED / PERMANENT_FAILURE', () => {
    const store = useExaminerStore()
    const failedEvent = createEmailEvent(
      FilingHistoryEventName.EMAIL_FAILED,
      '2026-07-08T10:00:00Z',
      [
        {
          email_address: 'invalid-host@example.com',
          status: 'FAILED',
          provider_status: 'PERMANENT_FAILURE',
          failure_type: 'permanent',
          failure_reason: 'Mailbox unavailable'
        }
      ]
    )
    store.filingHistoryEvents = [failedEvent]

    const targetEmail = ref('invalid-host@example.com')
    const { isEmailFailed, failureReason, failureType, failedEvent: matchedEvent } = useEmailDeliveryStatus(targetEmail)

    expect(isEmailFailed.value).toBe(true)
    expect(failureReason.value).toBe('Mailbox unavailable')
    expect(failureType.value).toBe('PERMANENT_FAILURE')
    expect(matchedEvent.value).toEqual(failedEvent)
  })

  it('should match email address case-insensitively and ignore surrounding whitespace', () => {
    const store = useExaminerStore()
    store.filingHistoryEvents = [
      createEmailEvent(
        FilingHistoryEventName.EMAIL_FAILED,
        '2026-07-08T10:00:00Z',
        [
          {
            email_address: 'User.Test@Example.COM',
            status: 'FAILED',
            provider_status: 'PERMANENT_FAILURE',
            failure_reason: 'Domain not found'
          }
        ]
      )
    ]

    const targetEmail = ref('  user.test@example.com  ')
    const { isEmailFailed, failureReason } = useEmailDeliveryStatus(targetEmail)

    expect(isEmailFailed.value).toBe(true)
    expect(failureReason.value).toBe('Domain not found')
  })

  it('should NOT flag an email when latest status is DELIVERED', () => {
    const store = useExaminerStore()
    store.filingHistoryEvents = [
      createEmailEvent(
        FilingHistoryEventName.EMAIL_DELIVERED,
        '2026-07-08T10:00:00Z',
        [
          {
            email_address: 'valid-host@example.com',
            status: 'DELIVERED',
            provider_status: 'DELIVERED'
          }
        ]
      )
    ]

    const targetEmail = ref('valid-host@example.com')
    const { isEmailFailed, failedEvent } = useEmailDeliveryStatus(targetEmail)

    expect(isEmailFailed.value).toBe(false)
    expect(failedEvent.value).toBeNull()
  })

  it('should NOT flag on transient failures (TEMPORARY_FAILURE / TECHNICAL_FAILURE)', () => {
    const store = useExaminerStore()
    store.filingHistoryEvents = [
      createEmailEvent(
        FilingHistoryEventName.EMAIL_FAILED,
        '2026-07-08T10:00:00Z',
        [
          {
            email_address: 'temp-issue@example.com',
            status: 'FAILED',
            provider_status: 'TEMPORARY_FAILURE',
            failure_type: 'temporary',
            failure_reason: 'Inbox is full'
          }
        ]
      )
    ]

    const targetEmail = ref('temp-issue@example.com')
    const { isEmailFailed } = useEmailDeliveryStatus(targetEmail)

    expect(isEmailFailed.value).toBe(false)
  })

  it('should clear the flag when a subsequent event for the same email is DELIVERED', () => {
    const store = useExaminerStore()
    const failedEvent = createEmailEvent(
      FilingHistoryEventName.EMAIL_FAILED,
      '2026-07-08T10:00:00Z',
      [
        {
          email_address: 'retry@example.com',
          status: 'FAILED',
          provider_status: 'PERMANENT_FAILURE',
          failure_reason: 'Initial fail'
        }
      ]
    )
    const deliveredEvent = createEmailEvent(
      FilingHistoryEventName.EMAIL_DELIVERED,
      '2026-07-08T11:00:00Z',
      [
        {
          email_address: 'retry@example.com',
          status: 'DELIVERED',
          provider_status: 'DELIVERED'
        }
      ]
    )
    store.filingHistoryEvents = [failedEvent, deliveredEvent]

    const targetEmail = ref('retry@example.com')
    const { isEmailFailed, failedEvent: matchedEvent } = useEmailDeliveryStatus(targetEmail)

    expect(isEmailFailed.value).toBe(false)
    expect(matchedEvent.value).toBeNull()
  })

  it('should clear the flag when email address changes to a new address', () => {
    const store = useExaminerStore()
    store.filingHistoryEvents = [
      createEmailEvent(
        FilingHistoryEventName.EMAIL_FAILED,
        '2026-07-08T10:00:00Z',
        [
          {
            email_address: 'old-bad-email@example.com',
            status: 'FAILED',
            provider_status: 'PERMANENT_FAILURE',
            failure_reason: 'Mailbox does not exist'
          }
        ]
      )
    ]

    const targetEmail = ref('old-bad-email@example.com')
    const { isEmailFailed } = useEmailDeliveryStatus(targetEmail)

    expect(isEmailFailed.value).toBe(true)

    // Examiner updates email address
    targetEmail.value = 'new-valid-email@example.com'
    expect(isEmailFailed.value).toBe(false)
  })

  it('should handle multiple recipients in single event properly', () => {
    const store = useExaminerStore()
    store.filingHistoryEvents = [
      createEmailEvent(
        FilingHistoryEventName.EMAIL_SENT,
        '2026-07-08T10:00:00Z',
        [
          {
            email_address: 'good-recipient@example.com',
            status: 'DELIVERED',
            provider_status: 'DELIVERED'
          },
          {
            email_address: 'bad-recipient@example.com',
            status: 'FAILED',
            provider_status: 'PERMANENT_FAILURE',
            failure_reason: 'Invalid address'
          }
        ]
      )
    ]

    const goodStatus = useEmailDeliveryStatus('good-recipient@example.com')
    expect(goodStatus.isEmailFailed.value).toBe(false)

    const badStatus = useEmailDeliveryStatus('bad-recipient@example.com')
    expect(badStatus.isEmailFailed.value).toBe(true)
    expect(badStatus.failureReason.value).toBe('Invalid address')
  })

  it('should return isEmailFailed=false for null or empty email or empty events', () => {
    const store = useExaminerStore()
    store.filingHistoryEvents = []

    const nullStatus = useEmailDeliveryStatus(null)
    expect(nullStatus.isEmailFailed.value).toBe(false)

    const emptyStatus = useEmailDeliveryStatus('')
    expect(emptyStatus.isEmailFailed.value).toBe(false)
  })
})

describe('evaluateEmailDeliveryStatus pure function', () => {
  const failedEvent: FilingHistoryEvent = {
    eventName: FilingHistoryEventName.EMAIL_FAILED,
    eventType: FilingHistoryEventType.APPLICATION,
    createdDate: '2026-07-08T10:00:00Z',
    message: 'Email failed',
    details: null,
    idir: null,
    structuredDetails: {
      emailType: 'HOST_FULL_REVIEW_REJECTED',
      interactionStatus: 'FAILED',
      recipientStatuses: [
        {
          email_address: 'pure-test@example.com',
          status: 'FAILED',
          provider_status: 'PERMANENT_FAILURE',
          failure_reason: 'User unknown'
        }
      ]
    }
  }

  it('evaluates failure accurately without Pinia or Vue reactivity', () => {
    const res = evaluateEmailDeliveryStatus('pure-test@example.com', [failedEvent])
    expect(res.isFailed).toBe(true)
    expect(res.reason).toBe('User unknown')
    expect(res.type).toBe('PERMANENT_FAILURE')
    expect(res.event).toEqual(failedEvent)
  })

  it('handles empty input gracefully', () => {
    expect(evaluateEmailDeliveryStatus(null, [failedEvent]).isFailed).toBe(false)
    expect(evaluateEmailDeliveryStatus('', [failedEvent]).isFailed).toBe(false)
    expect(evaluateEmailDeliveryStatus('pure-test@example.com', []).isFailed).toBe(false)
  })
})
