import { describe, expect, it, vi } from 'vitest'
import {
  mockApplicationFilingHistory,
  mockRegistrationFilingHistory
} from '../mocks/mockedData'
import {
  FilingHistoryEventName,
  FilingHistoryEventType
} from '~/enums/filing-history'

describe('useFilingHistory helpers', () => {
  const t = vi.fn((key: string, params?: Record<string, string>) => {
    if (!params) {
      return key
    }

    return `${key}:${Object.entries(params)
      .map(([name, value]) => `${name}=${value}`)
      .join(',')}`
  })

  // eslint-disable-next-line max-len
  it('merges registration and application history, removes duplicate registration created events, and filters hidden events', async () => {
    const { buildFilingHistory, sortAndFilterFilingHistory } =
      await import('~/composables/useFilingHistory')

    const applicationHistory = [
      ...mockApplicationFilingHistory,
      {
        createdDate: '2025-03-21T16:45:00.000000',
        eventName: FilingHistoryEventName.REGISTRATION_CREATED,
        eventType: FilingHistoryEventType.REGISTRATION,
        idir: null,
        message: 'Registration created from application',
        details: null,
        structuredDetails: null
      }
    ]

    const merged = await buildFilingHistory(
      false,
      {
        id: 123,
        header: {
          applications: [{ applicationNumber: '1234567890' }]
        }
      },
      vi.fn().mockResolvedValue(applicationHistory),
      vi.fn().mockResolvedValue(mockRegistrationFilingHistory)
    )

    const normalized = sortAndFilterFilingHistory(merged)

    expect(normalized).toHaveLength(6)
    expect(
      normalized.find(
        event =>
          event.eventName === FilingHistoryEventName.AUTO_APPROVAL_FULL_REVIEW
      )
    ).toBeUndefined()
    expect(
      normalized.filter(
        event =>
          event.eventName === FilingHistoryEventName.REGISTRATION_CREATED
      )
    ).toHaveLength(1)
  })

  it('formats structured registration changes into readable sentences', async () => {
    const { getFilingHistoryAccordionContent, isEmptyFilingHistoryAccordion } =
      await import('~/composables/useFilingHistory')

    const content = getFilingHistoryAccordionContent(
      {
        createdDate: '2025-03-21T16:44:07.559788',
        eventName: FilingHistoryEventName.REGISTRATION_UPDATED,
        eventType: FilingHistoryEventType.REGISTRATION,
        idir: null,
        message: 'Registration updated',
        details: null,
        structuredDetails: {
          changes: [
            {
              field: 'primaryContact.emailAddress',
              oldValue: 'old@example.com',
              newValue: 'new@example.com'
            }
          ]
        }
      },
      t
    )

    expect(content).toContain('filingHistoryChangeLog.template')
    expect(content).toContain('old@example.com')
    expect(content).toContain('new@example.com')
    expect(
      isEmptyFilingHistoryAccordion(
        {
          createdDate: '2025-03-21T16:44:07.559788',
          eventName: FilingHistoryEventName.REGISTRATION_UPDATED,
          eventType: FilingHistoryEventType.REGISTRATION,
          idir: null,
          message: 'Registration updated',
          details: null,
          structuredDetails: {
            changes: []
          }
        },
        t
      )
    ).toBe(true)
  })

  it('uses friendly fallback text for unserializable change values', async () => {
    const { getFilingHistoryAccordionContent } =
      await import('~/composables/useFilingHistory')

    const circular: Record<string, unknown> = {}
    circular.self = circular

    const content = getFilingHistoryAccordionContent(
      {
        createdDate: '2025-03-21T16:44:07.559788',
        eventName: FilingHistoryEventName.REGISTRATION_UPDATED,
        eventType: FilingHistoryEventType.REGISTRATION,
        idir: null,
        message: 'Registration updated',
        details: null,
        structuredDetails: {
          changes: [
            {
              field: 'primaryContact.emailAddress',
              oldValue: circular,
              newValue: 'new@example.com'
            }
          ]
        }
      },
      t
    )

    expect(content).toContain('filingHistoryChangeLog.unavailableValue')
  })

  it('renders email delivered accordion details with human-readable email type and sent date', async () => {
    const {
      getFilingHistoryAccordionContent,
      shouldRenderFilingHistoryAccordion,
      isEmptyFilingHistoryAccordion
    } = await import('~/composables/useFilingHistory')

    const event = {
      createdDate: '2026-07-08T20:53:21.399598+00:00',
      eventName: FilingHistoryEventName.EMAIL_DELIVERED,
      eventType: FilingHistoryEventType.APPLICATION,
      idir: null,
      message: 'Email delivered',
      details: null,
      structuredDetails: {
        emailType: 'HOST_FULL_REVIEW_APPROVED',
        interactionStatus: 'DELIVERED',
        recipientStatuses: [
          {
            email_address: 'karim.jazzar@gov.bc.ca',
            status: 'SENT',
            sent_date: '2026-06-09T22:23:11.714837',
            provider_status: 'sent'
          }
        ]
      }
    }

    const content = getFilingHistoryAccordionContent(event, t)
    expect(shouldRenderFilingHistoryAccordion(event)).toBe(true)
    expect(isEmptyFilingHistoryAccordion(event, t)).toBe(false)
    expect(content).toContain('Email type: Host full review approved')
    expect(content).toContain('karim.jazzar@gov.bc.ca')
    expect(content).toContain('Status: Sent')
    expect(content).toContain('Sent: 2026-06-09T22:23:11.714837')
  })

  it('renders email failed accordion details with failure reason', async () => {
    const { getFilingHistoryAccordionContent } =
      await import('~/composables/useFilingHistory')

    const event = {
      createdDate: '2026-07-08T20:53:21.399598+00:00',
      eventName: FilingHistoryEventName.EMAIL_FAILED,
      eventType: FilingHistoryEventType.REGISTRATION,
      idir: null,
      message: 'Email failed',
      details: null,
      structuredDetails: {
        emailType: 'HOST_RENEWAL_REMINDER',
        interactionStatus: 'FAILED',
        recipientStatuses: [
          {
            email_address: 'test@example.com',
            status: 'FAILED',
            failure_reason: 'Mailbox unavailable',
            provider_status: 'permanent-failure'
          },
          {
            email_address: 'delivered@example.com',
            status: 'SENT',
            sent_date: '2026-06-09T22:23:11.714837',
            provider_status: 'sent'
          }
        ]
      }
    }

    const content = getFilingHistoryAccordionContent(event, t)
    expect(content).toContain('Email type: Host renewal reminder')
    expect(content).toContain('test@example.com')
    expect(content).toContain('Status: Failed')
    expect(content).toContain('Failure reason: Mailbox unavailable')
    expect(content).toContain('delivered@example.com')
    expect(content).toContain('Status: Sent')
    expect(content).toContain('Sent: 2026-06-09T22:23:11.714837')
  })

  it('returns email type label for email events used in history row headers', async () => {
    const { getEmailFilingHistoryTypeLabel } =
      await import('~/composables/useFilingHistory')

    const event = {
      createdDate: '2026-07-08T20:53:21.399598+00:00',
      eventName: FilingHistoryEventName.EMAIL_DELIVERED,
      eventType: FilingHistoryEventType.APPLICATION,
      idir: null,
      message: 'Email delivered',
      details: null,
      structuredDetails: {
        emailType: 'HOST_FULL_REVIEW_APPROVED',
        interactionStatus: 'DELIVERED',
        recipientStatuses: []
      }
    }

    expect(getEmailFilingHistoryTypeLabel(event)).toBe('Host full review approved')
  })

  it('returns empty email type label for non-email events', async () => {
    const { getEmailFilingHistoryTypeLabel } =
      await import('~/composables/useFilingHistory')

    const event = {
      createdDate: '2026-07-08T20:53:21.399598+00:00',
      eventName: FilingHistoryEventName.MANUALLY_APPROVED,
      eventType: FilingHistoryEventType.APPLICATION,
      idir: null,
      message: 'Application approved by staff',
      details: null,
      structuredDetails: null
    }

    expect(getEmailFilingHistoryTypeLabel(event)).toBe('')
  })
})
