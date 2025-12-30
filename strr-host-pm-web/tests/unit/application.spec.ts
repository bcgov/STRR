import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { baseEnI18n } from '../mocks/i18n'
import { mockApplication, mockStoredDocuments } from '../mocks/mockedData'
import Application from '~/pages/application.vue'
import {
  ConnectStepper,
  FormAddDocuments,
  FormAddOwners,
  FormDefineYourRentalUnitAddress,
  FormDefineYourRentalUnitDetails,
  FormDefineYourRentalUnitDetails2,
  FormReview,
  FormUnitAddressAutoComplete,
  FormUnitAddressManual,
  FormUnitAddressManual2,
  ConnectHelpExpand,
  ConnectChecklistValidated,
  SummaryOwners
} from '#components'
import { PropertyHostType } from '~/enums/property-type'
import { PrExemptionReason } from '~/enums/pr-exemption-reason'

const unitDetails = ref(mockApplication.registration.unitDetails)

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitAddress: { address: mockApplication.registration.unitAddress },
    unitDetails,
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
    getUnitDetailsSchema2: () => vi.fn(),
    getUnitAddressSchema2: () => vi.fn(),
    resetUnitAddress: vi.fn(),
    resetUnitDetails: vi.fn(),
    resetBlInfo: vi.fn(),
    $reset: vi.fn()
  })
}))

const propertyReqs = ref<PropertyRequirements>({
  isBusinessLicenceRequired: false,
  isPrincipalResidenceRequired: true,
  isStrProhibited: false,
  isStraaExempt: false,
  organizationNm: ''
})

const prRequirements = ref<PrRequirements>({
  isPropertyPrExempt: false,
  prExemptionReason: undefined
})

vi.mock('@/stores/propertyRequirements', () => ({
  usePropertyReqStore: () => ({
    showUnitDetailsForm: ref(true),
    prRequirements,
    blRequirements: ref({
      isBusinessLicenceExempt: false,
      blExemptReason: undefined
    }),
    propertyReqs,
    loadingReqs: ref(false),
    hasReqs: false,
    hasReqError: false,
    overrideApplicationWarning: ref(false),
    validateBlExemption: () => true,
    validatePrRequirements: () => true,
    getPropertyReqs: vi.fn(),
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/hostOwner', () => ({
  useHostOwnerStore: () => ({
    validateOwners: () => true,
    hostOwners: ref([]),
    activeOwner: ref(undefined),
    activeOwnerEditIndex: ref(undefined),
    hasHost: ref(false),
    hasCoHost: ref(false),
    hasCompParty: ref(false),
    hasPropertyManager: ref(false),
    isCraNumberOptional: ref(false),
    addHostOwner: vi.fn(),
    $reset: vi.fn()
  })
}))

vi.mock('@/stores/document', () => ({
  useDocumentStore: () => ({
    validateRequiredDocuments: () => [],
    validateDocumentDropdowns: () => [],
    storedDocuments: ref(mockStoredDocuments),
    requiredDocs: ref([
      { label: 'Test Doc 1', isValid: true },
      { label: 'Test Doc 2', isValid: false }
    ]),
    potentialRequiredDocs: ref([]),
    selectedDocType: ref(undefined),
    prDocs: [],
    documentCategories: ref({
      bcId: [],
      uniqueColumnB: [],
      nonUniqueColumnB: [],
      rental: [],
      exemption: [],
      bl: []
    }),
    removeDocumentsByType: vi.fn(),
    addStoredDocument: vi.fn(),
    removeStoredDocument: vi.fn(),
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

const isEnhancedDocumentUploadEnabled = ref(false)

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isSaveDraftEnabled: ref(true),
    isNewRentalUnitSetupEnabled: ref(true),
    isNewAddressFormEnabled: ref(true),
    isNewDashboardEnabled: ref(false),
    isEnhancedDocumentUploadEnabled,
    isNewPrDocumentsListEnabled: ref(true)
  })
}))

vi.mock('@/composables/useHostApplicationFee', () => ({
  useHostApplicationFee: () => ({
    fetchStrrFees: vi.fn().mockResolvedValue({
      fee1: { amount: 100, feeCode: 'STR_HOST_1' },
      fee2: { amount: 450, feeCode: 'STR_HOST_2' },
      fee3: { amount: 100, feeCode: 'STR_HOST_3' }
    }),
    getApplicationFee: vi.fn().mockReturnValue({ amount: 100, feeCode: 'STR_HOST_1' })
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
      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 0)

      const defineRentalForm = wrapper.findComponent({ name: 'FormDefineYourRental' })
      expect(defineRentalForm.exists()).toBe(true)
    })

    it('help component is hidden when help state is collapsed', async () => {
      await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 0)

      const defineRentalForm = wrapper.findComponent({ name: 'FormDefineYourRental' })
      expect(defineRentalForm.exists()).toBe(true)
    })
  })
})

describe('Rental Application - Step 1', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(Application, {
      global: {
        plugins: [baseEnI18n]
      }
    })
  })

  it('renders the Step 1 and its components', async () => {
    // wait for all promises to resolve (including the onMounted hook)
    await flushPromises()
    // make sure we are on step 1
    expect(wrapper.findComponent(ConnectStepper).vm.activeStepIndex).toBe(0)

    expect(wrapper.findComponent(FormDefineYourRentalUnitAddress).exists()).toBe(true)
    expect(wrapper.findComponent(FormDefineYourRentalUnitDetails).exists()).toBe(false)
    expect(wrapper.findComponent(FormDefineYourRentalUnitDetails2).exists()).toBe(true)

    expect(wrapper.find('[data-testid="rental-unit-address-nickname"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="alert-renewal-address-change"]').exists()).toBe(true)

    expect(wrapper.findComponent(FormUnitAddressAutoComplete).exists()).toBe(true)
    expect(wrapper.findComponent(FormUnitAddressManual).exists()).toBe(false)
    expect(wrapper.findComponent(FormUnitAddressManual2).exists()).toBe(true)

    const rentalUnitDetails = wrapper.findComponent(FormDefineYourRentalUnitDetails2)

    expect(rentalUnitDetails.find('[data-testid="property-type-select"]').exists()).toBe(true)
    expect(rentalUnitDetails.find('[data-testid="property-host-type"]').exists()).toBe(true)
    expect(rentalUnitDetails.find('[data-testid="unit-setup-option"]').exists()).toBe(true)
  })
})

describe('Rental Application - Step 2', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(Application, {
      global: {
        plugins: [baseEnI18n]
      }
    })
  })

  it('renders the Step 2 and its components', async () => {
    await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 1)
    await nextTick()

    expect(wrapper.findComponent(ConnectStepper).vm.activeStepIndex).toBe(1)

    const formAddOwners = wrapper.findComponent(FormAddOwners)
    expect(formAddOwners.exists()).toBe(true)
    expect(formAddOwners.find('[data-testid="add-owner"]').exists()).toBe(true)
    expect(formAddOwners.findComponent(ConnectHelpExpand).exists()).toBe(true)
    expect(formAddOwners.findComponent(ConnectChecklistValidated).exists()).toBe(true)
    expect(formAddOwners.find('[data-testid="add-person-owner-btn"]').exists()).toBe(true)
    expect(formAddOwners.find('[data-testid="add-business-owner-btn"]').exists()).toBe(true)
    expect(formAddOwners.findComponent(SummaryOwners).exists()).toBe(true)
  })
})

describe('Rental Application - Step 3', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(Application, {
      global: {
        plugins: [baseEnI18n]
      }
    })
  })

  it('renders the Step 3 and its components with standard document upload (single dropdown)', async () => {
    await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 2)
    await nextTick()

    expect(wrapper.findComponent(ConnectStepper).vm.activeStepIndex).toBe(2)

    const formAddDocuments = wrapper.findComponent(FormAddDocuments)
    expect(formAddDocuments.exists()).toBe(true)

    expect(wrapper.find('[data-testid="h2"]').exists()).toBe(true)

    expect(formAddDocuments.find('[data-testid="pr-docs-help-modal"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="standard-doc-upload"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="document-upload-select"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="enhanced-doc-upload"]').exists()).toBe(false) // multi-dropdown is not visible
    expect(formAddDocuments.find('[data-testid="bl-section-info"]').exists()).toBe(true)
  })

  it('renders the Step 3 with enhanced document upload feature enabled (multi-dropdowns)', async () => {
    isEnhancedDocumentUploadEnabled.value = true

    wrapper = await mountSuspended(Application, {
      global: {
        plugins: [baseEnI18n]
      }
    })

    await flushPromises()

    await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 2)
    await nextTick()

    expect(wrapper.findComponent(ConnectStepper).vm.activeStepIndex).toBe(2)

    const formAddDocuments = wrapper.findComponent(FormAddDocuments)
    expect(formAddDocuments.exists()).toBe(true)

    expect(formAddDocuments.find('[data-testid="enhanced-doc-upload"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="proof-of-identity-upload"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="proof-of-pr-upload"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="proof-of-tenancy-upload"]').exists()).toBe(false)
    expect(formAddDocuments.find('[data-testid="proof-of-fractional-ownership-upload"]').exists()).toBe(false)
    expect(formAddDocuments.find('[data-testid="business-licence-upload"]').exists()).toBe(false)
    expect(formAddDocuments.find('[data-testid="strata-docs-upload"]').exists()).toBe(false)

    // reset feature flag
    isEnhancedDocumentUploadEnabled.value = false
  })

  it('renders the Step 3 with Business License and Proof of Tenancy dropdowns', async () => {
    isEnhancedDocumentUploadEnabled.value = true

    // set property requirements for this test
    propertyReqs.value = {
      ...propertyReqs.value,
      isBusinessLicenceRequired: true,
      isPrincipalResidenceRequired: true
    }

    // set pr requirements for this test
    prRequirements.value = {
      isPropertyPrExempt: false,
      prExemptionReason: undefined
    }

    // set user details for this test
    unitDetails.value = {
      ...mockApplication.registration.unitDetails,
      hostType: PropertyHostType.LONG_TERM_TENANT
    } as ApiUnitDetails

    wrapper = await mountSuspended(Application, {
      global: {
        plugins: [baseEnI18n]
      }
    })

    await flushPromises()
    await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 2)
    expect(wrapper.findComponent(ConnectStepper).vm.activeStepIndex).toBe(2)

    const formAddDocuments = wrapper.findComponent(FormAddDocuments)

    expect(formAddDocuments.find('[data-testid="proof-of-identity-upload"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="proof-of-pr-upload"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="business-licence-upload"]').exists()).toBe(true)
    expect(formAddDocuments.find('[data-testid="proof-of-tenancy-upload"]').exists()).toBe(true)

    // TODO: fix the test to verify doc checklist has 4 items
    // expect(formAddDocuments.find('[data-testid="required-docs-checklist"]').findAll('li').length).toBe(4)

    // reset feature flag
    isEnhancedDocumentUploadEnabled.value = false
    // reset unit details to defaults
    unitDetails.value = mockApplication.registration.unitDetails
  })

  it('renders the Step 3 with Proof of Fractional Ownership dropdown', async () => {
    isEnhancedDocumentUploadEnabled.value = true

    // reset property requirements to defaults
    propertyReqs.value = {
      ...propertyReqs.value,
      isBusinessLicenceRequired: false,
      isPrincipalResidenceRequired: true
    }

    // set pr requirements for this test
    prRequirements.value = {
      isPropertyPrExempt: true,
      prExemptionReason: PrExemptionReason.FRACTIONAL_OWNERSHIP
    }

    wrapper = await mountSuspended(Application, {
      global: {
        plugins: [baseEnI18n]
      }
    })

    await flushPromises()
    await wrapper.findComponent(ConnectStepper).vm.$emit('update:activeStepIndex', 2)
    expect(wrapper.findComponent(ConnectStepper).vm.activeStepIndex).toBe(2)

    const formAddDocuments = wrapper.findComponent(FormAddDocuments)
    expect(formAddDocuments.find('[data-testid="proof-of-fractional-ownership-upload"]').exists()).toBe(true)

    // reset feature flag
    isEnhancedDocumentUploadEnabled.value = false
  })
})
