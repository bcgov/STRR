import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mockHostApplication, mockStrataApplication } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import RegistrationDetails from '~/pages/registration/[applicationId].vue'
import {
  RegistrationInfoHeader
} from '#components'
import type { HousApplicationResponse } from '~/types/application-response'

enum ApplicationType {
  HOST = 'HOST',
  PLATFORM = 'PLATFORM',
  STRATA_HOTEL = 'STRATA_HOTEL'
}

enum RegistrationStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED'
}

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    updateRegistrationStatus: vi.fn().mockResolvedValue(undefined),
    getApplicationById: vi.fn().mockResolvedValue({
      header: {
        ...mockHostApplication.header,
        registrationStartDate: new Date('2025-01-01T10:30:00.000000+00:00'),
        registrationEndDate: new Date('2026-01-01T10:30:00.000000+00:00'),
        registrationStatus: RegistrationStatus.ACTIVE,
        registrationNumber: 'REG12345678',
        registrationId: 12345,
        reviewer: {
          username: 'examiner1',
          displayName: 'Examiner One'
        }
      },
      registration: mockHostApplication.registration
    })
  })
}))

const extendedMockHostApplication = {
  header: {
    ...mockHostApplication.header,
    registrationStartDate: new Date('2025-01-01T10:30:00.000000+00:00'),
    registrationEndDate: new Date('2026-01-01T10:30:00.000000+00:00'),
    registrationStatus: RegistrationStatus.ACTIVE,
    registrationNumber: 'REG12345678',
    registrationId: 12345,
    reviewer: {
      username: 'examiner1',
      displayName: 'Examiner One'
    }
  },
  registration: mockHostApplication.registration
} as unknown as HousApplicationResponse

const createMockWithStatus = (status: RegistrationStatus): HousApplicationResponse => ({
  ...extendedMockHostApplication,
  header: {
    ...extendedMockHostApplication.header,
    registrationStatus: status
  }
}) as unknown as HousApplicationResponse

const mockPlatformApplication = {
  ...extendedMockHostApplication,
  registration: {
    ...extendedMockHostApplication.registration,
    registrationType: ApplicationType.PLATFORM,
    businessDetails: {
      legalName: 'Test Platform Inc.'
    }
  }
} as unknown as HousApplicationResponse

const mockStrataHotelApplication = {
  ...mockStrataApplication,
  header: {
    ...mockStrataApplication.header,
    registrationStartDate: new Date('2025-01-01T10:30:00.000000+00:00'),
    registrationEndDate: new Date('2026-01-01T10:30:00.000000+00:00'),
    registrationStatus: RegistrationStatus.ACTIVE,
    registrationNumber: 'REG12345678',
    registrationId: 12345,
    reviewer: {
      username: 'examiner1',
      displayName: 'Examiner One'
    }
  }
} as unknown as HousApplicationResponse

const mockExpiredRegistration = createMockWithStatus(RegistrationStatus.EXPIRED)
const mockSuspendedRegistration = createMockWithStatus(RegistrationStatus.SUSPENDED)
const mockCancelledRegistration = createMockWithStatus(RegistrationStatus.CANCELLED)

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
        application: extendedMockHostApplication
      },
      global: { plugins: [enI18n] }
    })
    const badge = wrapper.find('.inline-flex.bg-green-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('ACTIVE')
  })

  it('displays correct badge color for EXPIRED status', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: mockExpiredRegistration
      },
      global: { plugins: [enI18n] }
    })
    const badge = wrapper.find('.inline-flex.bg-red-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('EXPIRED')
  })

  it('displays correct badge color for SUSPENDED status', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: mockSuspendedRegistration
      },
      global: { plugins: [enI18n] }
    })
    const badge = wrapper.find('.inline-flex.bg-blue-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('SUSPENDED')
  })

  it('displays correct badge color for CANCELLED status', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: mockCancelledRegistration
      },
      global: { plugins: [enI18n] }
    })
    const badge = wrapper.find('.inline-flex.bg-red-500')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('CANCELLED')
  })

  it('displays correct application name for HOST type', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: extendedMockHostApplication
      },
      global: { plugins: [enI18n] }
    })

    const nameElement = wrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Downtown Unit')
  })

  it('displays correct application name for PLATFORM type', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: mockPlatformApplication
      },
      global: { plugins: [enI18n] }
    })

    const nameElement = wrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Test Platform Inc.')
  })

  it('displays correct application name for STRATA_HOTEL type', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: mockStrataHotelApplication
      },
      global: { plugins: [enI18n] }
    })

    const nameElement = wrapper.find('.text-2xl')
    expect(nameElement.text()).toContain('Doe Enterprises')
  })

  it('displays website button for STRATA_HOTEL type', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: mockStrataHotelApplication
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
        application: extendedMockHostApplication
      },
      global: { plugins: [enI18n] }
    })

    const typeElement = wrapper.findAll('.text-sm')[1]
    expect(typeElement.text()).toContain('Type: Host')
  })

  it('displays correct registration type for PLATFORM', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: mockPlatformApplication
      },
      global: { plugins: [enI18n] }
    })

    const typeElement = wrapper.findAll('.text-sm')[1]
    expect(typeElement.text()).toContain('Type: Platform')
  })

  it('displays correct registration type for STRATA_HOTEL', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: mockStrataHotelApplication
      },
      global: { plugins: [enI18n] }
    })
    const allText = wrapper.text()
    expect(allText).toContain('Type: Strata Hotel')
  })

  it('displays reviewer information when available', async () => {
    wrapper = await mountSuspended(RegistrationInfoHeader, {
      props: {
        application: extendedMockHostApplication
      },
      global: { plugins: [enI18n] }
    })

    const reviewerElement = wrapper.findAll('.text-sm')[1]
    expect(reviewerElement.text()).toContain('Approved By: examiner1')
  })
})
