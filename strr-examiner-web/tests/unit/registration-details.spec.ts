import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import {
  mockHostRegistration,
  mockPlatformRegistration,
  mockStrataHotelRegistration,
  mockExpiredRegistration,
  mockSuspendedRegistration,
  mockCancelledRegistration
} from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import RegistrationDetails from '~/pages/registration/[registrationId].vue'
import {
  RegistrationInfoHeader
} from '#components'

let currentMockData = mockHostRegistration
vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    updateRegistrationStatus: vi.fn().mockResolvedValue(undefined),
    getRegistrationById: vi.fn().mockImplementation(() => Promise.resolve(currentMockData)),
    activeReg: ref(currentMockData),
    activeHeader: ref(currentMockData.header),
    activeRecord: ref(currentMockData),
    isApplication: ref(false)
  })
}))

describe('Examiner - Registration Details Page', () => {
  let wrapper: any

  beforeAll(async () => {
    currentMockData = mockHostRegistration
    wrapper = await mountSuspended(RegistrationDetails, {
      global: { plugins: [enI18n] }
    })
  })

  it('renders Application Details page and its components', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(RegistrationInfoHeader).exists()).toBe(true)
  })

  it('displays correct badge color for ACTIVE status', async () => {
    currentMockData = mockHostRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })
    const badge = componentWrapper.find('.inline-flex.bg-green-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Registered')
  })

  it('displays correct badge color for EXPIRED status', async () => {
    currentMockData = mockExpiredRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })
    const badge = componentWrapper.find('.inline-flex.bg-red-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Expired')
  })

  it('displays correct badge color for SUSPENDED status', async () => {
    currentMockData = mockSuspendedRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })
    const badge = componentWrapper.find('.inline-flex.bg-blue-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Suspended')
  })

  it('displays correct badge color for CANCELLED status', async () => {
    currentMockData = mockCancelledRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })

    const badge = componentWrapper.find('.inline-flex.bg-red-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Cancelled')
  })

  it('displays correct application name for HOST type', async () => {
    currentMockData = mockHostRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })

    const nameElement = componentWrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Downtown Unit')
  })

  it('displays correct application name for PLATFORM type', async () => {
    currentMockData = mockPlatformRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })

    const nameElement = componentWrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Test Platform Inc.')
  })

  it('displays correct application name for STRATA_HOTEL type', async () => {
    currentMockData = mockStrataHotelRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })

    const nameElement = componentWrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Doe Enterprises')
  })

  it('displays website button for STRATA_HOTEL type', async () => {
    currentMockData = mockStrataHotelRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })

    const websiteButton = componentWrapper.findTestId('strata-brand-website')
    expect(websiteButton.exists()).toBe(true)
    expect(websiteButton.attributes('href')).toBe('https://luxurystays.com')
  })

  it('displays correct registration type for HOST', async () => {
    currentMockData = mockHostRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })

    const typeElement = componentWrapper.findAll('.text-sm')[1]
    expect(typeElement.text()).toContain('Type: Host')
  })

  it('displays correct registration type for PLATFORM', async () => {
    currentMockData = mockPlatformRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })

    const typeElement = componentWrapper.findAll('.text-sm')[1]
    expect(typeElement.text()).toContain('Type: Platform')
  })

  it('displays correct registration type for STRATA_HOTEL', async () => {
    currentMockData = mockStrataHotelRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })
    const allText = componentWrapper.text()
    expect(allText).toContain('Type: Strata Hotel')
  })

  it('displays reviewer information when available', async () => {
    currentMockData = mockHostRegistration

    const componentWrapper = await mountSuspended(RegistrationInfoHeader, {
      global: { plugins: [enI18n] }
    })

    const reviewerElement = componentWrapper.findAll('.text-sm')[1]
    expect(reviewerElement.text()).toContain('Approved By: examiner1')
  })
})
