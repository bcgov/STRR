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
    isAssignedToUser
  })
}))

describe('Examiner - Strata Application Details Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(ApplicationDetails, {
      global: { plugins: [enI18n] }
    })
    await nextTick()
  })

  it('renders Application Details page and its components', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ApplicationInfoHeader).exists()).toBe(true)
    expect(wrapper.findComponent(HostSubHeader).exists()).toBe(false)
    expect(wrapper.findComponent(HostSupportingInfo).exists()).toBe(false)
    expect(wrapper.findComponent(StrataSubHeader).exists()).toBe(true)
    expect(wrapper.findComponent(PlatformSubHeader).exists()).toBe(false)
  })

  it('renders ApplicationInfoHeader component for Strata application', () => {
    const appHeaderInfo = wrapper.findComponent(ApplicationInfoHeader)
    expect(appHeaderInfo.exists()).toBe(true)
    expect(appHeaderInfo.findComponent(UBadge).exists()).toBe(true)
    expect(appHeaderInfo.findTestId('strata-brand-website').exists()).toBe(true)

    const appHeaderInfoText = appHeaderInfo.text()
    expect(appHeaderInfoText).toContain(mockStrataApplication.header.applicationNumber)
    expect(appHeaderInfoText).toContain(mockStrataApplication.header.examinerStatus)
    expect(appHeaderInfoText).toContain('Strata Hotel')
  })

  it('renders Strata SubHeader component for Strata application', () => {
    const strataSubHeader = wrapper.findComponent(StrataSubHeader)
    expect(strataSubHeader.exists()).toBe(true)

    const { registration } = mockStrataApplication
    const strataSubHeaderText = strataSubHeader.text()

    if (registration.businessDetails) {
      expect(strataSubHeaderText).toContain(registration.businessDetails.legalName)

      if (registration.businessDetails.mailingAddress) {
        expect(strataSubHeaderText).toContain(registration.businessDetails.mailingAddress.address)
      }

      const attorney = registration.businessDetails.registeredOfficeOrAttorneyForServiceDetails
      if (attorney) {
        if (attorney.attorneyName) {
          expect(strataSubHeaderText).toContain(attorney.attorneyName)
        }

        if (attorney.mailingAddress) {
          expect(strataSubHeaderText).toContain(attorney.mailingAddress.address)
        }
      }
    }

    if (registration.strataHotelRepresentatives && registration.strataHotelRepresentatives.length > 0) {
      const rep = registration.strataHotelRepresentatives[0]
      if (rep.firstName) {
        expect(strataSubHeaderText).toContain(rep.firstName)
      }
      if (rep.emailAddress) {
        expect(strataSubHeaderText).toContain(rep.emailAddress)
      }
    }

    if (registration.completingParty) {
      if (registration.completingParty.firstName) {
        expect(strataSubHeaderText).toContain(registration.completingParty.firstName)
      }
      if (registration.completingParty.lastName) {
        expect(strataSubHeaderText).toContain(registration.completingParty.lastName)
      }
    }

    if (registration.strataHotelDetails) {
      if (registration.strataHotelDetails.numberOfUnits !== undefined) {
        expect(strataSubHeaderText).toContain(registration.strataHotelDetails.numberOfUnits.toString())
      }
      if (registration.strataHotelDetails.category) {
        expect(strataSubHeaderText).toContain(registration.strataHotelDetails.category)
      }
    }
  })

  it('hides NOC email and disables action buttons when isAssignedToUser is false', async () => {
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
