import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { enI18n } from '../mocks/i18n'
import { mockPlatformPermitDetails } from '../mocks/mockedData'
import Application from '~/pages/platform/application.vue'

const mockRoute = ref({
  query: {} as Record<string, string>,
  meta: {} as Record<string, any>
})

const setMockRoute = (query: Record<string, string> = {}) => {
  mockRoute.value = {
    query,
    meta: {}
  }
}

mockNuxtImport('useRoute', () => () => mockRoute.value)
mockNuxtImport('setOnBeforeSessionExpired', () => vi.fn())

const mockApplication = ref<any>(undefined)
const mockRegistration = ref<any>(undefined)
const mockPermitDetails = ref<any>(undefined)
const mockShowPermitDetails = ref(false)
const mockLoadPermitData = vi.fn()
const mockLoadPermitRegistrationData = vi.fn()
const mockSearchRegistrations = vi.fn()

mockNuxtImport('useStrrApi', () => () => ({
  postApplication: vi.fn(),
  searchRegistrations: mockSearchRegistrations
}))

mockNuxtImport('useStrrBasePermit', () => () => ({
  application: mockApplication,
  registration: mockRegistration,
  permitDetails: mockPermitDetails,
  showPermitDetails: mockShowPermitDetails,
  isPaidApplication: ref(false),
  downloadApplicationReceipt: vi.fn(),
  loadPermitData: mockLoadPermitData,
  loadPermitRegistrationData: mockLoadPermitRegistrationData
}))

mockNuxtImport('useConnectFeeStore', () => () => ({
  initAlternatePaymentMethod: vi.fn().mockResolvedValue(undefined),
  getFee: vi.fn().mockResolvedValue({ serviceFees: 0 }),
  addReplaceFee: vi.fn(),
  removeFee: vi.fn(),
  setPlaceholderFilingTypeCode: vi.fn(),
  setPlaceholderServiceFee: vi.fn()
}))

describe('Platform Application Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApplication.value = undefined
    setMockRoute()
    const store = useStrrPlatformStore()
    store.$reset()
  })

  it('renders application page for new draft by default', async () => {
    const wrapper = await mountSuspended(Application, {
      global: {
        plugins: [enI18n],
        stubs: {
          ConnectSpinner: true,
          ConnectTypographyH1: true,
          ModalGroupHelpAndInfo: true,
          ConnectStepper: true,
          FormContactInfo: true,
          FormPlatformBusinessDetails: true,
          FormPlatformDetails: true,
          FormPlatformReviewConfirm: true
        }
      }
    })

    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    const store = useStrrPlatformStore()
    expect(store.isRegistrationRenewal).toBe(false)
    expect(mockLoadPermitData).not.toHaveBeenCalled()
  })

  it('sets isRegistrationRenewal to true when deep linked application is a renewal', async () => {
    setMockRoute({ applicationId: '105' })

    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = {
        header: {
          applicationNumber: '105',
          applicationType: 'renewal',
          status: 'DRAFT'
        },
        registration: mockPlatformPermitDetails
      }
      mockPermitDetails.value = mockPlatformPermitDetails
    })

    const wrapper = await mountSuspended(Application, {
      global: {
        plugins: [enI18n],
        stubs: {
          ConnectSpinner: true,
          ConnectTypographyH1: true,
          ModalGroupHelpAndInfo: true,
          ConnectStepper: true,
          FormContactInfo: true,
          FormPlatformBusinessDetails: true,
          FormPlatformDetails: true,
          FormPlatformReviewConfirm: true
        }
      }
    })

    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(mockLoadPermitData).toHaveBeenCalledWith('105', ApplicationType.PLATFORM)
    const store = useStrrPlatformStore()
    expect(store.isRegistrationRenewal).toBe(true)
  })

  it('leaves isRegistrationRenewal false when deep linked application is not a renewal', async () => {
    setMockRoute({ applicationId: '106' })

    mockLoadPermitData.mockImplementation(() => {
      mockApplication.value = {
        header: {
          applicationNumber: '106',
          applicationType: 'new',
          status: 'DRAFT'
        },
        registration: mockPlatformPermitDetails
      }
      mockPermitDetails.value = mockPlatformPermitDetails
    })

    const wrapper = await mountSuspended(Application, {
      global: {
        plugins: [enI18n],
        stubs: {
          ConnectSpinner: true,
          ConnectTypographyH1: true,
          ModalGroupHelpAndInfo: true,
          ConnectStepper: true,
          FormContactInfo: true,
          FormPlatformBusinessDetails: true,
          FormPlatformDetails: true,
          FormPlatformReviewConfirm: true
        }
      }
    })

    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(mockLoadPermitData).toHaveBeenCalledWith('106', ApplicationType.PLATFORM)
    const store = useStrrPlatformStore()
    expect(store.isRegistrationRenewal).toBe(false)
  })
})
