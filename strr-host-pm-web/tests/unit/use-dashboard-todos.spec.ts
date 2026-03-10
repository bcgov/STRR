import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import { mockApplicationHeader, mockHostRegistration } from '../mocks/mockedData'
import { baseEnI18n } from '../mocks/i18n'

const $t = baseEnI18n.global.t

const mockRegistration = ref<HostRegistrationResp | null>(null)
const mockPermitDetails = ref<any>({})
const mockRenewalRegId = ref<string | undefined>(undefined)
const mockNeedsBusinessLicenseDocumentUpload = ref(false)

mockNuxtImport('storeToRefs', () => (_store: any) => ({
  registration: mockRegistration,
  permitDetails: mockPermitDetails,
  renewalRegId: mockRenewalRegId,
  needsBusinessLicenseDocumentUpload: mockNeedsBusinessLicenseDocumentUpload
}))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: vi.fn(() => ({}))
}))

const mockIsEligibleForRenewal = ref(false)
const mockHasRegistrationRenewalDraft = ref(false)
const mockHasRegistrationRenewalPaymentPending = ref(false)
const mockRenewalDraftId = ref<string | undefined>(undefined)
const mockRenewalPaymentPendingId = ref<string | undefined>(undefined)
const mockRenewalDueDate = ref('Jan 1, 2026')
const mockRenewalDateCounter = ref(30)
const mockIsRenewalPeriodClosed = ref(false)
const mockGetRegistrationRenewalTodos = vi.fn()

const mockGetAccountApplication = vi.fn()
const mockDeleteApplication = vi.fn()

mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplication: mockGetAccountApplication,
  deleteApplication: mockDeleteApplication
}))

const mockIsRenewalsEnabled = ref(false)

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isRenewalsEnabled: mockIsRenewalsEnabled
  })
}))

vi.mock('@/composables/useRenewals', () => ({
  useRenewals: () => ({
    isEligibleForRenewal: mockIsEligibleForRenewal,
    hasRegistrationRenewalDraft: mockHasRegistrationRenewalDraft,
    hasRegistrationRenewalPaymentPending: mockHasRegistrationRenewalPaymentPending,
    renewalDraftId: mockRenewalDraftId,
    renewalPaymentPendingId: mockRenewalPaymentPendingId,
    renewalDueDate: mockRenewalDueDate,
    renewalDateCounter: mockRenewalDateCounter,
    isRenewalPeriodClosed: mockIsRenewalPeriodClosed,
    getRegistrationRenewalTodos: mockGetRegistrationRenewalTodos
  })
}))

const mockHandlePaymentRedirect = vi.fn()

mockNuxtImport('useConnectNav', () => () => ({
  handlePaymentRedirect: mockHandlePaymentRedirect
}))

mockNuxtImport('useNuxtApp', () => () => ({
  $i18n: { t: $t }
}))

const mockNavigateTo = vi.fn()
mockNuxtImport('useLocalePath', () => () => (path: string) => path)
mockNuxtImport('navigateTo', () => (...args: any[]) => mockNavigateTo(...args))
mockNuxtImport('dateToString', () => () => 'Oct 18, 2025')

function resetState () {
  mockRegistration.value = null
  mockPermitDetails.value = {}
  mockRenewalRegId.value = undefined
  mockNeedsBusinessLicenseDocumentUpload.value = false
  mockIsEligibleForRenewal.value = false
  mockHasRegistrationRenewalDraft.value = false
  mockHasRegistrationRenewalPaymentPending.value = false
  mockRenewalDraftId.value = undefined
  mockRenewalPaymentPendingId.value = undefined
  mockRenewalDueDate.value = 'Jan 1, 2026'
  mockRenewalDateCounter.value = 30
  mockIsRenewalPeriodClosed.value = false
  mockIsRenewalsEnabled.value = false
  vi.clearAllMocks()
}

describe('Pending Renewal', () => {
  beforeEach(resetState)

  it('should return false when registration is null or has no applications array', () => {
    mockRegistration.value = null
    const { hasPendingRenewalProcessing } = useDashboardTodos()
    expect(hasPendingRenewalProcessing.value).toBe(false)

    mockRegistration.value = { ...mockHostRegistration } as unknown as HostRegistrationResp
    expect(hasPendingRenewalProcessing.value).toBe(false)
  })

  it('should return false when applications array is empty', () => {
    mockRegistration.value = {
      ...mockHostRegistration,
      header: { ...mockApplicationHeader, applications: [] }
    } as unknown as HostRegistrationResp
    const { hasPendingRenewalProcessing } = useDashboardTodos()
    expect(hasPendingRenewalProcessing.value).toBe(false)
  })

  it('should return false when latest application is not renewal type', () => {
    mockRegistration.value = {
      ...mockHostRegistration,
      header: {
        ...mockApplicationHeader,
        applications: [{ applicationType: 'new', applicationStatus: ApplicationStatus.PAID }]
      }
    } as unknown as HostRegistrationResp
    const { hasPendingRenewalProcessing } = useDashboardTodos()
    expect(hasPendingRenewalProcessing.value).toBe(false)
  })

  it('should return false when latest application is renewal but status is not PAID or FULL_REVIEW', () => {
    mockRegistration.value = {
      ...mockHostRegistration,
      header: {
        ...mockApplicationHeader,
        applications: [{ applicationType: 'renewal', applicationStatus: ApplicationStatus.FULL_REVIEW_APPROVED }]
      }
    } as unknown as HostRegistrationResp
    const { hasPendingRenewalProcessing } = useDashboardTodos()
    expect(hasPendingRenewalProcessing.value).toBe(false)
  })

  it('should return true when latest application is renewal with PAID status', () => {
    mockRegistration.value = {
      ...mockHostRegistration,
      header: {
        ...mockApplicationHeader,
        applications: [{ applicationType: 'renewal', applicationStatus: ApplicationStatus.PAID }]
      }
    } as unknown as HostRegistrationResp
    const { hasPendingRenewalProcessing } = useDashboardTodos()
    expect(hasPendingRenewalProcessing.value).toBe(true)
  })

  it('should return true when latest application is renewal with FULL_REVIEW status', () => {
    mockRegistration.value = {
      ...mockHostRegistration,
      header: {
        ...mockApplicationHeader,
        applications: [{ applicationType: 'renewal', applicationStatus: ApplicationStatus.FULL_REVIEW }]
      }
    } as unknown as HostRegistrationResp
    const { hasPendingRenewalProcessing } = useDashboardTodos()
    expect(hasPendingRenewalProcessing.value).toBe(true)
  })

  it('only checks the first (latest) application', () => {
    // first app is non-pending renewal; second would be pending — result should be false
    mockRegistration.value = {
      ...mockHostRegistration,
      header: {
        ...mockApplicationHeader,
        applications: [
          { applicationType: 'renewal', applicationStatus: ApplicationStatus.FULL_REVIEW_APPROVED },
          { applicationType: 'renewal', applicationStatus: ApplicationStatus.PAID }
        ]
      }
    } as unknown as HostRegistrationResp
    const { hasPendingRenewalProcessing } = useDashboardTodos()
    expect(hasPendingRenewalProcessing.value).toBe(false)
  })
})

describe('NOC Todo', () => {
  beforeEach(resetState)

  it('does not add a todo when nocStatus is not NOC_PENDING', () => {
    mockRegistration.value = { ...mockHostRegistration, nocStatus: RegistrationNocStatus.NOC_EXPIRED }
    mockPermitDetails.value = { nocEndDate: new Date('2025-10-18') }
    const { todos, addNocTodo } = useDashboardTodos()
    addNocTodo()
    expect(todos.value).toHaveLength(0)
  })

  it('NOC todo when nocStatus is NOC_PENDING', () => {
    mockRegistration.value = { ...mockHostRegistration, nocStatus: RegistrationNocStatus.NOC_PENDING }
    mockPermitDetails.value = { nocEndDate: new Date('2025-10-18') }
    const { todos, addNocTodo } = useDashboardTodos()
    addNocTodo()
    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.id).toBe('todo-reg-noc-add-docs')
    expect(todos.value[0]!.title).toContain('Oct 18, 2025')
    expect(todos.value[0]!.subtitle).toBeTruthy()
  })
})

describe('Business License Required Todo', () => {
  beforeEach(resetState)

  it('does not add a todo when needsBusinessLicenseDocumentUpload is false', () => {
    mockNeedsBusinessLicenseDocumentUpload.value = false
    const { todos, addBusinessLicenseTodo } = useDashboardTodos()
    addBusinessLicenseTodo()
    expect(todos.value).toHaveLength(0)
  })

  it('add business license todo when needsBusinessLicenseDocumentUpload is true', () => {
    mockNeedsBusinessLicenseDocumentUpload.value = true
    const { todos, addBusinessLicenseTodo } = useDashboardTodos()
    addBusinessLicenseTodo()
    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.id).toBe('todo-business-license-upload')
    expect(todos.value[0]!.title).toBe($t('todos.businessLicense.title'))
    expect(todos.value[0]!.subtitle).toBeTruthy()
    expect(todos.value[0]!.icon).toBe('i-mdi-alert')
    expect(todos.value[0]!.iconClass).toBe('text-orange-500')
  })
})

describe('Setup Renewal Todos watcher', () => {
  beforeEach(resetState)

  it('should add registration closed todo when renewals are enabled and period is closed', () => {
    mockIsRenewalsEnabled.value = true
    mockIsRenewalPeriodClosed.value = true
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    expect(todos.value.find(t => t.id === 'todo-renew-registration-closed')).toBeDefined()
  })

  it('renewal todo with day count title and renew button when eligible and not overdue', () => {
    mockIsRenewalsEnabled.value = true
    mockIsRenewalPeriodClosed.value = false
    mockRegistration.value = { ...mockHostRegistration }
    mockIsEligibleForRenewal.value = true
    mockRenewalDateCounter.value = 15
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renew-registration')!
    expect(todo).toBeDefined()
    expect(todo.title).toContain($t('label.renewalDayCount', 15))
    expect(todo.title).not.toContain($t('label.renewalOverdue'))
    expect(todo.buttons).toHaveLength(1)
    expect(todo.buttons![0]!.label).toBe($t('btn.renew'))
  })

  it('renewal todo title includes overdue label when past due', () => {
    mockIsRenewalsEnabled.value = true
    mockIsRenewalPeriodClosed.value = false
    mockRegistration.value = { ...mockHostRegistration }
    mockIsEligibleForRenewal.value = true
    mockRenewalDateCounter.value = -5
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renew-registration')!
    expect(todo.title).toContain($t('label.renewalOverdue'))
    expect(todo.title).not.toContain($t('label.renewalDayCount', -5))
  })

  it('renewal draft todo with resume and delete buttons when draft exists', () => {
    mockIsRenewalsEnabled.value = true
    mockRegistration.value = { ...mockHostRegistration }
    mockIsEligibleForRenewal.value = false
    mockHasRegistrationRenewalDraft.value = true
    mockRenewalDraftId.value = 'draft-abc'
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renewal-draft')!
    expect(todo).toBeDefined()
    expect(todo.buttons).toHaveLength(2)
    expect(todo.buttons![0]!.label).toBe($t('todos.renewalDraft.resumeButton'))
    expect(todo.buttons![1]!.label).toBe($t('todos.renewalDraft.deleteDraft'))
    expect(todo.buttons![1]!.icon).toBe('i-mdi-delete')
  })

  it('payment pending todo with a single payment button when payment is awaiting', () => {
    mockIsRenewalsEnabled.value = true
    mockRegistration.value = { ...mockHostRegistration }
    mockIsEligibleForRenewal.value = false
    mockHasRegistrationRenewalDraft.value = false
    mockHasRegistrationRenewalPaymentPending.value = true
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renewal-payment-pending')!
    expect(todo).toBeDefined()
    expect(todo.buttons).toHaveLength(1)
    expect(todo.buttons![0]!.label).toBe($t('todos.renewalPayment.button'))
  })

  it('no renewal todos when renewals feature is disabled', () => {
    mockIsRenewalsEnabled.value = false
    mockRegistration.value = { ...mockHostRegistration }
    mockIsEligibleForRenewal.value = true
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const renewalIds = new Set([
      'todo-renew-registration-closed',
      'todo-renew-registration',
      'todo-renewal-draft',
      'todo-renewal-payment-pending'
    ])
    expect(todos.value.filter(t => renewalIds.has(t.id))).toHaveLength(0)
  })

  it('no renewal todo when renewals enabled but registration is null', () => {
    mockIsRenewalsEnabled.value = true
    mockRegistration.value = null
    mockIsEligibleForRenewal.value = true
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    expect(todos.value.find(t => t.id === 'todo-renew-registration')).toBeUndefined()
  })

  it('remove stale renewal todos when state changes', async () => {
    mockIsRenewalsEnabled.value = true
    mockRegistration.value = { ...mockHostRegistration }
    mockIsEligibleForRenewal.value = true
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    expect(todos.value.find(t => t.id === 'todo-renew-registration')).toBeDefined()

    // renewal eligibility is reset
    mockIsEligibleForRenewal.value = false
    await nextTick()
    expect(todos.value.find(t => t.id === 'todo-renew-registration')).toBeUndefined()
  })
})

describe('Renewal Todos buttons', () => {
  beforeEach(() => {
    resetState()
    mockIsRenewalsEnabled.value = true
    mockRegistration.value = { ...mockHostRegistration }
  })

  it('renew button sets renewalRegId and navigates to /application with renew query', async () => {
    mockIsEligibleForRenewal.value = true
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renew-registration')!
    await todo.buttons![0]!.action()
    expect(mockRenewalRegId.value).toBe(mockHostRegistration.id.toString())
    expect(mockNavigateTo).toHaveBeenCalledWith({ path: '/application', query: { renew: 'true' } })
  })

  it('resume draft button clears renewalRegId and navigates with draft applicationId', async () => {
    mockHasRegistrationRenewalDraft.value = true
    mockRenewalDraftId.value = '1234567890'
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renewal-draft')!
    await todo.buttons![0]!.action()
    expect(mockRenewalRegId.value).toBeUndefined()
    expect(mockNavigateTo).toHaveBeenCalledWith({
      path: '/application',
      query: { renew: 'true', applicationId: '1234567890' }
    })
  })

  it('delete draft button calls deleteApplication, remove draft todo, and reload renewal todos', async () => {
    mockHasRegistrationRenewalDraft.value = true
    mockRenewalDraftId.value = '1234567890'
    mockDeleteApplication.mockResolvedValue(undefined)
    mockGetRegistrationRenewalTodos.mockResolvedValue(undefined)
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renewal-draft')!
    await todo.buttons![1]!.action()
    expect(mockDeleteApplication).toHaveBeenCalledWith('1234567890')
    expect(todos.value.find(t => t.id === 'todo-renewal-draft')).toBeUndefined()
    expect(mockGetRegistrationRenewalTodos).toHaveBeenCalled()
  })

  it('payment pending button fetches application and redirects when paymentToken is present', async () => {
    mockHasRegistrationRenewalPaymentPending.value = true
    mockRenewalPaymentPendingId.value = 'A12345'
    mockGetAccountApplication.mockResolvedValue({
      header: { paymentToken: 'PT12345', applicationNumber: '1234567890' }
    })
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renewal-payment-pending')!
    await todo.buttons![0]!.action()
    expect(mockGetAccountApplication).toHaveBeenCalledWith('A12345')
    expect(mockHandlePaymentRedirect).toHaveBeenCalledWith('PT12345', '/dashboard/1234567890')
  })

  it('payment pending button does not redirect when paymentToken is absent', async () => {
    mockHasRegistrationRenewalPaymentPending.value = true
    mockRenewalPaymentPendingId.value = 'A12345'
    mockGetAccountApplication.mockResolvedValue({ header: { paymentToken: null, applicationNumber: '1234567890' } })
    const { todos, setupRenewalTodosWatch } = useDashboardTodos()
    setupRenewalTodosWatch()
    const todo = todos.value.find(t => t.id === 'todo-renewal-payment-pending')!
    await todo.buttons![0]!.action()
    expect(mockHandlePaymentRedirect).not.toHaveBeenCalled()
  })
})
