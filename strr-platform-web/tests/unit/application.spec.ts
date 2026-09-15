import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
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

const feeAmounts: Record<string, number> = {
  PLATREG_SM: 100,
  PLATREG_LG: 200,
  PLATREG_WV: 0,
  PLATRENEWM: 50,
  PLATRENEWL: 75,
  PLATRENEWV: 0
}
const makeFee = (code: string): ConnectFeeItem => ({
  filingTypeCode: code,
  filingType: 'Platform application',
  filingFees: feeAmounts[code]!,
  serviceFees: 1.5,
  total: feeAmounts[code]! + 1.5,
  futureEffectiveFees: 0,
  priorityFees: 0,
  processingFees: 0,
  tax: { gst: 0, pst: 0 }
})
let wrapper: Awaited<ReturnType<typeof mountSuspended>>

const mountApplication = async () => {
  wrapper = await mountSuspended(Application, {
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
  return wrapper
}

const setupApplicationData = (applicationType: string, id: string) => {
  setMockRoute({ applicationId: id })
  mockLoadPermitData.mockImplementation(() => {
    mockApplication.value = {
      header: {
        applicationNumber: id,
        applicationType,
        status: 'DRAFT'
      },
      registration: mockPlatformPermitDetails
    }
    mockPermitDetails.value = mockPlatformPermitDetails
  })
}

describe('Platform Application Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApplication.value = undefined
    mockPermitDetails.value = undefined
    mockShowPermitDetails.value = false
    mockLoadPermitData.mockReset()
    mockLoadPermitRegistrationData.mockReset()
    setMockRoute()
    const store = useStrrPlatformStore()
    store.$reset()
    store.isRegistrationRenewal = false
    store.renewalRegId = undefined
    const feeStore = useConnectFeeStore()
    feeStore.fees = {}
    vi.spyOn(feeStore, 'initAlternatePaymentMethod').mockResolvedValue(undefined)
    vi.spyOn(feeStore, 'getFee').mockImplementation((_entity, code) => Promise.resolve(makeFee(code)))
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.restoreAllMocks()
  })

  it('renders application page for new draft by default', async () => {
    const wrapper = await mountApplication()

    expect(wrapper.exists()).toBe(true)
    const store = useStrrPlatformStore()
    expect(store.isRegistrationRenewal).toBe(false)
    expect(mockLoadPermitData).not.toHaveBeenCalled()
    expect(useConnectFeeStore().getFee).toHaveBeenCalledWith('STRR', 'PLATREG_SM')
  })

  it('sets isRegistrationRenewal to true when deep linked application is a renewal', async () => {
    setupApplicationData('renewal', '105')

    const wrapper = await mountApplication()

    expect(wrapper.exists()).toBe(true)
    expect(mockLoadPermitData).toHaveBeenCalledWith('105', ApplicationType.PLATFORM)
    const store = useStrrPlatformStore()
    expect(store.isRegistrationRenewal).toBe(true)
    expect(useConnectFeeStore().getFee).toHaveBeenCalledWith('STRR', 'PLATRENEWV')
    expect(Object.keys(useConnectFeeStore().fees)).toEqual(['PLATRENEWV'])
  })

  it('leaves isRegistrationRenewal false when deep linked application is not a renewal', async () => {
    setupApplicationData('new', '106')

    const wrapper = await mountApplication()

    expect(wrapper.exists()).toBe(true)
    expect(mockLoadPermitData).toHaveBeenCalledWith('106', ApplicationType.PLATFORM)
    const store = useStrrPlatformStore()
    expect(store.isRegistrationRenewal).toBe(false)
    expect(Object.keys(useConnectFeeStore().fees)).toEqual(['PLATREG_WV'])
  })

  it('uses renewal fees when starting from a registration', async () => {
    setMockRoute({ renew: 'true' })
    useStrrPlatformStore().renewalRegId = '42'
    mockLoadPermitRegistrationData.mockImplementation(() => {
      mockPermitDetails.value = mockPlatformPermitDetails
      mockShowPermitDetails.value = true
    })
    await mountApplication()
    expect(useConnectFeeStore().getFee).toHaveBeenCalledWith('STRR', 'PLATRENEWV')
    expect(Object.keys(useConnectFeeStore().fees)).toEqual(['PLATRENEWV'])
  })

  it.each([false, true])('replaces the selected fee when details change (renewal=%s)', async (isRenewal) => {
    if (isRenewal) {
      setupApplicationData('renewal', '105')
    }
    await mountApplication()
    const businessStore = useStrrPlatformBusiness()
    const detailsStore = useStrrPlatformDetails()
    const feeStore = useConnectFeeStore()
    const codes = isRenewal ? ['PLATRENEWM', 'PLATRENEWL', 'PLATRENEWV'] : ['PLATREG_SM', 'PLATREG_LG', 'PLATREG_WV']

    businessStore.platformBusiness.hasCpbc = false
    detailsStore.platformDetails.listingSize = ListingSize.LESS_THAN_250
    await nextTick()
    expect(Object.keys(feeStore.fees)).toEqual([codes[0]])
    expect(feeStore.total).toBe(feeAmounts[codes[0]!]! + 1.5)

    detailsStore.platformDetails.listingSize = ListingSize.THOUSAND_AND_ABOVE
    await nextTick()
    expect(Object.keys(feeStore.fees)).toEqual([codes[1]])

    businessStore.platformBusiness.hasCpbc = true
    await nextTick()
    expect(Object.keys(feeStore.fees)).toEqual([codes[2]])
    expect(feeStore.fees[codes[2]!]?.waived).toBe(true)

    businessStore.platformBusiness.hasCpbc = false
    await nextTick()
    expect(Object.keys(feeStore.fees)).toEqual([codes[1]])
  })

  it('clears a previous renewal flag and fee when starting a new application', async () => {
    useStrrPlatformStore().isRegistrationRenewal = true
    useConnectFeeStore().addReplaceFee(makeFee('PLATRENEWM'))
    await mountApplication()
    expect(useStrrPlatformStore().isRegistrationRenewal).toBe(false)
    expect(useConnectFeeStore().getFee).toHaveBeenCalledWith('STRR', 'PLATREG_SM')
    expect(useConnectFeeStore().fees).toEqual({})
  })
})
