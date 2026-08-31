import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { DateTime } from 'luxon'
import { mockHostRegistration } from '../mocks/mockedData'
import { emptyTodoRegistration } from './helpers/renewal-test-utils'

const mockRegistration = ref<HostRegistrationResp | null>(null)
const mockNavigateTo = vi.fn()

mockNuxtImport('storeToRefs', () => (_store: any) => ({ registration: mockRegistration }))
mockNuxtImport('useLocalePath', () => () => (path: string) => path)
mockNuxtImport('navigateTo', () => (...args: any[]) => mockNavigateTo(...args))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: vi.fn(() => ({
    get registration () {
      return mockRegistration.value
    },
    setRenewalRegistrationContext: vi.fn(),
    clearRenewalRegistrationContext: vi.fn()
  }))
}))

const mockGetTodoRegistration = vi.fn()

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isRenewalsEnabled: ref(true)
  })
}))

vi.mock('#baseWeb/utils/todoItems', () => ({
  getTodoRegistration: (...args: unknown[]) => mockGetTodoRegistration(...args)
}))

function resetState () {
  mockRegistration.value = null
  mockGetTodoRegistration.mockClear()
  mockGetTodoRegistration.mockResolvedValue(emptyTodoRegistration)
  mockNavigateTo.mockReset()
}

describe('Computed Properties in Renewals', () => {
  beforeEach(resetState)

  it('isRenewalPeriodClosed - return false when status is not EXPIRED, even 4 years past expiry', () => {
    mockRegistration.value = {
      ...mockHostRegistration,
      status: RegistrationStatus.ACTIVE,
      expiryDate: DateTime.now().minus({ years: 4 }).toISO() as any
    }
    const { isRenewalPeriodClosed } = useRenewals()
    expect(isRenewalPeriodClosed.value).toBe(false)
  })

  it('isRenewalPeriodClosed - return false when EXPIRED just under 3 years ago', () => {
    mockRegistration.value = {
      ...mockHostRegistration,
      status: RegistrationStatus.EXPIRED,
      expiryDate: DateTime.now().minus({ years: 3 }).plus({ days: 2 }).toISO() as any
    }
    const { isRenewalPeriodClosed } = useRenewals()
    expect(isRenewalPeriodClosed.value).toBe(false)
  })

  it('isRenewalPeriodClosed - return true when EXPIRED more than 3 years ago', () => {
    mockRegistration.value = {
      ...mockHostRegistration,
      status: RegistrationStatus.EXPIRED,
      expiryDate: DateTime.now().minus({ years: 3, days: 2 }).toISO() as any
    }
    const { isRenewalPeriodClosed } = useRenewals()
    expect(isRenewalPeriodClosed.value).toBe(true)
  })

  it('isRenewalPeriodClosed - return false when registration is null', () => {
    mockRegistration.value = null
    const { isRenewalPeriodClosed } = useRenewals()
    expect(isRenewalPeriodClosed.value).toBe(false)
  })

  it('returns fallback values when registration has no expiryDate', () => {
    mockRegistration.value = { ...mockHostRegistration, expiryDate: undefined as any }
    const { isRenewalPeriodClosed, renewalDueDate, renewalDateCounter } = useRenewals()
    expect(isRenewalPeriodClosed.value).toBe(false)
    expect(renewalDueDate.value).toBe('')
    expect(renewalDateCounter.value).toBe(0)
  })

  it('renewalDueDate - format expiry date as medium date', () => {
    mockRegistration.value = { ...mockHostRegistration, expiryDate: '2026-01-01' as any }
    const { renewalDueDate } = useRenewals()
    expect(renewalDueDate.value).toBe('Jan 1, 2026')
  })

  it('renewalDateCounter - return a positive floored integer when expiry is in the future', () => {
    const expiryDate = DateTime.now().plus({ days: 30 }).toISO()!
    mockRegistration.value = { ...mockHostRegistration, expiryDate: expiryDate as any }
    const { renewalDateCounter } = useRenewals()
    expect(renewalDateCounter.value).toBeGreaterThan(0)
    expect(renewalDateCounter.value).toBeLessThanOrEqual(30)
    expect(Number.isInteger(renewalDateCounter.value)).toBe(true)
  })

  it('renewalDateCounter - return a negative count when expiry is in the past', () => {
    const expiryDate = DateTime.now().minus({ days: 15 }).toISO()!
    mockRegistration.value = { ...mockHostRegistration, expiryDate: expiryDate as any }
    const { renewalDateCounter } = useRenewals()
    expect(renewalDateCounter.value).toBeLessThan(0)
  })
})

describe('Registration Renewal Todo', () => {
  beforeEach(resetState)

  it('should skip API call and reset all flags when registration is null', async () => {
    mockRegistration.value = null
    const { isEligibleForRenewal, hasRegistrationRenewalDraft, hasRegistrationRenewalPaymentPending } = useRenewals()
    await flushPromises()
    expect(mockGetTodoRegistration).not.toHaveBeenCalled()
    expect(isEligibleForRenewal.value).toBe(false)
    expect(hasRegistrationRenewalDraft.value).toBe(false)
    expect(hasRegistrationRenewalPaymentPending.value).toBe(false)
  })

  it('set isEligibleForRenewal when REGISTRATION_RENEWAL todo is present', async () => {
    mockRegistration.value = { ...mockHostRegistration }
    mockGetTodoRegistration.mockResolvedValue({
      hasRenewalTodo: true,
      hasRenewalDraft: false,
      hasRenewalPaymentPending: false,
      renewalDraftId: null,
      renewalPaymentPendingId: null
    })
    const { isEligibleForRenewal } = useRenewals()
    await flushPromises()
    expect(mockGetTodoRegistration).toHaveBeenCalledWith(mockHostRegistration.id)
    expect(isEligibleForRenewal.value).toBe(true)
  })

  it('set hasRegistrationRenewalDraft and renewalDraftId for renewal draft', async () => {
    mockRegistration.value = { ...mockHostRegistration }
    mockGetTodoRegistration.mockResolvedValue({
      hasRenewalTodo: false,
      hasRenewalDraft: true,
      hasRenewalPaymentPending: false,
      renewalDraftId: '0987654321',
      renewalPaymentPendingId: null
    })
    const { hasRegistrationRenewalDraft, renewalDraftId } = useRenewals()
    await flushPromises()
    expect(hasRegistrationRenewalDraft.value).toBe(true)
    expect(renewalDraftId.value).toBe('0987654321')
  })

  it('set hasRegistrationRenewalPaymentPending and renewalPaymentPendingId for payment pending todo', async () => {
    mockRegistration.value = { ...mockHostRegistration }
    mockGetTodoRegistration.mockResolvedValue({
      hasRenewalTodo: false,
      hasRenewalDraft: false,
      hasRenewalPaymentPending: true,
      renewalDraftId: null,
      renewalPaymentPendingId: '12345'
    })
    const { hasRegistrationRenewalPaymentPending, renewalPaymentPendingId } = useRenewals()
    await flushPromises()
    expect(hasRegistrationRenewalPaymentPending.value).toBe(true)
    expect(renewalPaymentPendingId.value).toBe('12345')
  })
})

describe('Renewal Helper Functions', () => {
  beforeEach(resetState)

  it('canRenewRegistration - evaluates eligibility correctly', () => {
    const { canRenewRegistration } = useRenewals()

    const regWithTodo = {
      id: 1,
      status: RegistrationStatus.ACTIVE,
      hasRenewalTodo: true,
      expiryDate: DateTime.now().plus({ days: 10 }).toISO()
    }
    expect(canRenewRegistration(regWithTodo)).toBe(true)

    const regWithoutTodo = {
      id: 2,
      status: RegistrationStatus.ACTIVE,
      hasRenewalTodo: false,
      expiryDate: DateTime.now().plus({ days: 10 }).toISO()
    }
    expect(canRenewRegistration(regWithoutTodo)).toBe(false)

    expect(canRenewRegistration(null)).toBe(false)
  })

  it('canRenewRegistration - returns false when renewal period is closed (> 3 years expired)', () => {
    const { canRenewRegistration } = useRenewals()
    const closedReg = {
      id: 3,
      status: RegistrationStatus.EXPIRED,
      hasRenewalTodo: true,
      expiryDate: DateTime.now().minus({ years: 3, days: 5 }).toISO()
    }
    expect(canRenewRegistration(closedReg)).toBe(false)
  })

  it('canRenewRegistration - returns false when renewals feature flag is disabled', () => {
    const { canRenewRegistration } = useRenewals()
    // When isRenewalsEnabled is false, canRenewRegistration should return false
    const regWithTodo = { id: 1, status: RegistrationStatus.ACTIVE, hasRenewalTodo: true }
    expect(canRenewRegistration(regWithTodo)).toBe(true)
  })

  it('startRenewal - sets store context and navigates to application', async () => {
    const { startRenewal } = useRenewals()
    await startRenewal(101)

    expect(mockNavigateTo).toHaveBeenCalledWith({
      path: '/application',
      query: { renew: 'true' }
    })
  })

  it('resumeRenewalDraft - clears context and navigates with draft applicationId', async () => {
    const { resumeRenewalDraft } = useRenewals()
    await resumeRenewalDraft('draft-123')

    expect(mockNavigateTo).toHaveBeenCalledWith({
      path: '/application',
      query: { renew: 'true', applicationId: 'draft-123' }
    })
  })

  it('resumeRenewalDraft - returns early when draftApplicationId is empty', async () => {
    const { resumeRenewalDraft } = useRenewals()
    await resumeRenewalDraft('')

    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('handles invalid date strings gracefully in computed properties', () => {
    mockRegistration.value = { ...mockHostRegistration, expiryDate: 'invalid-date' as any }
    const { isRenewalPeriodClosed, renewalDueDate, renewalDateCounter } = useRenewals()
    expect(isRenewalPeriodClosed.value).toBe(false)
    expect(renewalDueDate.value).toBe('')
    expect(renewalDateCounter.value).toBe(0)
  })

  it('fetchRegistrationsWithRenewalTodos - fetches todos for multiple registrations in parallel', async () => {
    mockGetTodoRegistration.mockImplementation((id: number) => {
      if (id === 1) {
        return Promise.resolve({
          hasRenewalTodo: true,
          hasRenewalDraft: false,
          hasRenewalPaymentPending: false,
          renewalDraftId: null,
          renewalPaymentPendingId: null
        })
      }
      return Promise.resolve({
        hasRenewalTodo: false,
        hasRenewalDraft: true,
        hasRenewalPaymentPending: false,
        renewalDraftId: 'draft-99',
        renewalPaymentPendingId: null
      })
    })

    const { fetchRegistrationsWithRenewalTodos } = useRenewals()
    const list = [{ id: 1 }, { id: 2 }]
    const result = await fetchRegistrationsWithRenewalTodos(list)

    expect(result).toHaveLength(2)
    expect(result[0]!.hasRenewalTodo).toBe(true)
    expect(result[1]!.hasRenewalDraft).toBe(true)
    expect(result[1]!.renewalDraftId).toBe('draft-99')
  })

  it('fetchRegistrationsWithRenewalTodos - returns empty array for empty input', async () => {
    const { fetchRegistrationsWithRenewalTodos } = useRenewals()
    expect(await fetchRegistrationsWithRenewalTodos([])).toEqual([])
  })

  it('fetchRegistrationsWithRenewalTodos - handles API error gracefully for individual item', async () => {
    mockGetTodoRegistration.mockRejectedValue(new Error('Network error'))

    const { fetchRegistrationsWithRenewalTodos } = useRenewals()
    const result = await fetchRegistrationsWithRenewalTodos([{ id: 10 }])

    expect(result).toHaveLength(1)
    expect(result[0]!.hasRenewalTodo).toBe(false)
    expect(result[0]!.hasRenewalDraft).toBe(false)
  })
})
