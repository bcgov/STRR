import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPermitDetailsData } from '../mocks/mockedData'
import Application from '~/pages/strata-hotel/application.vue'
import { ConnectStepper } from '#components'

const setButtonControl = vi.fn()
const handleButtonLoading = vi.fn()
const handlePaymentRedirect = vi.fn()
const openErrorModal = vi.fn()
const openAppSubmitError = vi.fn()

mockNuxtImport('useButtonControl', () => () => ({ setButtonControl, handleButtonLoading }))
mockNuxtImport('useConnectNav', () => () => ({ handlePaymentRedirect }))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal, openAppSubmitError }))
mockNuxtImport('useStrataFeatureFlags', () => () => ({ isSaveDraftEnabled: ref(true) }))

const route = ref({ query: {} as Record<string, string>, meta: {} })
const application = ref<StrataApplicationResp>()
const registration = ref<StrataRegistrationResp>()
const permitDetails = ref(mockPermitDetailsData)
const showPermitDetails = ref(false)
const loadPermitData = vi.fn()
const loadPermitRegistrationData = vi.fn()

mockNuxtImport('useRoute', () => () => route.value)
mockNuxtImport('setOnBeforeSessionExpired', () => vi.fn())
mockNuxtImport('useStrrBasePermit', () => () => ({
  application,
  registration,
  permitDetails,
  showPermitDetails,
  isPaidApplication: ref(false),
  downloadApplicationReceipt: vi.fn(),
  loadPermitData,
  loadPermitRegistrationData
}))
mockNuxtImport('useStrrApi', () => () => ({
  getAccountRegistrations: vi.fn(),
  searchRegistrations: vi.fn()
}))

const makeFee = (code: string): ConnectFeeItem => ({
  filingTypeCode: code,
  filingType: 'Strata hotel application',
  filingFees: code === 'STRATRENEW' ? 50 : 100,
  serviceFees: 1.5,
  total: code === 'STRATRENEW' ? 51.5 : 101.5,
  futureEffectiveFees: 0,
  priorityFees: 0,
  processingFees: 0,
  tax: { gst: 0, pst: 0 }
})
let wrapper: Awaited<ReturnType<typeof mountSuspended>>

async function mountApplication () {
  wrapper = await mountSuspended(Application, {
    global: {
      stubs: {
        ConnectSpinner: true,
        ConnectTypographyH1: true,
        ConnectStepper: true,
        ModalGroupHelpAndInfo: true,
        FormContactInfo: true,
        FormBusinessDetails: true,
        FormStrataDetails: true,
        FormReviewConfirm: { template: '<div />', methods: { validateConfirmation: vi.fn() } }
      }
    }
  })
  await flushPromises()
}

function setupRenewalDraft () {
  route.value.query = { applicationId: '105' }
  loadPermitData.mockImplementation(() => {
    application.value = {
      header: { applicationNumber: '105', applicationType: 'renewal', status: 'DRAFT' },
      registration: mockPermitDetailsData
    } as StrataApplicationResp
  })
}

describe('Strata application fee schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadPermitData.mockReset()
    loadPermitRegistrationData.mockReset()
    route.value.query = {}
    showPermitDetails.value = false
    const strataStore = useStrrStrataStore()
    strataStore.$reset()
    strataStore.renewalRegId = undefined
    const feeStore = useConnectFeeStore()
    feeStore.fees = {}
    vi.spyOn(feeStore, 'initAlternatePaymentMethod').mockResolvedValue(undefined)
    vi.spyOn(feeStore, 'getFee').mockImplementation((_entity, code) => Promise.resolve(makeFee(code)))
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.restoreAllMocks()
  })

  it.each(['new', 'renewal', 'renewal draft'])('loads and displays the fee for a %s application', async (mode) => {
    if (mode === 'renewal') {
      route.value.query = { renew: 'true' }
      useStrrStrataStore().renewalRegId = '42'
      loadPermitRegistrationData.mockImplementation(() => { showPermitDetails.value = true })
    } else if (mode === 'renewal draft') {
      setupRenewalDraft()
    }
    await mountApplication()
    const code = mode === 'new' ? 'STRATAREG' : 'STRATRENEW'
    const feeStore = useConnectFeeStore()
    expect(feeStore.getFee).toHaveBeenCalledWith('STRR', code)
    expect(Object.keys(feeStore.fees)).toEqual([code])
    expect(feeStore.total).toBe(makeFee(code).total)
  })

  it('clears previous renewal state and fees when starting a new application', async () => {
    useStrrStrataStore().isRegistrationRenewal = true
    useConnectFeeStore().addReplaceFee(makeFee('STRATRENEW'))
    await mountApplication()
    expect(useStrrStrataStore().isRegistrationRenewal).toBe(false)
    expect(Object.keys(useConnectFeeStore().fees)).toEqual(['STRATAREG'])
  })

  it('clears a previous registration fee when the renewal fee cannot be loaded', async () => {
    setupRenewalDraft()
    const feeStore = useConnectFeeStore()
    feeStore.addReplaceFee(makeFee('STRATAREG'))
    vi.mocked(feeStore.getFee).mockResolvedValue(undefined)
    await mountApplication()
    expect(feeStore.fees).toEqual({})
    expect(feeStore.placeholderFeeItem.filingTypeCode).toBe('STRATRENEW')
  })

  describe('checkout fee availability', () => {
    beforeEach(() => {
      const validForm: MultiFormValidationResult = [{ formId: 'test', success: true, errors: [] }]
      vi.spyOn(useStrrContactStore(), 'validateContact').mockResolvedValue(validForm)
      vi.spyOn(useStrrStrataBusinessStore(), 'validateStrataBusiness').mockReturnValue(validForm)
      vi.spyOn(useStrrStrataDetailsStore(), 'validateStrataDetails').mockReturnValue(validForm)
      vi.spyOn(useDocumentStore(), 'validateDocuments').mockReturnValue(validForm)
      vi.spyOn(useStrrStrataApplicationStore(), 'validateStrataConfirmation').mockReturnValue(validForm)
      vi.spyOn(useStrrStrataApplicationStore(), 'submitStrataApplication').mockResolvedValue({
        paymentToken: 12345,
        filingId: '105',
        applicationStatus: ApplicationStatus.PAYMENT_DUE
      })
    })

    async function goToReview () {
      wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 3)
      await nextTick()
    }

    it.each([false, true])('blocks submission when the selected fee is unavailable (renewal=%s)', async (isRenewal) => {
      if (isRenewal) { setupRenewalDraft() }
      vi.mocked(useConnectFeeStore().getFee).mockResolvedValue(undefined)
      await mountApplication()
      await goToReview()
      await setButtonControl.mock.lastCall![0].rightButtons.at(-1).action()

      expect(useStrrStrataApplicationStore().submitStrataApplication).not.toHaveBeenCalled()
      expect(handlePaymentRedirect).not.toHaveBeenCalled()
      expect(openErrorModal).toHaveBeenCalledWith(
        'Unable to load registration fee',
        expect.stringMatching(/Save your application.*refresh/),
        false
      )
      expect(openAppSubmitError).not.toHaveBeenCalled()
      expect(handleButtonLoading).toHaveBeenLastCalledWith(true)
    })

    it('allows checkout when the selected fee has loaded', async () => {
      setupRenewalDraft()
      await mountApplication()
      await goToReview()
      await setButtonControl.mock.lastCall![0].rightButtons.at(-1).action()

      expect(useStrrStrataApplicationStore().submitStrataApplication).toHaveBeenCalledWith(false, '105')
      expect(handlePaymentRedirect).toHaveBeenCalledWith(12345, '/strata-hotel/dashboard/105')
      expect(openErrorModal).not.toHaveBeenCalled()
      expect(openAppSubmitError).not.toHaveBeenCalled()
    })

    it('allows saving a draft during a fee outage', async () => {
      setupRenewalDraft()
      vi.mocked(useConnectFeeStore().getFee).mockResolvedValue(undefined)
      await mountApplication()
      const saveButton = setButtonControl.mock.lastCall![0].leftButtons
        .find((button: ConnectBtnControlItem) => button.label === useNuxtApp().$i18n.t('btn.save'))
      await saveButton.action()

      expect(useStrrStrataApplicationStore().submitStrataApplication).toHaveBeenCalledWith(true, '105')
      expect(handlePaymentRedirect).not.toHaveBeenCalled()
      expect(openErrorModal).not.toHaveBeenCalled()
      expect(openAppSubmitError).not.toHaveBeenCalled()
    })
  })
})
