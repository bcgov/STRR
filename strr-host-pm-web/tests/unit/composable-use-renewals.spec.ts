import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { DateTime } from 'luxon'
import { mockHostRegistration } from '../mocks/mockedData'
import { emptyTodoRegistration } from './helpers/renewal-test-utils'

const mockRegistration = ref<HostRegistrationResp | null>(null)

mockNuxtImport('storeToRefs', () => (_store: any) => ({ registration: mockRegistration }))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: vi.fn(() => ({}))
}))

const mockGetTodoRegistration = vi.fn()

vi.mock('#baseWeb/utils/todoItems', () => ({
  getTodoRegistration: (...args: unknown[]) => mockGetTodoRegistration(...args)
}))

function resetState () {
  mockRegistration.value = null
  mockGetTodoRegistration.mockClear()
  mockGetTodoRegistration.mockResolvedValue(emptyTodoRegistration)
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
