import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import RentalApplicationsTreeTable from '~/components/dashboard/RentalApplicationsTreeTable.vue'

const testState = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockStartRenewal: vi.fn(),
  mockResumeRenewalDraft: vi.fn(),
  mockDeleteApplication: vi.fn(),
  mockHandlePaymentRedirect: vi.fn(),
  selectedRegistrationId: undefined as string | undefined
}))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({
    get selectedRegistrationId () {
      return testState.selectedRegistrationId
    },
    set selectedRegistrationId (value: string | undefined) {
      testState.selectedRegistrationId = value
    },
    get dashboardRegistrations () {
      return asyncDataMocks['host-tree-registrations'].registrations
    },
    get dashboardApplications () {
      return asyncDataMocks['host-tree-applications'].applications
    },
    isDashboardLoading: ref(false),
    loadDashboardData: vi.fn(),
    refreshDashboardData: vi.fn()
  })
}))

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isHostSearchTextFieldsEnabled: ref(true),
    isNewDashboardEnabled: ref(true),
    isRenewalsEnabled: ref(true)
  })
}))

vi.mock('@/composables/useRenewals', () => ({
  useRenewals: () => ({
    startRenewal: testState.mockStartRenewal,
    resumeRenewalDraft: testState.mockResumeRenewalDraft,
    canRenewRegistration: vi.fn((_reg, expiryState) => expiryState === 'EXPIRED' || expiryState === 'EXPIRING_SOON'),
    fetchRegistrationsWithRenewalTodos: vi.fn(regs => Promise.resolve(regs))
  })
}))

vi.mock('@/composables/useConnectNav', () => ({
  useConnectNav: () => ({
    handlePaymentRedirect: testState.mockHandlePaymentRedirect
  })
}))

mockNuxtImport('navigateTo', () => testState.mockNavigateTo)

const asyncDataMocks: Record<string, any> = {
  'host-tree-registrations': { registrations: [], total: 0 },
  'host-tree-applications': { applications: [], total: 0 }
}

mockNuxtImport('useAsyncData', () => {
  return (key: string, _fn: any, opts?: any) => ({
    data: ref(asyncDataMocks[key] ?? opts?.default?.()),
    status: ref('success'),
    refresh: vi.fn()
  })
})

const createRegistration = (overrides: Record<string, any> = {}) => ({
  id: 101,
  registrationNumber: 'H123456789',
  registrationType: ApplicationType.HOST,
  status: RegistrationStatus.ACTIVE,
  header: {
    hostStatus: 'Active',
    applications: []
  },
  unitAddress: {
    unitNumber: '101',
    streetNumber: '456',
    streetName: 'Robson St',
    city: 'Vancouver',
    nickname: 'Downtown Suite'
  },
  unitDetails: {
    jurisdiction: 'City of Vancouver'
  },
  expiryDate: '2026-12-31T00:00:00.000Z',
  ...overrides
})

const createApplication = (overrides: Record<string, any> = {}) => ({
  header: {
    applicationNumber: 'APP-1001',
    applicationType: 'registration',
    status: ApplicationStatus.FULL_REVIEW,
    hostStatus: 'Full Examination',
    applicationDateTime: new Date('2026-01-01T10:00:00Z'),
    hostActions: [],
    ...overrides.header
  },
  registration: {
    unitAddress: {
      unitNumber: '202',
      streetNumber: '789',
      streetName: 'Government St',
      city: 'Victoria',
      nickname: 'Victoria Studio'
    },
    strRequirements: {
      organizationNm: 'City of Victoria'
    },
    ...overrides.registration
  }
})

describe('RentalApplicationsTreeTable', () => {
  beforeEach(() => {
    testState.mockNavigateTo.mockReset()
    testState.mockStartRenewal.mockReset()
    testState.mockResumeRenewalDraft.mockReset()
    testState.mockDeleteApplication.mockReset()
    testState.mockHandlePaymentRedirect.mockReset()
    testState.selectedRegistrationId = undefined
    asyncDataMocks['host-tree-registrations'] = { registrations: [], total: 0 }
    asyncDataMocks['host-tree-applications'] = { applications: [], total: 0 }
  })

  it('renders section title and toolbar controls', async () => {
    const wrapper = await mountSuspended(RentalApplicationsTreeTable, {
      global: { plugins: [baseEnI18n] }
    })

    expect(wrapper.text()).toContain('Short-Term Rentals & Associated Applications')
    expect(wrapper.text()).toContain('Unified Tree View')
    expect(wrapper.text()).toContain('Split Tables View')
    expect(wrapper.text()).toContain('Expand All')
  })

  it('renders registrations and standalone in-progress applications in tree fashion', async () => {
    const reg = createRegistration({
      id: 201,
      registrationNumber: 'H111222333',
      unitAddress: { nickname: 'Robson Condo', unitNumber: '10', streetNumber: '100', streetName: 'Robson St', city: 'Vancouver' }
    })

    const standaloneApp = createApplication({
      header: {
        applicationNumber: 'APP-NEW-99',
        applicationType: 'registration',
        status: ApplicationStatus.FULL_REVIEW,
        hostStatus: 'Under Review'
      },
      registration: {
        unitAddress: { nickname: 'New In-Progress Rental', unitNumber: '', streetNumber: '550', streetName: 'Beatty St', city: 'Vancouver' }
      }
    })

    asyncDataMocks['host-tree-registrations'] = { registrations: [reg], total: 1 }
    asyncDataMocks['host-tree-applications'] = { applications: [standaloneApp], total: 1 }

    const wrapper = await mountSuspended(RentalApplicationsTreeTable, {
      global: { plugins: [baseEnI18n] }
    })

    // Both registration and standalone application appear
    expect(wrapper.text()).toContain('H111222333')
    expect(wrapper.text()).toContain('APP-NEW-99')
    expect(wrapper.text()).toContain('Rental Property')
    expect(wrapper.text()).toContain('Initial Application')
  })

  it('nests applications associated with a registration under it and expands on toggle', async () => {
    const reg = createRegistration({
      id: 301,
      registrationNumber: 'H777888999'
    })

    const linkedRenewalApp = createApplication({
      header: {
        applicationNumber: 'APP-RENEW-42',
        applicationType: 'renewal',
        registrationNumber: 'H777888999',
        registrationId: 301,
        status: ApplicationStatus.FULL_REVIEW,
        hostStatus: 'In Review'
      }
    })

    asyncDataMocks['host-tree-registrations'] = { registrations: [reg], total: 1 }
    asyncDataMocks['host-tree-applications'] = { applications: [linkedRenewalApp], total: 1 }

    const wrapper = await mountSuspended(RentalApplicationsTreeTable, {
      global: { plugins: [baseEnI18n] }
    })

    // Initially collapsed -> child application APP-RENEW-42 is not yet visible in rows
    expect(wrapper.text()).toContain('H777888999')
    expect(wrapper.text()).toContain('1 application')
    expect(wrapper.text()).not.toContain('APP-RENEW-42')

    // Find and click the expand chevron button
    const expandBtn = wrapper.find('[data-testid="toggle-expand-btn"]')
    expect(expandBtn.exists()).toBe(true)
    await expandBtn.trigger('click')

    // Now child application is visible!
    expect(wrapper.text()).toContain('APP-RENEW-42')
    expect(wrapper.text()).toContain('Renewal Application')
  })

  it('expands all child applications when Expand All is clicked', async () => {
    const reg = createRegistration({
      id: 401,
      registrationNumber: 'H444555666'
    })

    const linkedApp = createApplication({
      header: {
        applicationNumber: 'APP-CHILD-1',
        applicationType: 'renewal',
        registrationNumber: 'H444555666',
        registrationId: 401,
        status: ApplicationStatus.DRAFT,
        hostStatus: 'Draft'
      }
    })

    asyncDataMocks['host-tree-registrations'] = { registrations: [reg], total: 1 }
    asyncDataMocks['host-tree-applications'] = { applications: [linkedApp], total: 1 }

    const wrapper = await mountSuspended(RentalApplicationsTreeTable, {
      global: { plugins: [baseEnI18n] }
    })

    // Click Expand All button
    const expandAllBtn = wrapper.findAll('button').find(b => b.text().includes('Expand All'))
    expect(expandAllBtn).toBeDefined()
    await expandAllBtn?.trigger('click')

    expect(wrapper.text()).toContain('APP-CHILD-1')
    expect(wrapper.text()).toContain('Collapse All')
  })

  it('emits update:viewMode when split view mode is clicked', async () => {
    const wrapper = await mountSuspended(RentalApplicationsTreeTable, {
      props: { initialViewMode: 'tree' },
      global: { plugins: [baseEnI18n] }
    })

    const splitBtn = wrapper.findAll('button').find(b => b.text().includes('Split Tables View'))
    expect(splitBtn).toBeDefined()
    await splitBtn?.trigger('click')

    expect(wrapper.emitted('update:viewMode')).toBeTruthy()
    expect(wrapper.emitted('update:viewMode')?.[0]).toEqual(['split'])
  })

  it('renders clean empty state when no records exist', async () => {
    asyncDataMocks['host-tree-registrations'] = { registrations: [], total: 0 }
    asyncDataMocks['host-tree-applications'] = { applications: [], total: 0 }

    const wrapper = await mountSuspended(RentalApplicationsTreeTable, {
      global: { plugins: [baseEnI18n] }
    })

    expect(wrapper.text()).toContain('No short-term rental registrations or applications found')
  })

  it('filters by search text', async () => {
    const reg1 = createRegistration({
      id: 501,
      registrationNumber: 'H111',
      unitAddress: { nickname: 'Sunset Villa', streetNumber: '1', streetName: 'Sunset Rd', city: 'Tofino' }
    })
    const reg2 = createRegistration({
      id: 502,
      registrationNumber: 'H222',
      unitAddress: { nickname: 'Mountain Cabin', streetNumber: '2', streetName: 'Ski Hill', city: 'Whistler' }
    })

    asyncDataMocks['host-tree-registrations'] = { registrations: [reg1, reg2], total: 2 }
    asyncDataMocks['host-tree-applications'] = { applications: [], total: 0 }

    const wrapper = await mountSuspended(RentalApplicationsTreeTable, {
      global: { plugins: [baseEnI18n] }
    })

    const searchInput = wrapper.find('input')
    await searchInput.setValue('Whistler')

    expect(wrapper.text()).toContain('H222')
    expect(wrapper.text()).not.toContain('H111')
  })
})
