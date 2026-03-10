import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { DateTime } from 'luxon'
import { mockHostRegistration } from '../mocks/mockedData'

const mockRegistration = ref<HostRegistrationResp | null>(null)

mockNuxtImport('storeToRefs', () => (_store: any) => ({ registration: mockRegistration }))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: vi.fn(() => ({}))
}))

const mockGetRegistrationToDos = vi.fn()

mockNuxtImport('useStrrApi', () => () => ({
  getRegistrationToDos: mockGetRegistrationToDos
}))

const setupTodo = (type: RegistrationTodoType, detail?: string) => ({ task: { type, detail } })

function resetState () {
  mockRegistration.value = null
  mockGetRegistrationToDos.mockClear()
  mockGetRegistrationToDos.mockResolvedValue({ todos: [] })
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
    expect(mockGetRegistrationToDos).not.toHaveBeenCalled()
    expect(isEligibleForRenewal.value).toBe(false)
    expect(hasRegistrationRenewalDraft.value).toBe(false)
    expect(hasRegistrationRenewalPaymentPending.value).toBe(false)
  })

  it('set isEligibleForRenewal when REGISTRATION_RENEWAL todo is present', async () => {
    mockRegistration.value = { ...mockHostRegistration }
    mockGetRegistrationToDos.mockResolvedValue({
      todos: [setupTodo(RegistrationTodoType.REGISTRATION_RENEWAL)]
    })
    const { isEligibleForRenewal } = useRenewals()
    await flushPromises()
    expect(mockGetRegistrationToDos).toHaveBeenCalledWith(mockHostRegistration.id)
    expect(isEligibleForRenewal.value).toBe(true)
  })

  it('set hasRegistrationRenewalDraft and renewalDraftId for renewal draft', async () => {
    mockRegistration.value = { ...mockHostRegistration }
    mockGetRegistrationToDos.mockResolvedValue({
      todos: [setupTodo(RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT, '0987654321')]
    })
    const { hasRegistrationRenewalDraft, renewalDraftId } = useRenewals()
    await flushPromises()
    expect(hasRegistrationRenewalDraft.value).toBe(true)
    expect(renewalDraftId.value).toBe('0987654321')
  })

  it('set hasRegistrationRenewalPaymentPending and renewalPaymentPendingId for payment pending todo', async () => {
    mockRegistration.value = { ...mockHostRegistration }
    mockGetRegistrationToDos.mockResolvedValue({
      todos: [setupTodo(RegistrationTodoType.REGISTRATION_RENEWAL_PAYMENT_PENDING, '12345')]
    })
    const { hasRegistrationRenewalPaymentPending, renewalPaymentPendingId } = useRenewals()
    await flushPromises()
    expect(hasRegistrationRenewalPaymentPending.value).toBe(true)
    expect(renewalPaymentPendingId.value).toBe('12345')
  })
})
