import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { baseEnI18n } from '../mocks/i18n'
import { mockHostRegistration } from '../mocks/mockedData'
import { registrationDashboardStubs } from './helpers/renewal-test-utils'
import RegistrationDashboard from '~/pages/dashboard/registration/[registrationNumber].vue'

const {
  selectedRegistrationId,
  loadHostRegistrationData,
  readStoredSelectedRegistrationId,
  clearStoredSelectedRegistrationId,
  updatePaymentDetails,
  navigateTo
} = vi.hoisted(() => {
  return {
    selectedRegistrationId: { value: undefined } as Ref<string | undefined>,
    loadHostRegistrationData: vi.fn().mockResolvedValue(undefined),
    readStoredSelectedRegistrationId: vi.fn(),
    clearStoredSelectedRegistrationId: vi.fn(),
    updatePaymentDetails: vi.fn().mockResolvedValue(undefined),
    navigateTo: vi.fn().mockResolvedValue(undefined)
  }
})

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({
    selectedRegistrationId,
    registration: ref(mockHostRegistration),
    permitDetails: ref({ unitAddress: { nickname: 'Unit' } }),
    showPermitDetails: ref(true),
    needsBusinessLicenseDocumentUpload: ref(false),
    readStoredSelectedRegistrationId,
    clearStoredSelectedRegistrationId,
    loadHostRegistrationData
  })
}))

vi.mock('@/stores/connectDetailsHeader', () => ({
  useConnectDetailsHeaderStore: () => ({
    loading: ref(false),
    title: ref(''),
    subtitles: ref([])
  })
}))

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitAddress: ref({ address: mockHostRegistration.unitAddress })
  })
}))

vi.mock('@/composables/useDashboardTodos', () => ({
  useDashboardTodos: () => ({
    todos: ref([]),
    hasPendingRenewalProcessing: ref(false),
    addNocTodo: vi.fn(),
    addBusinessLicenseTodo: vi.fn(),
    setupRenewalTodosWatch: vi.fn()
  })
}))

vi.mock('@/composables/useDashboardPage', () => ({
  useDashboardPage: () => ({
    owners: ref([]),
    setupBreadcrumbs: vi.fn(),
    setupOwners: vi.fn()
  })
}))

mockNuxtImport('useStrrApi', () => () => ({ updatePaymentDetails }))
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useLocalePath', () => () => (path: string) => path)

const mountRegistrationDashboard = () =>
  mountSuspended(RegistrationDashboard, {
    global: { plugins: [baseEnI18n], stubs: registrationDashboardStubs }
  })

describe('Registration dashboard page', () => {
  beforeEach(() => {
    selectedRegistrationId.value = undefined
    sessionStorage.clear()
    vi.clearAllMocks()
    readStoredSelectedRegistrationId.mockReturnValue(undefined)
  })

  it('redirects to dashboard-new when no registration id is available', async () => {
    await mountRegistrationDashboard()
    await flushPromises()
    expect(navigateTo).toHaveBeenCalledWith('/dashboard-new')
    expect(loadHostRegistrationData).not.toHaveBeenCalled()
  })

  it('restores registration id from sessionStorage after payment return and syncs payment', async () => {
    readStoredSelectedRegistrationId.mockReturnValue('308')
    sessionStorage.setItem('renewalApplicationNumber', 'APP-999')

    await mountRegistrationDashboard()
    await flushPromises()

    expect(selectedRegistrationId.value).toBe('308')
    expect(clearStoredSelectedRegistrationId).toHaveBeenCalled()
    expect(updatePaymentDetails).toHaveBeenCalledWith('APP-999')
    expect(sessionStorage.getItem('renewalApplicationNumber')).toBeNull()
    expect(loadHostRegistrationData).toHaveBeenCalledWith('308')
  })

  it('loads registration when selectedRegistrationId is already set', async () => {
    selectedRegistrationId.value = '42'
    await mountRegistrationDashboard()
    await flushPromises()
    expect(readStoredSelectedRegistrationId).not.toHaveBeenCalled()
    expect(loadHostRegistrationData).toHaveBeenCalledWith('42')
    expect(updatePaymentDetails).not.toHaveBeenCalled()
  })
})
