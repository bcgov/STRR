import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import { mockApplication, mockHostRegistration } from '../mocks/mockedData'
import DashboardNewPage from '~/pages/dashboard-new/index.vue'

vi.mock('@/composables/useStrrModals', () => ({
  useStrrModals: () => ({
    openHelpRegisterModal: vi.fn(),
    openAppSubmitError: vi.fn()
  })
}))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({
    selectedRegistrationId: ref(null)
  })
}))

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isDashboardTableSortingEnabled: ref(false),
    isHostSearchTextFieldsEnabled: ref(false)
  })
}))

mockNuxtImport('useConnectLaunchdarklyStore', () => {
  return () => ({
    getStoredFlag: vi.fn().mockReturnValue(false)
  })
})

// mock useAsyncData to bypass debounce and return mock data directly
const asyncDataMocks: Record<string, any> = {
  'host-applications-list': { applications: [mockApplication], total: 1, filteredCount: 1 },
  'host-registrations-list': { registrations: [mockHostRegistration], total: 1 }
}
mockNuxtImport('useAsyncData', () => {
  return (key: string, _fn: any, opts?: any) => ({
    data: ref(asyncDataMocks[key] ?? opts?.default?.()),
    status: ref('success'),
    refresh: vi.fn()
  })
})

describe('Host Dashboard New Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(DashboardNewPage, {
      global: {
        plugins: [baseEnI18n]
      }
    })
  })

  it('render register a STR button', () => {
    expect(wrapper.find('[data-testid="register-new-rental-btn"]').exists()).toBe(true)
  })

  it('render DashboardRegistrationsTable', () => {
    expect(wrapper.find('[data-testid="registrations-table"]').exists()).toBe(true)
  })

  it('render DashboardApplicationsTable', () => {
    expect(wrapper.find('[data-testid="applications-table"]').exists()).toBe(true)
  })
})
