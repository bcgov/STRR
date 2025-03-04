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

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    updateRegistrationStatus: vi.fn().mockResolvedValue(undefined),
    getRegistrationById: vi.fn().mockResolvedValue(mockHostRegistration)
  })
}))

describe('Examiner - Registration Details Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(RegistrationDetails, {
      global: { plugins: [enI18n] }
    })
  })

  it('renders Application Details page and its components', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(RegistrationInfoHeader).exists()).toBe(true)
  })
})

describe('RegistrationInfoHeader Component', () => {
  let wrapper: any

  it('displays correct badge color for ACTIVE status', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockHostRegistration
      },
      global: { plugins: [enI18n] }
    })
    const badge = wrapper.find('.inline-flex.bg-green-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Registered')
  })

  it('displays correct badge color for EXPIRED status', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockExpiredRegistration
      },
      global: { plugins: [enI18n] }
    })
    const badge = wrapper.find('.inline-flex.bg-red-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Expired')
  })

  it('displays correct badge color for SUSPENDED status', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockSuspendedRegistration
      },
      global: { plugins: [enI18n] }
    })
    const badge = wrapper.find('.inline-flex.bg-blue-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Suspended')
  })

  it('displays correct badge color for CANCELLED status', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockCancelledRegistration
      },
      global: { plugins: [enI18n] }
    })
    const badge = wrapper.find('.inline-flex.bg-red-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Cancelled')
  })

  it('displays correct application name for HOST type', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockHostRegistration
      },
      global: { plugins: [enI18n] }
    })

    const nameElement = wrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Downtown Unit')
  })

  it('displays correct application name for PLATFORM type', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockPlatformRegistration
      },
      global: { plugins: [enI18n] }
    })

    const nameElement = wrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Test Platform Inc.')
  })

  it('displays correct application name for STRATA_HOTEL type', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockStrataHotelRegistration
      },
      global: { plugins: [enI18n] }
    })

    const nameElement = wrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Doe Enterprises')
  })

  it('displays website button for STRATA_HOTEL type', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockStrataHotelRegistration
      },
      global: { plugins: [enI18n] }
    })

    const websiteButton = wrapper.findTestId('strata-brand-website')
    expect(websiteButton.exists()).toBe(true)
    expect(websiteButton.attributes('href')).toBe('https://luxurystays.com')
  })

  it('displays correct registration type for HOST', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockHostRegistration
      },
      global: { plugins: [enI18n] }
    })

    const typeElement = wrapper.findAll('.text-sm')[1]
    expect(typeElement.text()).toContain('Type: Host')
  })

  it('displays correct registration type for PLATFORM', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockPlatformRegistration
      },
      global: { plugins: [enI18n] }
    })

    const typeElement = wrapper.findAll('.text-sm')[1]
    expect(typeElement.text()).toContain('Type: Platform')
  })

  it('displays correct registration type for STRATA_HOTEL', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockStrataHotelRegistration
      },
      global: { plugins: [enI18n] }
    })
    const allText = wrapper.text()
    expect(allText).toContain('Type: Strata Hotel')
  })

  it('displays reviewer information when available', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        data: mockHostRegistration
      },
      global: { plugins: [enI18n] }
    })

    const reviewerElement = wrapper.findAll('.text-sm')[1]
    expect(reviewerElement.text()).toContain('Approved By: examiner1')
  })
})
