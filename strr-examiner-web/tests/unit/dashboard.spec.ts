import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive, nextTick } from 'vue'
import {
  mockApplications,
  mockHostApplicationWithReviewer,
  mockHostApplicationWithoutReviewer,
  mockHostRegistration
} from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import Dashboard from '~/pages/dashboard.vue'
import { ApplicationStatus, ApplicationType, PrExemptionReason, StrataHotelCategory } from '#imports'

const mockedResp: ApiApplicationsListResp = {
  applications: mockApplications,
  total: mockApplications.length,
  limit: 50,
  page: 1
}

// Create a mock store with reactive filters
const createMockStore = (initialFilters = {}) => {
  const tableFilters = reactive({
    searchText: '',
    registrationNumber: '',
    registrationType: [],
    requirements: [],
    applicantName: '',
    propertyAddress: '',
    status: [],
    submissionDate: { start: null, end: null },
    lastModified: { start: null, end: null },
    localGov: '',
    adjudicator: '',
    ...initialFilters
  })

  const applicationsOnlyStatuses = [
    ApplicationStatus.FULL_REVIEW,
    ApplicationStatus.PAID,
    ApplicationStatus.ADDITIONAL_INFO_REQUESTED,
    ApplicationStatus.NOC_PENDING,
    ApplicationStatus.NOC_EXPIRED,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
  ]

  return {
    tableFilters,
    tableLimit: ref(10),
    tablePage: ref(1),
    applicationsOnlyStatuses,
    fetchApplications: vi.fn().mockResolvedValue(mockedResp),
    fetchRegistrations: vi.fn().mockResolvedValue({ registrations: [], total: 0 }),
    approveApplication: vi.fn(),
    rejectApplication: vi.fn(),
    getNextApplication: vi.fn().mockResolvedValue(mockApplications[0]),
    getApplicationById: vi.fn().mockResolvedValue(mockApplications[0]),
    getDocument: vi.fn(),
    openDocInNewTab: vi.fn(),
    resetFilters: vi.fn(() => {
      Object.assign(tableFilters, {
        searchText: '',
        registrationNumber: '',
        registrationType: [],
        requirements: [],
        applicantName: '',
        propertyAddress: '',
        status: [],
        submissionDate: { start: null, end: null },
        lastModified: { start: null, end: null },
        localGov: '',
        adjudicator: ''
      })
    }),
    assignApplication: vi.fn()
  }
}

let mockStore: ReturnType<typeof createMockStore>

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => mockStore
}))

vi.stubGlobal('useAsyncData', () => ({
  data: {
    applications: mockApplications,
    total: mockApplications.length
  }
}))

vi.mock('@/composables/useExaminerFeatureFlags', () => ({
  useExaminerFeatureFlags: () => ({
    isSplitDashboardTableEnabled: ref(true)
  })
}))

describe('Examiner Dashboard Page', () => {
  let wrapper: any

  beforeEach(async () => {
    mockStore = createMockStore()
    wrapper = await mountSuspended(Dashboard, {
      global: { plugins: [enI18n] }
    })

    await nextTick()
  })

  it('should produce correct Host PR Requirements', () => {
    expect(wrapper.exists()).toBe(true)
    const getPrReq = (reg: ApiHostApplication) => wrapper.vm.getHostPrRequirements(reg)

    const prRequirements = getPrReq(mockApplications[0]?.registration)
    expect(prRequirements).toBe('PR, BL')

    const prRequirements2 = getPrReq({
      ...mockApplications[0]?.registration,
      strRequirements: {
        isBusinessLicenceRequired: true,
        isPrincipalResidenceRequired: false,
        isStrProhibited: true,
        isStraaExempt: null,
        organizationNm: ''
      }
    })

    expect(prRequirements2).toBe('BL, Prohibited')

    const prRequirements3 = getPrReq({
      ...mockApplications[0]?.registration,
      unitDetails: {
        ...mockApplications[0]?.registration.unitDetails,
        prExemptReason: PrExemptionReason.FARM_LAND
      },
      strRequirements: {
        isBusinessLicenceRequired: true,
        isPrincipalResidenceRequired: false,
        isStrProhibited: true,
        isStraaExempt: null,
        organizationNm: ''
      }
    })

    expect(prRequirements3).toBe('PR-ex-farm, BL, Prohibited')
  })

  it('renders the Dashboard page and applications table', () => {
    expect(wrapper.findTestId('examiner-dashboard-page').exists()).toBe(true)
    expect(wrapper.findTestId('applications-table').exists()).toBe(true)
    expect(wrapper.findTestId('applications-pagination').exists()).toBe(mockApplications.length > 50)

    const { applications } = wrapper.vm.applicationOrRegistrationList
    expect(applications.length).toBe(mockApplications.length)
    expect(applications[0].applicantName).toEqual(
      displayContactFullName(mockApplications[0]?.registration.primaryContact)
    )

    const applicationText = wrapper.findTestId('applications-table').text()
    const { header, registration } = mockApplications[0] as ApiApplicationBaseResp
    expect(applicationText).toContain(header.applicationNumber)
    expect(applicationText).toContain(header.hostStatus)
    expect(applicationText).toContain(displayContactFullName(registration.primaryContact))
    expect(applicationText).toContain(registration.unitAddress.city)
  })

  it('renders the assignee column correctly', () => {
    expect(wrapper.findTestId('applications-table').exists()).toBe(true)
    const { applications } = wrapper.vm.applicationOrRegistrationList
    const appWithReviewer = applications.find(app =>
      app.adjudicator === mockHostApplicationWithReviewer.header.assignee?.username
    )
    expect(appWithReviewer).toBeDefined()
    expect(appWithReviewer?.adjudicator).toBe(mockHostApplicationWithReviewer.header.assignee?.username)
    const appWithoutReviewer = applications.find(app =>
      app.applicationNumber === mockHostApplicationWithoutReviewer.header.applicationNumber
    )
    expect(appWithoutReviewer).toBeDefined()
    expect(appWithoutReviewer?.adjudicator).toBe('-')
    const applicationText = wrapper.findTestId('applications-table').text()
    expect(applicationText).toContain(mockHostApplicationWithReviewer.header.assignee?.username)
  })

  it('renders split dashboard with applications and registrations tabs', () => {
    // make sure feature flag is enabled
    expect(wrapper.vm.isSplitDashboardTableEnabled).toBe(true)

    const tabs = wrapper.findTestId('application-and-registrations-tabs')
    expect(tabs.exists()).toBe(true)

    // verify the columns include the alternate labels for split dashboard
    const columns = wrapper.vm.columns
    const registrationNumberColumn = columns.find((col: any) => col.key === 'registrationNumber')
    expect(registrationNumberColumn).toBeDefined()
    expect(registrationNumberColumn.label).toBe('Application #') // this is when isApplicationTab is true

    // Verify 'status' column appears before 'registrationType' (different order in split view)
    const statusIndex = columns.findIndex((col: any) => col.key === 'status')
    const regTypeIndex = columns.findIndex((col: any) => col.key === 'registrationType')
    expect(statusIndex).toBeLessThan(regTypeIndex)

    // verify 'localGov' column (only in split dashboard view)
    const localGovColumn = columns.find((col: any) => col.key === 'localGov')
    expect(localGovColumn).toBeDefined()

    // verify 'submissionDate' column does not exist (not in split dashboard view)
    const submissionDateColumn = columns.find((col: any) => col.key === 'submissionDate')
    expect(submissionDateColumn).toBeUndefined()
  })

  describe('Filter Persistence', () => {
    it('should set default status filters when on applications tab with split dashboard enabled', async () => {
      mockStore = createMockStore()
      await mountSuspended(Dashboard, {
        global: { plugins: [enI18n] }
      })
      await nextTick()

      // Verify that status filters are set to applicationsOnlyStatuses
      expect(mockStore.tableFilters.status).toEqual(mockStore.applicationsOnlyStatuses)
    })

    it('should preserve filters when navigating back from detail page', async () => {
      // Set up initial filters
      const initialFilters = {
        registrationType: ['HOST'],
        requirements: ['PR'],
        searchText: 'test search'
      }
      mockStore = createMockStore(initialFilters)

      await mountSuspended(Dashboard, {
        global: { plugins: [enI18n] }
      })
      await nextTick()

      // Simulate navigating back - component remounts
      // Filters should still be preserved
      expect(mockStore.tableFilters.registrationType).toEqual(['HOST'])
      expect(mockStore.tableFilters.requirements).toEqual(['PR'])
      expect(mockStore.tableFilters.searchText).toBe('test search')
    })

    it('should NOT reset filters when feature flag changes but tab is still applications', async () => {
      const initialFilters = {
        registrationType: ['HOST'],
        requirements: ['PR']
      }
      mockStore = createMockStore(initialFilters)

      const wrapper = await mountSuspended(Dashboard, {
        global: { plugins: [enI18n] }
      })
      await nextTick()

      // Store initial filter values
      const initialRegType = [...mockStore.tableFilters.registrationType]
      const initialRequirements = [...mockStore.tableFilters.requirements]

      // Simulate feature flag change (but still on applications tab)
      // The watcher should NOT reset filters
      wrapper.vm.isApplicationTab = true
      await nextTick()

      // Filters should still be preserved
      expect(mockStore.tableFilters.registrationType).toEqual(initialRegType)
      expect(mockStore.tableFilters.requirements).toEqual(initialRequirements)
    })

    it('should set status filters only when both isApplicationTab and isSplitDashboardTableEnabled true', async () => {
      mockStore = createMockStore({ status: [] })

      const wrapper = await mountSuspended(Dashboard, {
        global: { plugins: [enI18n] }
      })
      await nextTick()

      // When on applications tab with split dashboard enabled, status should be set
      expect(wrapper.vm.isApplicationTab).toBe(true)
      expect(wrapper.vm.isSplitDashboardTableEnabled).toBe(true)
      expect(mockStore.tableFilters.status).toEqual(mockStore.applicationsOnlyStatuses)
    })

    it('should set status filters to applicationsOnlyStatuses when on applications tab', async () => {
      const customStatusFilters = [ApplicationStatus.FULL_REVIEW, ApplicationStatus.PAID]
      mockStore = createMockStore({ status: customStatusFilters })

      await mountSuspended(Dashboard, {
        global: { plugins: [enI18n] }
      })
      await nextTick()

      // The watcher sets status to applicationsOnlyStatuses when on applications tab
      // This ensures default filters are applied when needed
      expect(mockStore.tableFilters.status).toEqual(mockStore.applicationsOnlyStatuses)
      expect(mockStore.tableFilters.status.length).toBeGreaterThan(0)
    })

    it('should reset filters when switching to registrations tab', async () => {
      const initialFilters = {
        registrationType: ['HOST'],
        requirements: ['PR'],
        searchText: 'test'
      }
      mockStore = createMockStore(initialFilters)

      const wrapper = await mountSuspended(Dashboard, {
        global: { plugins: [enI18n] }
      })
      await nextTick()

      // Click on registrations tab
      const tabs = wrapper.findTestId('application-and-registrations-tabs')
      expect(tabs.exists()).toBe(true)

      // Get the registrations tab link
      const tabLinks = wrapper.vm.tabLinks
      const registrationsTab = tabLinks.find((tab: any) => !tab.active)

      // Simulate clicking registrations tab (which calls resetFilters)
      registrationsTab.click()
      await nextTick()

      // Filters should be reset
      expect(mockStore.resetFilters).toHaveBeenCalled()
    })

    it('should NOT reset filters when switching back to applications tab', async () => {
      const initialFilters = {
        registrationType: ['HOST'],
        requirements: ['PR']
      }
      mockStore = createMockStore(initialFilters)

      const wrapper = await mountSuspended(Dashboard, {
        global: { plugins: [enI18n] }
      })
      await nextTick()

      // Store initial values
      const initialRegType = [...mockStore.tableFilters.registrationType]
      const initialRequirements = [...mockStore.tableFilters.requirements]

      // Switch to registrations tab first
      wrapper.vm.isApplicationTab = false
      await nextTick()

      // Switch back to applications tab
      wrapper.vm.isApplicationTab = true
      await nextTick()

      // The applications tab click handler does NOT call resetFilters
      // So filters should be preserved (unless resetFilters was called by registrations tab)
      // Since we're just testing the applications tab, filters should remain
      // Note: In actual usage, switching to registrations tab would reset, but switching back wouldn't
      expect(mockStore.tableFilters.registrationType).toEqual(initialRegType)
      expect(mockStore.tableFilters.requirements).toEqual(initialRequirements)
    })
  })

  describe('getConditionsColumnForRegistration - Registration Requirements Display', () => {
    it('should display PR and BL when strRequirements is provided', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: {
          isPrincipalResidenceRequired: true,
          isBusinessLicenceRequired: true,
          isStrProhibited: false,
          isStraaExempt: false,
          organizationNm: 'City of Vancouver'
        },
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          prRequired: null,
          blRequired: null
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      expect(result).toContain('PR')
      expect(result).toContain('BL')
    })

    it('should fall back to unitDetails when strRequirements is missing', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: undefined,
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          prRequired: true,
          blRequired: true
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      expect(result).toContain('PR')
      expect(result).toContain('BL')
    })

    it('should prefer strRequirements over unitDetails when both are present', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: {
          isPrincipalResidenceRequired: true,
          isBusinessLicenceRequired: false,
          isStrProhibited: false,
          isStraaExempt: false,
          organizationNm: 'City of Vancouver'
        },
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          prRequired: false,
          blRequired: true // This should be ignored
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      expect(result).toContain('PR')
      expect(result).not.toContain('BL')
    })

    it('should display "Prohibited" when isStrProhibited is true in strRequirements', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: {
          isPrincipalResidenceRequired: false,
          isBusinessLicenceRequired: false,
          isStrProhibited: true,
          isStraaExempt: false,
          organizationNm: 'City of Vancouver'
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      expect(result).toContain('Prohibited')
    })

    it('should display PR exempt reason from unitDetails', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: {
          isPrincipalResidenceRequired: true,
          isBusinessLicenceRequired: false,
          isStrProhibited: false,
          isStraaExempt: false,
          organizationNm: 'City of Vancouver'
        },
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          prExemptReason: PrExemptionReason.FARM_LAND
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      expect(result).toContain('PR-ex-farm')
    })

    it('should display strata hotel category from unitDetails', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: {
          isPrincipalResidenceRequired: false,
          isBusinessLicenceRequired: false,
          isStrProhibited: false,
          isStraaExempt: false,
          organizationNm: 'City of Vancouver'
        },
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          strataHotelCategory: StrataHotelCategory.MULTI_UNIT_NON_PR
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      expect(result).toContain('Category 2')
    })

    it('should display "None" when no requirements are present', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: {
          isPrincipalResidenceRequired: false,
          isBusinessLicenceRequired: false,
          isStrProhibited: false,
          isStraaExempt: false,
          organizationNm: 'City of Vancouver'
        },
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          prRequired: false,
          blRequired: false,
          prExemptReason: undefined,
          strataHotelCategory: undefined
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      // The translation key 'page.dashboardList.requirements.host.none' should return "None"
      expect(result).toBe('None')
    })

    it('should handle null values in strRequirements gracefully', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: {
          isPrincipalResidenceRequired: null as any,
          isBusinessLicenceRequired: null as any,
          isStrProhibited: false,
          isStraaExempt: false,
          organizationNm: 'City of Vancouver'
        },
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          prRequired: true,
          blRequired: true
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      // Should fall back to unitDetails when strRequirements values are null
      expect(result).toContain('PR')
      expect(result).toContain('BL')
    })

    it('should combine multiple requirements correctly', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: {
          isPrincipalResidenceRequired: true,
          isBusinessLicenceRequired: true,
          isStrProhibited: true,
          isStraaExempt: false,
          organizationNm: 'City of Vancouver'
        },
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          prExemptReason: PrExemptionReason.FRACTIONAL_OWNERSHIP
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      expect(result).toContain('PR')
      expect(result).toContain('BL')
      expect(result).toContain('Prohibited')
      expect(result).toContain('PR-ex-fractional')
    })

    it('should handle missing strRequirements and null unitDetails', () => {
      const registration: HostRegistrationResp = {
        ...mockHostRegistration,
        strRequirements: undefined,
        unitDetails: {
          ...mockHostRegistration.unitDetails,
          prRequired: null,
          blRequired: null,
          prExemptReason: undefined,
          strataHotelCategory: undefined
        }
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      // Should return "None" when no requirements are found
      expect(result).toBe('None')
    })

    it('should display "-" for STRATA_HOTEL registration type', () => {
      const registration = {
        ...mockHostRegistration,
        registrationType: ApplicationType.STRATA_HOTEL
      }

      const result = wrapper.vm.getConditionsColumnForRegistration(registration)
      expect(result).toBe('-')
    })
  })
})
