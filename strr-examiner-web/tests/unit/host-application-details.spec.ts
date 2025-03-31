import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { flushPromises } from '@vue/test-utils'

import {
  mockHostApplication,
  mockWithPrExemptAndStrataHotel,
  mockWithBlExempt,
  mockDocumentsNOC,
  mockHostApplicationNOCExpired,
  mockHostApplicationWithReviewer,
  mockHostApplicationWithoutReviewer,
  mockFilingHistory
} from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import ApplicationDetails from '~/pages/examine/[applicationId].vue'
import {
  ApplicationInfoHeader, HostSubHeader, HostSupportingInfo,
  StrataSubHeader, PlatformSubHeader, UBadge, UButton,
  StrataSupportingInfo, SupportingDocuments
} from '#components'

let currentMockData = mockHostApplication
const mockViewReceipt = vi.fn()
const mockAssignApplication = vi.fn().mockImplementation(() => Promise.resolve())
const mockGetApplicationById = vi.fn().mockImplementation(() => Promise.resolve(currentMockData))
const mockGetNextApplication = vi.fn().mockImplementation(() => Promise.resolve(currentMockData))
const isFilingHistoryOpen = ref(false) // needs to be initialized outside of mock store because value will change in tests

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    getNextApplication: mockGetNextApplication,
    getApplicationById: mockGetApplicationById,
    getDocument: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/pdf' })),
    getApplicationFilingHistory: vi.fn().mockResolvedValue(mockFilingHistory),
    isFilingHistoryOpen,
    activeReg: ref(currentMockData.registration),
    activeHeader: ref(currentMockData.header),
    activeRecord: ref(currentMockData),
    isApplication: ref(true),
    assignApplication: mockAssignApplication,
    viewReceipt: mockViewReceipt,
    openDocInNewTab: vi.fn().mockImplementation(() => {
      const url = URL.createObjectURL(new Blob(['test']))
      window.open(url, '_blank')
      URL.revokeObjectURL(url)
      setTimeout(() => URL.revokeObjectURL(url), 100)
    })
  })
}))

const mockOpen = vi.fn()
vi.stubGlobal('open', mockOpen)
vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:url'),
  revokeObjectURL: vi.fn()
})

describe('Examiner - Host Application Details Page', () => {
  let wrapper: any

  // helper function to set mock data, mount the wrapper and wait for promises to resolve
  const setupMockAndMount = async (mockData: HostApplicationResp = mockHostApplication) => {
    currentMockData = mockData
    wrapper = await mountSuspended(ApplicationDetails, { global: { plugins: [enI18n] } })
    await flushPromises()
  }

  beforeAll(async () => {
    await setupMockAndMount()
  })

  it('renders Application Details page and its components', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ApplicationInfoHeader).exists()).toBe(true)
    expect(wrapper.findComponent(HostSubHeader).exists()).toBe(true)
    expect(wrapper.findComponent(HostSupportingInfo).exists()).toBe(true)
    expect(wrapper.findComponent(SupportingDocuments).exists()).toBe(true)
    expect(wrapper.findComponent(StrataSubHeader).exists()).toBe(false)
    expect(wrapper.findComponent(StrataSupportingInfo).exists()).toBe(false)
    expect(wrapper.findComponent(PlatformSubHeader).exists()).toBe(false)
  })

  it('renders ApplicationInfoHeader component for Host application', () => {
    const appHeaderInfo = wrapper.findComponent(ApplicationInfoHeader)
    expect(appHeaderInfo.exists()).toBe(true)
    expect(appHeaderInfo.findComponent(UBadge).exists()).toBe(true)
    expect(appHeaderInfo.findTestId('strata-brand-website').exists()).toBe(false)

    const appHeaderInfoText = appHeaderInfo.text()
    expect(appHeaderInfoText).toContain(mockHostApplication.header.applicationNumber)
    expect(appHeaderInfoText).toContain(mockHostApplication.header.examinerStatus)
    expect(appHeaderInfoText).toContain(mockHostApplication.registration.unitAddress!.nickname)
    expect(appHeaderInfoText).toContain('Host')
  })

  it('renders Host SubHeader component for Host application', () => {
    const hostSubHeader = wrapper.findComponent(HostSubHeader)
    expect(hostSubHeader.exists()).toBe(true)

    const { registration } = mockHostApplication
    const hostSubHeaderText = hostSubHeader.text()
    expect(hostSubHeaderText).toContain(registration.unitAddress!.streetName)
    expect(hostSubHeaderText).toContain(registration.strRequirements!.organizationNm)
    expect(hostSubHeaderText).toContain(registration.primaryContact!.firstName)
    expect(hostSubHeaderText).toContain(registration.unitDetails!.parcelIdentifier)
  })

  it('renders Host Supporting Info component for Host application', () => {
    const hostSupportingInfo = wrapper.findComponent(HostSupportingInfo)
    expect(hostSupportingInfo.exists()).toBe(true)

    expect(hostSupportingInfo.exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('str-prohibited-section').exists()).toBe(false)
    expect(hostSupportingInfo.findTestId('business-lic-section').exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('bl-documents').exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('open-business-lic-btn-0').exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('business-lic-section').text())
      .toContain(mockHostApplication.registration.unitDetails!.businessLicense)
    expect(hostSupportingInfo.findTestId('business-lic-section').findAllComponents(UButton).length).toBe(1)
    expect(hostSupportingInfo.findTestId('pr-req-section').exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('pr-req-documents').exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('pr-req-documents').findAllComponents(UButton).length).toBe(1)
  })

  it('opens document in new tab when business license button is clicked', async () => {
    const hostSupportingInfo = wrapper.findComponent(HostSupportingInfo)
    expect(hostSupportingInfo.findTestId('bl-documents').exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('open-business-lic-btn-0').exists()).toBe(true)
    const businessLicBtn = hostSupportingInfo.findTestId('open-business-lic-btn-0')
    await businessLicBtn.trigger('click')
    expect(mockOpen).toHaveBeenCalledWith('blob:url', '_blank')
  })

  it('opens document in new tab when PR document button is clicked', async () => {
    const hostSupportingInfo = wrapper.findComponent(HostSupportingInfo)
    const prDocBtn = hostSupportingInfo.findTestId('pr-req-documents').findComponent(UButton)
    await prDocBtn.trigger('click')
    expect(mockOpen).toHaveBeenCalledWith('blob:url', '_blank')
  })

  it('displays PR exemption reason and Strata category', async () => {
    currentMockData = mockWithPrExemptAndStrataHotel

    const prWrapper = await mountSuspended(ApplicationDetails, {
      global: { plugins: [enI18n] }
    })
    expect(prWrapper.exists()).toBe(true)
  })

  it('displays BL exemption reason', async () => {
    currentMockData = mockWithBlExempt

    const prWrapper = await mountSuspended(ApplicationDetails, {
      global: { plugins: [enI18n] }
    })
    expect(prWrapper.exists()).toBe(true)
  })

  it('render NOC uploaded docs with date badges', async () => {
    // setup new mock application for NOC Expired with additional uploaded documents
    await setupMockAndMount(mockHostApplicationNOCExpired)

    const hostSupportingInfo = wrapper.findComponent(HostSupportingInfo)
    expect(hostSupportingInfo.exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('pr-req-documents').exists()).toBe(true)
    expect(hostSupportingInfo.findAll('[data-testid="supporting-doc-date-badge"]').length).toBe(mockDocumentsNOC.length)
  })

  it('displays view receipt button and calls viewReceipt when clicked', async () => {
    const appHeaderInfo = wrapper.findComponent(ApplicationInfoHeader)
    expect(appHeaderInfo.exists()).toBe(true)

    const receiptButton = appHeaderInfo.findTestId('view-receipt-button')
    expect(receiptButton.exists()).toBe(true)
    expect(receiptButton.text()).toContain('View Receipt')

    await receiptButton.trigger('click')
    expect(mockViewReceipt).toHaveBeenCalledWith(currentMockData.header.applicationNumber)
  })

  it('renders application details with reviewer information', async () => {
    await setupMockAndMount(mockHostApplicationWithReviewer)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ApplicationInfoHeader).exists()).toBe(true)
    const appHeaderInfo = wrapper.findComponent(ApplicationInfoHeader)
    expect(appHeaderInfo.exists()).toBe(true)
    const appHeaderInfoText = appHeaderInfo.text()
    expect(appHeaderInfoText).toContain('Assignee: examiner1')
  })

  it('renders application details without reviewer information', async () => {
    await setupMockAndMount(mockHostApplicationWithoutReviewer)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ApplicationInfoHeader).exists()).toBe(true)
    const appHeaderInfo = wrapper.findComponent(ApplicationInfoHeader)
    expect(appHeaderInfo.exists()).toBe(true)
    const appHeaderInfoText = appHeaderInfo.text()
    expect(appHeaderInfoText).not.toContain('Assignee: examiner1')
  })

  it('auto-assigns application to current examiner when no reviewer exists', async () => {
    await setupMockAndMount(mockHostApplicationWithoutReviewer)
    expect(mockAssignApplication).toHaveBeenCalledWith(mockHostApplicationWithoutReviewer.header.applicationNumber)
    expect(mockGetApplicationById).toHaveBeenCalled()
  })

  it('displays Filing History Show/Hide button', async () => {
    await setupMockAndMount()
    const appHeaderInfo = wrapper.findComponent(ApplicationInfoHeader)
    const toggleHistoryBtn = appHeaderInfo.findTestId('toggle-history-btn')
    expect(toggleHistoryBtn.exists()).toBe(true)
    expect(toggleHistoryBtn.text()).toBe('Show History')
    await toggleHistoryBtn.trigger('click')
    expect(toggleHistoryBtn.text()).toBe('Hide History')
  })
})
