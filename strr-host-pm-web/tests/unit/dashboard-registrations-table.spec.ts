import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import RegistrationsTable from '~/components/dashboard/RegistrationsTable.vue'

const testState = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  selectedRegistrationId: undefined as string | undefined,
  renewalRegId: undefined as string | undefined
}))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({
    get selectedRegistrationId () {
      return testState.selectedRegistrationId
    },
    set selectedRegistrationId (value: string | undefined) {
      testState.selectedRegistrationId = value
    },
    get renewalRegId () {
      return testState.renewalRegId
    },
    set renewalRegId (value: string | undefined) {
      testState.renewalRegId = value
    }
  })
}))

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isDashboardTableSortingEnabled: ref(false),
    isHostSearchTextFieldsEnabled: ref(false),
    isNewDashboardEnabled: ref(false)
  })
}))

mockNuxtImport('navigateTo', () => testState.mockNavigateTo)

const asyncDataMocks: Record<string, any> = {
  'host-registrations-list': { registrations: [], total: 0 }
}

mockNuxtImport('useAsyncData', () => {
  return (key: string, _fn: any, opts?: any) => ({
    data: ref(asyncDataMocks[key] ?? opts?.default?.()),
    status: ref('success')
  })
})

const createRegistration = (overrides: Record<string, any> = {}) => {
  const baseRegistration = {
    id: 308,
    registrationNumber: 'H123456789',
    registrationType: ApplicationType.HOST,
    status: RegistrationStatus.ACTIVE,
    header: {
      hostStatus: 'Registered',
      applications: []
    },
    unitAddress: {
      unitNumber: '',
      streetNumber: '123',
      streetName: 'Main St',
      city: 'Victoria'
    },
    unitDetails: {
      jurisdiction: 'City of Victoria'
    },
    expiryDate: '2026-03-01T00:00:00.000Z'
  }

  return {
    ...baseRegistration,
    ...overrides,
    header: {
      ...baseRegistration.header,
      ...overrides.header
    },
    unitAddress: {
      ...baseRegistration.unitAddress,
      ...overrides.unitAddress
    },
    unitDetails: {
      ...baseRegistration.unitDetails,
      ...overrides.unitDetails
    }
  }
}

const daysFromNowIso = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

describe('Dashboard Registrations Table', () => {
  beforeEach(() => {
    testState.mockNavigateTo.mockReset()
    testState.selectedRegistrationId = undefined
    testState.renewalRegId = undefined
  })

  it('renders registration number as details hyperlink', async () => {
    asyncDataMocks['host-registrations-list'] = {
      registrations: [createRegistration()],
      total: 1
    }

    const wrapper = await mountSuspended(RegistrationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    const numberLink = wrapper.find('a')
    expect(numberLink.exists()).toBe(true)
    expect(numberLink.text()).toContain('H123456789')
  })

  it('stores selected registration id when details link is clicked', async () => {
    asyncDataMocks['host-registrations-list'] = {
      registrations: [createRegistration()],
      total: 1
    }

    const wrapper = await mountSuspended(RegistrationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    await wrapper.find('a').trigger('click')
    expect(testState.selectedRegistrationId).toBe('308')
  })

  it('shows Renew action for expired registrations', async () => {
    asyncDataMocks['host-registrations-list'] = {
      registrations: [createRegistration({ expiryDate: daysFromNowIso(-10) })],
      total: 1
    }

    const wrapper = await mountSuspended(RegistrationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    const renewBtn = wrapper.findAll('button')
      .find(btn => btn.text().includes('Renew'))
    expect(renewBtn).toBeTruthy()

    await renewBtn!.trigger('click')
    expect(testState.renewalRegId).toBe('308')
    expect(testState.mockNavigateTo).toHaveBeenCalledWith({
      path: '/en-CA/application',
      query: { renew: 'true' }
    })
  })

  it('shows Resume Draft action and opens draft renewal', async () => {
    asyncDataMocks['host-registrations-list'] = {
      registrations: [createRegistration({
        header: {
          hostStatus: 'Registered',
          applications: [{
            applicationType: 'renewal',
            applicationStatus: ApplicationStatus.DRAFT,
            applicationNumber: '12345678901234'
          }]
        }
      })],
      total: 1
    }

    const wrapper = await mountSuspended(RegistrationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    const resumeBtn = wrapper.findAll('button')
      .find(btn => btn.text().includes('label.resumeDraft'))
    expect(resumeBtn).toBeTruthy()
    expect(wrapper.text()).toContain('Renewal In Progress')

    await resumeBtn!.trigger('click')
    expect(testState.renewalRegId).toBeUndefined()
    expect(testState.mockNavigateTo).toHaveBeenCalledWith({
      path: '/en-CA/application',
      query: {
        renew: 'true',
        applicationId: '12345678901234'
      }
    })
  })

  describe('View button in actions column', () => {
    it('shows only View for an active registration with no renewal action', async () => {
      asyncDataMocks['host-registrations-list'] = {
        registrations: [createRegistration({ expiryDate: daysFromNowIso(200) })],
        total: 1
      }

      const wrapper = await mountSuspended(RegistrationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      const viewLink = wrapper.findAll('a').find(a => a.text() === 'View')
      expect(viewLink).toBeTruthy()
      expect(viewLink!.attributes('href')).toContain('H123456789')

      const renewBtn = wrapper.findAll('button').find(btn => btn.text().includes('Renew'))
      expect(renewBtn).toBeUndefined()
    })

    it('shows Renew and View together for an expired registration', async () => {
      asyncDataMocks['host-registrations-list'] = {
        registrations: [createRegistration({ expiryDate: daysFromNowIso(-10) })],
        total: 1
      }

      const wrapper = await mountSuspended(RegistrationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      const renewBtn = wrapper.findAll('button').find(btn => btn.text().includes('Renew'))
      expect(renewBtn).toBeTruthy()

      const viewLink = wrapper.findAll('a').find(a => a.text() === 'View')
      expect(viewLink).toBeTruthy()
    })

    it('shows Renew and View together for an expiring-soon registration', async () => {
      asyncDataMocks['host-registrations-list'] = {
        registrations: [createRegistration({ expiryDate: daysFromNowIso(20) })],
        total: 1
      }

      const wrapper = await mountSuspended(RegistrationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      const renewBtn = wrapper.findAll('button').find(btn => btn.text().includes('Renew'))
      expect(renewBtn).toBeTruthy()

      const viewLink = wrapper.findAll('a').find(a => a.text() === 'View')
      expect(viewLink).toBeTruthy()
    })

    it('shows Resume Draft and View together for a registration with a renewal draft', async () => {
      asyncDataMocks['host-registrations-list'] = {
        registrations: [createRegistration({
          header: {
            hostStatus: 'Registered',
            applications: [{
              applicationType: 'renewal',
              applicationStatus: ApplicationStatus.DRAFT,
              applicationNumber: '12345678901234'
            }]
          }
        })],
        total: 1
      }

      const wrapper = await mountSuspended(RegistrationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      const resumeBtn = wrapper.findAll('button').find(btn => btn.text().includes('label.resumeDraft'))
      expect(resumeBtn).toBeTruthy()

      const viewLink = wrapper.findAll('a').find(a => a.text() === 'View')
      expect(viewLink).toBeTruthy()
    })

    it('View button stores selected registration id on click', async () => {
      asyncDataMocks['host-registrations-list'] = {
        registrations: [createRegistration({ expiryDate: daysFromNowIso(200) })],
        total: 1
      }

      const wrapper = await mountSuspended(RegistrationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      const viewLink = wrapper.findAll('a').find(a => a.text() === 'View')
      await viewLink!.trigger('click')
      expect(testState.selectedRegistrationId).toBe('308')
    })
  })

  describe('status column overrides based on expiry state', () => {
    it('shows "Expired" in the status column for a registration with a past expiry date', async () => {
      asyncDataMocks['host-registrations-list'] = {
        registrations: [createRegistration({ expiryDate: daysFromNowIso(-1) })],
        total: 1
      }

      const wrapper = await mountSuspended(RegistrationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      expect(wrapper.find('tbody tr td:nth-child(2)').text()).toBe('Expired')
    })

    it('shows "Expiring soon" in the status column for a host registration expiring within 40 days', async () => {
      asyncDataMocks['host-registrations-list'] = {
        registrations: [createRegistration({ expiryDate: daysFromNowIso(20) })],
        total: 1
      }

      const wrapper = await mountSuspended(RegistrationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      expect(wrapper.find('tbody tr td:nth-child(2)').text()).toBe('Expiring soon')
    })

    it('shows the original hostStatus in the status column for a registration with a future expiry date', async () => {
      asyncDataMocks['host-registrations-list'] = {
        registrations: [createRegistration({ expiryDate: daysFromNowIso(200) })],
        total: 1
      }

      const wrapper = await mountSuspended(RegistrationsTable, {
        global: { plugins: [baseEnI18n] }
      })

      expect(wrapper.find('tbody tr td:nth-child(2)').text()).toBe('Registered')
    })
  })

  it('colors expired and expiring-soon dates correctly', async () => {
    asyncDataMocks['host-registrations-list'] = {
      registrations: [
        createRegistration({
          registrationNumber: 'HEXPIRED001',
          expiryDate: daysFromNowIso(-10)
        }),
        createRegistration({
          registrationNumber: 'HEXPIRING002',
          expiryDate: daysFromNowIso(20)
        })
      ],
      total: 2
    }

    const wrapper = await mountSuspended(RegistrationsTable, {
      global: { plugins: [baseEnI18n] }
    })

    const expiryCells = wrapper.findAll('tbody tr td:nth-child(5) span')
    expect(expiryCells[0]?.classes()).toContain('text-bcGovColor-error')
    expect(expiryCells[1]?.classes()).toContain('text-bcGovColor-caution')
  })
})
