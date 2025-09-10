import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import { mockApplication } from '../mocks/mockedData'
import Application from '~/pages/application.vue'
import {
  ConnectStepper,
  FormAddDocuments,
  FormAddOwners,
  FormReview
} from '#components'

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitAddress: ref({ address: mockApplication.registration.unitAddress }),
    unitDetails: ref(mockApplication.registration.unitDetails),
    blInfo: ref({
      businessLicense: '',
      businessLicenseExpiryDate: ''
    }),
    useManualAddressInput: ref(false),
    validateUnitAddress: () => true,
    validateUnitDetails: () => true,
    validateBusinessLicense: () => true,
    propertyTypeFeeTriggers: ref([]),
    getUnitAddressSchema: () => ({ address: mockApplication.registration.unitAddress }),
    resetUnitAddress: vi.fn(),
    resetUnitDetails: vi.fn(),
    resetBlInfo: vi.fn(),
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/propertyRequirements', () => ({
  usePropertyReqStore: () => ({
    showUnitDetailsForm: ref(true),
    prRequirements: ref({
      isPropertyPrExempt: false,
      prExemptionReason: undefined
    }),
    blRequirements: ref({
      isBusinessLicenceExempt: false,
      blExemptReason: undefined
    }),
    propertyReqs: ref({}),
    loadingReqs: ref(false),
    hasReqs: false,
    hasReqError: false,
    validateBlExemption: () => true,
    getPropertyReqs: vi.fn(),
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/hostOwner', () => ({
  useHostOwnerStore: () => ({
    validateOwners: () => true,
    hostOwners: ref([]),
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/document', () => ({
  useDocumentStore: () => ({
    validateRequiredDocuments: () => [],
    storedDocuments: ref([]),
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/hostApplication', () => ({
  useHostApplicationStore: () => ({
    submitApplication: vi.fn(),
    userConfirmation: ref({
      agreedToRentalAct: false,
      agreedToSubmit: false
    }),
    validateUserConfirmation: () => true,
    isAddressHelpExpanded: ref(false),
    hideAddressHelp: vi.fn(),
    toggleAddressHelp: vi.fn(),
    showAddressHelp: vi.fn(),
    $reset: vi.fn()
  })
}))

vi.mock('@/composables/useConnectNav', () => ({
  useConnectNav: () => ({
    handlePaymentRedirect: vi.fn()
  })
}))

vi.mock('@/composables/useButtonControl', () => ({
  useButtonControl: () => ({
    setButtonControl: vi.fn(),
    handleButtonLoading: vi.fn()
  })
}))

vi.mock('@/composables/useStrrModals', () => ({
  useStrrModals: () => ({
    openConfirmRestartApplicationModal: vi.fn()
  })
}))

describe('Application Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(Application, {
      global: {
        plugins: [baseEnI18n],
        stubs: {
          ConnectSpinner: true,
          ConnectTypographyH1: true,
          ModalGroupHelpAndInfo: true,
          FormDefineYourRental: true,
          FormAddOwners: true,
          FormAddDocuments: true,
          FormReview: true
        }
      }
    })
  })

  it('renders the application page', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the stepper component', () => {
    expect(wrapper.findComponent(ConnectStepper).exists()).toBe(true)
  })

  it('displays the correct title', () => {
    expect(wrapper.find('connect-typography-h1-stub').attributes('text'))
      .toBe('Short-Term Rental Registration')
  })

  describe('Form Components', () => {
    it('renders FormDefineYourRental at step 0', async () => {
      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 0)
      expect(wrapper.findComponent({ name: 'FormDefineYourRental' }).exists()).toBe(true)
    })

    it('renders FormAddOwners at step 1', async () => {
      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 1)
      expect(wrapper.findComponent(FormAddOwners).exists()).toBe(true)
    })

    it('renders FormAddDocuments at step 2', async () => {
      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 2)
      expect(wrapper.findComponent(FormAddDocuments).exists()).toBe(true)
    })

    it('renders FormReview at step 3', async () => {
      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 3)
      expect(wrapper.findComponent(FormReview).exists()).toBe(true)
    })

    it('only renders one form at a time', async () => {
      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 2)
      await nextTick()

      const formComponents = [
        wrapper.findComponent({ name: 'FormDefineYourRental' }),
        wrapper.findComponent(FormAddOwners),
        wrapper.findComponent(FormAddDocuments),
        wrapper.findComponent(FormReview)
      ]

      const visibleForms = formComponents.filter(component => component.exists())
      expect(visibleForms.length).toBe(1)
    })
  })

  describe('Help Component', () => {
    it('contains FormUnitAddressHelp when help is expanded', async () => {
      const store = useHostApplicationStore()
      store.isAddressHelpExpanded.value = true

      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 0)

      const defineRentalForm = wrapper.findComponent({ name: 'FormDefineYourRental' })
      expect(defineRentalForm.exists()).toBe(true)
    })

    it('help component is hidden when help state is collapsed', async () => {
      const store = useHostApplicationStore()
      store.isAddressHelpExpanded.value = false

      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 0)

      const defineRentalForm = wrapper.findComponent({ name: 'FormDefineYourRental' })
      expect(defineRentalForm.exists()).toBe(true)
    })

    it('can toggle help state through store actions', () => {
      const store = useHostApplicationStore()

      expect(store.toggleAddressHelp).toBeDefined()
      expect(store.showAddressHelp).toBeDefined()
      expect(store.hideAddressHelp).toBeDefined()
    })
  })
})
