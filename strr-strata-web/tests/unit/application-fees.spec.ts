import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPermitDetailsData } from '../mocks/mockedData'
import Application from '~/pages/strata-hotel/application.vue'

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
        FormReviewConfirm: true
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
})
