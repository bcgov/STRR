import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { enI18n } from '../mocks/i18n'
import { mockPlatformPermitDetails } from '../mocks/mockedData'
import Application from '~/pages/platform/application.vue'
import { ConnectStepper } from '#components'

const setButtonControl = vi.fn()
const handleButtonLoading = vi.fn()
const handlePaymentRedirect = vi.fn()
const openErrorModal = vi.fn()
const openAppSubmitError = vi.fn()

mockNuxtImport('useButtonControl', () => () => ({ setButtonControl, handleButtonLoading }))
mockNuxtImport('useConnectNav', () => () => ({ handlePaymentRedirect }))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal, openAppSubmitError }))

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
        FormPlatformReviewConfirm: { template: '<div />', methods: { validateConfirmation: vi.fn() } }
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

  describe('checkout fee availability', () => {
    beforeEach(() => {
      const validForm: MultiFormValidationResult = [{ formId: 'test', success: true, errors: [] }]
      vi.spyOn(useStrrContactStore(), 'validateContact').mockResolvedValue(validForm)
      vi.spyOn(useStrrPlatformBusiness(), 'validatePlatformBusiness').mockReturnValue(validForm)
      vi.spyOn(useStrrPlatformDetails(), 'validatePlatformDetails').mockReturnValue(validForm)
      vi.spyOn(useStrrPlatformApplication(), 'validatePlatformConfirmation').mockReturnValue(validForm)
      vi.spyOn(useStrrPlatformApplication(), 'submitPlatformApplication').mockResolvedValue({
        paymentToken: 12345,
        filingId: '105',
        applicationStatus: ApplicationStatus.PAYMENT_DUE
      })
      vi.spyOn(useConnectLaunchdarklyStore(), 'getStoredFlag').mockReturnValue(true)
    })

    async function goToReview () {
      wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 3)
      await nextTick()
    }

    it.each([
      { applicationType: 'new', code: 'PLATREG_WV' },
      { applicationType: 'renewal', code: 'PLATRENEWV' }
    ])('blocks submission when the selected $applicationType fee is unavailable', async ({ applicationType, code }) => {
      setupApplicationData(applicationType, '105')
      vi.mocked(useConnectFeeStore().getFee).mockImplementation((_entity, requestedCode) =>
        Promise.resolve(requestedCode === code ? undefined : makeFee(requestedCode)))
      await mountApplication()
      await goToReview()
      await setButtonControl.mock.lastCall![0].rightButtons.at(-1).action()

      expect(useStrrPlatformApplication().submitPlatformApplication).not.toHaveBeenCalled()
      expect(handlePaymentRedirect).not.toHaveBeenCalled()
      expect(openErrorModal).toHaveBeenCalledWith(
        'Unable to load registration fee',
        expect.stringMatching(/Save your application.*refresh/),
        false
      )
      expect(openAppSubmitError).not.toHaveBeenCalled()
      expect(handleButtonLoading).toHaveBeenLastCalledWith(true)
    })

    it.each(['PLATREG_SM', 'PLATREG_LG', 'PLATREG_WV'])(
      'allows checkout with a loaded %s fee when other fees fail', async (code) => {
        setupApplicationData('new', '105')
        const feeStore = useConnectFeeStore()
        vi.mocked(feeStore.getFee).mockImplementation((_entity, requestedCode) =>
          Promise.resolve(requestedCode === code ? makeFee(code) : undefined))
        await mountApplication()
        useStrrPlatformBusiness().platformBusiness.hasCpbc = code === 'PLATREG_WV'
        useStrrPlatformDetails().platformDetails.listingSize = code === 'PLATREG_LG'
          ? ListingSize.THOUSAND_AND_ABOVE
          : ListingSize.LESS_THAN_250
        await goToReview()
        if (code === 'PLATREG_WV') {
          expect(feeStore.fees[code]?.waived).toBe(true)
        }
        await setButtonControl.mock.lastCall![0].rightButtons.at(-1).action()

        expect(useStrrPlatformApplication().submitPlatformApplication).toHaveBeenCalledWith(false, '105')
        expect(handlePaymentRedirect).toHaveBeenCalledWith(12345, '/platform/dashboard')
        expect(openErrorModal).not.toHaveBeenCalled()
        expect(openAppSubmitError).not.toHaveBeenCalled()
      })

    it('allows saving a draft during a fee outage', async () => {
      setupApplicationData('renewal', '105')
      vi.mocked(useConnectFeeStore().getFee).mockResolvedValue(undefined)
      await mountApplication()
      const saveButton = setButtonControl.mock.lastCall![0].leftButtons
        .find((button: ConnectBtnControlItem) => button.label === useNuxtApp().$i18n.t('btn.save'))
      await saveButton.action()

      expect(useStrrPlatformApplication().submitPlatformApplication).toHaveBeenCalledWith(true, '105')
      expect(handlePaymentRedirect).not.toHaveBeenCalled()
      expect(openErrorModal).not.toHaveBeenCalled()
      expect(openAppSubmitError).not.toHaveBeenCalled()
    })
  })
})
