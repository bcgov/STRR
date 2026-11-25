import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive, ref } from 'vue'
import { baseEnI18n } from '../mocks/i18n'
import { mockApplication } from '../mocks/mockedData'
import { applicationPageStubs } from './helpers/renewal-test-utils'
import { EarlyRenewalAlert } from '#components'
import Application from '~/pages/application.vue'

const draftApplication = ref<any>(undefined)
const permitStore = reactive({
  application: draftApplication,
  registration: ref(undefined),
  isRegistrationRenewal: ref(true),
  effectiveRegistrationId: ref(undefined),
  $reset: vi.fn()
})
let header: Record<string, unknown> = {}
let buttonControl: ConnectBtnControl | undefined

mockNuxtImport('useLocalePath', () => () => (path: string) => path)
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: baseEnI18n.global
}))

vi.mock('vue-router', async importOriginal => ({
  ...await importOriginal<typeof import('vue-router')>(),
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('@/stores/hostPermit', () => ({ useHostPermitStore: () => permitStore }))

mockNuxtImport('useHostApplicationDraft', () => () => ({
  effectiveApplicationNumber: ref('123'),
  persistDraftApplicationId: vi.fn(),
  loadInitialPermitData: vi.fn(() => {
    draftApplication.value = { header }
  })
}))

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitAddress: { address: mockApplication.registration.unitAddress },
    unitDetails: ref(mockApplication.registration.unitDetails),
    blInfo: ref({ businessLicense: '', businessLicenseExpiryDate: '' }),
    validateUnitAddress: () => true,
    validateUnitDetails: () => true,
    validateBusinessLicense: () => true,
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/propertyRequirements', () => ({
  usePropertyReqStore: () => ({
    showUnitDetailsForm: ref(true),
    prRequirements: ref({ isPropertyPrExempt: false, prExemptionReason: undefined }),
    propertyReqs: ref({}),
    validateBlExemption: () => true,
    validatePrRequirements: () => true,
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/hostOwner', () => ({
  useHostOwnerStore: () => ({ validateOwners: () => true, $reset: vi.fn() })
}))

vi.mock('@/stores/document', () => ({
  useDocumentStore: () => ({
    validateRequiredDocuments: () => [],
    storedDocuments: ref([]),
    removeDocumentsByType: vi.fn(),
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/hostApplication', () => ({
  useHostApplicationStore: () => ({
    submitApplication: vi.fn(),
    validateUserConfirmation: () => true,
    $reset: vi.fn()
  })
}))

mockNuxtImport('useButtonControl', () => () => ({
  setButtonControl: (control: ConnectBtnControl) => { buttonControl = control },
  handleButtonLoading: vi.fn()
}))

mockNuxtImport('useHostFeatureFlags', () => () => ({
  isSaveDraftEnabled: ref(true),
  isNewDashboardEnabled: ref(false),
  isEnhancedDocumentUploadEnabled: ref(false)
}))

vi.mock('@/composables/useHostApplicationFee', () => ({
  useHostApplicationFee: () => ({
    fetchStrrFees: vi.fn().mockResolvedValue({
      fee1: { amount: 100, feeCode: 'STR_HOST_1', serviceFees: [] },
      fee2: { amount: 450, feeCode: 'STR_HOST_2' },
      fee3: { amount: 100, feeCode: 'STR_HOST_3' }
    }),
    getApplicationFee: vi.fn().mockReturnValue({ amount: 100, feeCode: 'STR_HOST_1' })
  })
}))

mockNuxtImport('useConnectFeeStore', () => () => ({
  addReplaceFee: vi.fn(),
  initAlternatePaymentMethod: vi.fn().mockResolvedValue(undefined),
  removeFee: vi.fn(),
  setPlaceholderFilingTypeCode: vi.fn(),
  setPlaceholderServiceFee: vi.fn()
}))

const StepperStub = defineComponent({
  name: 'ConnectStepper',
  emits: ['update:activeStepIndex'],
  setup: (_, { slots }) => () => h('div', slots.default?.())
})

const mountApplication = async () => {
  const wrapper = await mountSuspended(Application, {
    global: { plugins: [baseEnI18n], stubs: { ...applicationPageStubs, ConnectStepper: StepperStub } }
  })
  await flushPromises()
  return wrapper
}

const ALERT = '[data-testid="early-renewal-alert"]'

const lastButton = () => buttonControl!.rightButtons.at(-1)!

describe('Early renewal draft in the application wizard', () => {
  beforeEach(() => {
    draftApplication.value = undefined
    buttonControl = undefined
    header = { applicationNumber: '123', applicationType: 'renewal', status: 'DRAFT' }
  })

  it('shows the alert and blocks only the submit button before the window starts', async () => {
    header = { ...header, renewalWindowStartDate: '2027-01-15', hasRenewalWindowStarted: false }
    const wrapper = await mountApplication()

    expect(wrapper.find(ALERT).exists()).toBe(true)
    expect(wrapper.findComponent(EarlyRenewalAlert).props('date')).toBe('January 15, 2027')
    expect(lastButton()).toMatchObject({ disabled: false, locked: false })

    wrapper.findComponent(StepperStub).vm.$emit('update:activeStepIndex', 3)
    await flushPromises()
    expect(lastButton()).toMatchObject({ disabled: true, locked: true })
    expect(buttonControl!.leftButtons.some(button => button.disabled)).toBe(false)
  })

  it.each([
    ['the window has started', { renewalWindowStartDate: '2027-01-15', hasRenewalWindowStarted: true }],
    ['the API does not return a window', {}]
  ])('shows no alert and allows submit when %s', async (_, fields) => {
    header = { ...header, ...fields }
    const wrapper = await mountApplication()
    wrapper.findComponent(StepperStub).vm.$emit('update:activeStepIndex', 3)
    await flushPromises()

    expect(wrapper.find(ALERT).exists()).toBe(false)
    expect(lastButton()).toMatchObject({ disabled: false, locked: false })
  })
})
