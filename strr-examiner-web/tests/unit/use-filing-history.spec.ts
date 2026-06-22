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
})
