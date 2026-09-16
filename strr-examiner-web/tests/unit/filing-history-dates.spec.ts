import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FilingHistory from '~/components/Host/Expansion/FilingHistory.vue'

const history = vi.hoisted(() => ({ createdDate: '' }))

vi.mock('~/composables/useFilingHistory', () => ({
  useFilingHistory: () => ({
    filingHistory: [{ createdDate: history.createdDate, eventName: 'REGISTRATION_CREATED' }],
    status: 'success',
    historyTableColumns: [{ key: 'createdDate' }, { key: 'message' }],
    isEmailFilingHistoryEvent: () => false,
    getEmailFilingHistoryDetails: vi.fn(),
    getEmailFilingHistoryTypeLabel: vi.fn(),
    shouldRenderFilingHistoryAccordion: () => false,
    getFilingHistoryAccordionContent: vi.fn(),
    isEmptyFilingHistoryAccordion: () => true
  })
}))

enableAutoUnmount(afterEach)

describe('filing history Pacific dates', () => {
  it.each([
    { input: '2025-01-01T01:30:00', date: 'dec 31, 2024', time: '5:30 pm' },
    { input: '2025-07-01T19:00:00Z', date: 'jul 01, 2025', time: '12:00 pm' },
    { input: '2025-03-09T09:59:00Z', date: 'mar 09, 2025', time: '1:59 am' },
    { input: '2025-03-09T10:00:00Z', date: 'mar 09, 2025', time: '3:00 am' }
  ])('renders $input in Pacific time', async ({ input, date, time }) => {
    history.createdDate = input
    const wrapper = await mountSuspended(FilingHistory)

    const displayed = wrapper.get('tbody tr td').text()
    expect(displayed).toContain(date)
    expect(displayed).toContain(time)
  })
})
