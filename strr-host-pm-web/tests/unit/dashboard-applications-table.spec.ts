import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import ApplicationsTable from '~/components/dashboard/ApplicationsTable.vue'

const {
  mockNavigateTo,
  mockHandlePaymentRedirect,
  mockDeleteApplication
} = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockHandlePaymentRedirect: vi.fn(),
  mockDeleteApplication: vi.fn()
}))

vi.mock('@/composables/useConnectNav', () => ({
  useConnectNav: () => ({
    handlePaymentRedirect: mockHandlePaymentRedirect
  })
}))

vi.mock('@/composables/useStrrApi', () => ({
  useStrrApi: () => ({
    deleteApplication: mockDeleteApplication,
    getAccountApplications: vi.fn(),
    searchApplications: vi.fn()
  })
}))

vi.mock('@/composables/useStrrModals', () => ({
  useStrrModals: () => ({
    openAppSubmitError: vi.fn()
  })
}))

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isDashboardTableSortingEnabled: ref(false),
    isHostSearchTextFieldsEnabled: ref(false),
    isNewDashboardEnabled: ref(false)
  })
}))

mockNuxtImport('useConnectNav', () => {
  return () => ({
    handlePaymentRedirect: mockHandlePaymentRedirect
  })
})

mockNuxtImport('useStrrApi', () => {
  return () => ({
    deleteApplication: mockDeleteApplication,
    getAccountApplications: vi.fn(),
    searchApplications: vi.fn()
  })
})

mockNuxtImport('useStrrModals', () => {
  return () => ({
    openAppSubmitError: vi.fn()
  })
})

mockNuxtImport('useHostFeatureFlags', () => {
  return () => ({
    isDashboardTableSortingEnabled: ref(false),
    isHostSearchTextFieldsEnabled: ref(false),
    isNewDashboardEnabled: ref(false)
  })
})

mockNuxtImport('navigateTo', () => mockNavigateTo)

const asyncDataMocks: Record<string, any> = {
  'host-applications-list': { applications: [], total: 0, filteredCount: 0 }
}

mockNuxtImport('useAsyncData', () => {
  return (key: string, _fn: any, opts?: any) => ({
    data: ref(asyncDataMocks[key] ?? opts?.default?.()),
    status: ref('success'),
    refresh: vi.fn()
  })
})

const createApplication = (overrides: Record<string, any> = {}) => {
  const baseApplication = {
    header: {
      applicationNumber: '12345678901234',
      applicationDateTime: '2026-01-01T00:00:00.000Z',
      hostStatus: 'Pending Approval',
      status: ApplicationStatus.FULL_REVIEW,
      hostActions: [],
      paymentToken: 5678
    },
    registration: {
      unitAddress: {
        unitNumber: '',
        streetNumber: '123',
        streetName: 'Main St',
        city: 'Victoria'
      },
      strRequirements: {
        organizationNm: 'City of Victoria'
      }
    }
  }

  return {
    ...baseApplication,
    ...overrides,
    header: {
      ...baseApplication.header,
      ...overrides.header
    },
    registration: {
      ...baseApplication.registration,
      ...overrides.registration,
      unitAddress: {
        ...baseApplication.registration.unitAddress,
        ...overrides.registration?.unitAddress
      },
      strRequirements: {
        ...baseApplication.registration.strRequirements,
        ...overrides.registration?.strRequirements
      }
    }
  }
}

describe('Dashboard Applications Table', () => {
  beforeEach(() => {
    mockNavigateTo.mockReset()
    mockHandlePaymentRedirect.mockReset()
  })

  it('renders number as hyperlink for non-draft application', async () => {
    asyncDataMocks['host-applications-list'] = {
      applications: [createApplication()],
      total: 1,
      filteredCount: 1
    }

    const wrapper = await mountSuspended(ApplicationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    const numberLink = wrapper.find('a')
    expect(numberLink.exists()).toBe(true)
    expect(numberLink.text()).toContain('12345678901234')
  })

  it('renders Resume Draft action and opens draft application', async () => {
    asyncDataMocks['host-applications-list'] = {
      applications: [createApplication({
        header: {
          status: ApplicationStatus.DRAFT,
          hostStatus: 'Draft'
        }
      })],
      total: 1,
      filteredCount: 1
    }

    const wrapper = await mountSuspended(ApplicationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    expect(wrapper.find('a').exists()).toBe(false)

    const resumeBtn = wrapper.findAll('button')
      .find(btn => btn.text().includes('label.resumeDraft'))
    expect(resumeBtn).toBeTruthy()

    await resumeBtn!.trigger('click')
    expect(mockNavigateTo).toHaveBeenCalledWith('/en-CA/application?applicationId=12345678901234')
  })

  it('shows Pay Now action for payment due applications', async () => {
    asyncDataMocks['host-applications-list'] = {
      applications: [createApplication({
        header: {
          status: ApplicationStatus.PAYMENT_DUE,
          hostStatus: 'Payment Due',
          hostActions: [HostActions.SUBMIT_PAYMENT],
          paymentToken: 9999
        }
      })],
      total: 1,
      filteredCount: 1
    }

    const wrapper = await mountSuspended(ApplicationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    const payNowBtn = wrapper.findAll('button')
      .find(btn => btn.text().includes('Pay Now'))
    expect(payNowBtn).toBeTruthy()

    await payNowBtn!.trigger('click')
    expect(mockHandlePaymentRedirect).toHaveBeenCalledWith(9999, '/dashboard/application/12345678901234')
  })

  it('does not redirect to payment when token is missing on row', async () => {
    asyncDataMocks['host-applications-list'] = {
      applications: [createApplication({
        header: {
          status: ApplicationStatus.PAYMENT_DUE,
          hostStatus: 'Payment Due',
          hostActions: [HostActions.SUBMIT_PAYMENT],
          paymentToken: undefined
        }
      })],
      total: 1,
      filteredCount: 1
    }

    const wrapper = await mountSuspended(ApplicationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    const payNowBtn = wrapper.findAll('button')
      .find(btn => btn.text().includes('Pay Now'))
    await payNowBtn!.trigger('click')

    expect(mockHandlePaymentRedirect).not.toHaveBeenCalled()
  })

  describe('View button in actions column', () => {
    it('shows only View for a non-draft non-payment-due application', async () => {
      asyncDataMocks['host-applications-list'] = {
        applications: [createApplication()],
        total: 1,
        filteredCount: 1
      }

      const wrapper = await mountSuspended(ApplicationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      const viewLink = wrapper.findAll('a').find(a => a.text() === 'View')
      expect(viewLink).toBeTruthy()
      expect(viewLink!.attributes('href')).toContain('/dashboard/application/12345678901234')

      const payNowBtn = wrapper.findAll('button').find(btn => btn.text().includes('Pay Now'))
      expect(payNowBtn).toBeUndefined()
    })

    it('shows Pay Now and View together for a payment due application', async () => {
      asyncDataMocks['host-applications-list'] = {
        applications: [createApplication({
          header: {
            status: ApplicationStatus.PAYMENT_DUE,
            hostStatus: 'Payment Due',
            hostActions: [HostActions.SUBMIT_PAYMENT],
            paymentToken: 9999
          }
        })],
        total: 1,
        filteredCount: 1
      }

      const wrapper = await mountSuspended(ApplicationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      const payNowBtn = wrapper.findAll('button').find(btn => btn.text().includes('Pay Now'))
      expect(payNowBtn).toBeTruthy()

      const viewLink = wrapper.findAll('a').find(a => a.text() === 'View')
      expect(viewLink).toBeTruthy()
    })

    it('does not show View for draft applications', async () => {
      asyncDataMocks['host-applications-list'] = {
        applications: [createApplication({
          header: {
            status: ApplicationStatus.DRAFT,
            hostStatus: 'Draft'
          }
        })],
        total: 1,
        filteredCount: 1
      }

      const wrapper = await mountSuspended(ApplicationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      const viewLink = wrapper.findAll('a').find(a => a.text() === 'View')
      expect(viewLink).toBeUndefined()
    })
  })
})
