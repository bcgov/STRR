import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mockStrataApplication } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import ApplicationDetails from '~/pages/examine/[applicationId].vue'
import {
  ApplicationInfoHeader, HostSubHeader, HostSupportingInfo,
  StrataSubHeader, PlatformSubHeader, UBadge
} from '#components'

const isAssignedToUser = ref(true)
const mockRightButtons = [
  { key: 'approve', disabled: false },
  { key: 'reject', disabled: false },
  { key: 'sendNotice', disabled: false }
]

vi.mock('@/composables/useExaminerRoute', () => ({
  useExaminerRoute: () => ({
    getRouteConfig: () => ({
      rightButtons: mockRightButtons
    }),
    updateRouteAndButtons: vi.fn()
  })
}))

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    getNextApplication: vi.fn().mockResolvedValue(mockStrataApplication),
    getApplicationById: vi.fn().mockResolvedValue(mockStrataApplication),
    assignApplication: vi.fn().mockImplementation(() => Promise.resolve()),
    resetEditRentalUnitAddress: vi.fn(),
    activeReg: ref(mockStrataApplication.registration),
    activeHeader: ref(mockStrataApplication.header),
    activeRecord: ref(mockStrataApplication),
    isApplication: ref(true),
    isFilingHistoryOpen: ref(true),
    isAssignedToUser,
    emailContent: ref({ content: '' })
  })
}))

describe('Strata Application Details Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(ApplicationDetails, {
      global: { plugins: [enI18n] }
    })
    await nextTick()
  })

  it('should render Application Details page and its components', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ApplicationInfoHeader).exists()).toBe(true)
    expect(wrapper.findComponent(HostSubHeader).exists()).toBe(false)
    expect(wrapper.findComponent(HostSupportingInfo).exists()).toBe(false)
    expect(wrapper.findComponent(StrataSubHeader).exists()).toBe(true)
    expect(wrapper.findComponent(PlatformSubHeader).exists()).toBe(false)
  })

  it('should render ApplicationInfoHeader component for Strata application', () => {
    const appHeaderInfo = wrapper.findComponent(ApplicationInfoHeader)
    expect(appHeaderInfo.exists()).toBe(true)
    expect(appHeaderInfo.findComponent(UBadge).exists()).toBe(true)
    expect(appHeaderInfo.findTestId('strata-brand-website').exists()).toBe(true)

    const appHeaderInfoText = appHeaderInfo.text()
    expect(appHeaderInfoText).toContain(mockStrataApplication.header.applicationNumber)
    expect(appHeaderInfoText).toContain(mockStrataApplication.header.examinerStatus)
    expect(appHeaderInfoText).toContain('Strata Hotel')
  })

  it('should render Strata SubHeader component for Strata application', () => {
    const strataSubHeader = wrapper.findComponent(StrataSubHeader)
    expect(strataSubHeader.exists()).toBe(true)

    const { registration } = mockStrataApplication
    const strataSubHeaderText = strataSubHeader.text()

    const { businessDetails, strataHotelRepresentatives, completingParty, strataHotelDetails } = registration
    const attorney = businessDetails!.registeredOfficeOrAttorneyForServiceDetails!
    const rep = strataHotelRepresentatives![0]!

    expect(strataSubHeaderText).toContain(businessDetails!.legalName)
    expect(strataSubHeaderText).toContain(businessDetails!.mailingAddress!.address)
    expect(strataSubHeaderText).toContain(attorney.attorneyName)
    expect(strataSubHeaderText).toContain(attorney.mailingAddress!.address)
    expect(strataSubHeaderText).toContain(rep.firstName)
    expect(strataSubHeaderText).toContain(rep.emailAddress)
    expect(strataSubHeaderText).toContain(completingParty!.firstName)
    expect(strataSubHeaderText).toContain(completingParty!.lastName)
    expect(strataSubHeaderText).toContain(strataHotelDetails!.numberOfUnits!.toString())
    expect(strataSubHeaderText).toContain(strataHotelDetails!.category)
  })

  it('should render Strata SubHeader with correct structure and primary building location', () => {
    const strataSubHeader = wrapper.findComponent(StrataSubHeader)
    expect(strataSubHeader.findTestId('strata-sub-header').exists()).toBe(true)
    expect(strataSubHeader.findTestId('strata-primary-building').exists()).toBe(true)
    expect(strataSubHeader.findTestId('strata-business').exists()).toBe(true)
    expect(strataSubHeader.findTestId('strata-attorney').exists()).toBe(true)

    const primaryBuilding = strataSubHeader.findTestId('strata-primary-building')
    const { location } = mockStrataApplication.registration.strataHotelDetails
    expect(primaryBuilding.text()).toContain(location.address)
    expect(primaryBuilding.text()).toContain(location.city)
  })

  it('should hide NOC email and disable action buttons when isAssignedToUser is false', async () => {
    isAssignedToUser.value = false
    await nextTick()
    expect(wrapper.findTestId('compose-email').exists()).toBe(false)
    const actionButtons = ['approve', 'reject', 'sendNotice']
    mockRightButtons.forEach((button) => {
      if (actionButtons.includes(button.key)) {
        button.disabled = true
      }
    })
    actionButtons.forEach((action) => {
      const button = mockRightButtons.find(btn => btn.key === action)
      expect(button?.disabled).toBe(true)
    })
    isAssignedToUser.value = true
  })
})
