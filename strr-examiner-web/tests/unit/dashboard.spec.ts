import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockApplications } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import Dashboard from '~/pages/dashboard.vue'

const mockedResp: ApiApplicationsListResp = {
  applications: mockApplications,
  total: mockApplications.length,
  limit: 50,
  page: 1
}

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    tableFilters: {},
    tableLimit: 10,
    tablePage: 1,
    fetchApplications: vi.fn().mockResolvedValue(mockedResp),
    approveApplication: vi.fn(),
    rejectApplication: vi.fn(),
    getNextApplication: vi.fn().mockResolvedValue(mockApplications[0]),
    getApplicationById: vi.fn().mockResolvedValue(mockApplications[0]),
    getDocument: vi.fn(),
    openDocInNewTab: vi.fn(),
    resetFilters: vi.fn()
  })
}))

describe('Examiner Dashboard Page', () => {
  let wrapper: any

  beforeEach(async () => {
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

    const { applications } = wrapper.vm.applicationListResp.value
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
})
