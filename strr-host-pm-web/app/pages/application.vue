<script setup lang="ts">
import { ConnectStepper, FormReviewConfirm } from '#components'

const { t } = useI18n()
const localePath = useLocalePath()
const strrModal = useStrrModals()
const { handlePaymentRedirect } = useNavigate()

const propertyStore = useHostPropertyStore()
const { unitDetails, propertyTypeFeeTriggers } = storeToRefs(propertyStore)
const { validateOwners } = useHostOwnerStore()
const documentsStore = useDocumentStore()
const {
  submitApplication,
  validateUserConfirmation,
  $reset: applicationReset
} = useHostApplicationStore()

// fee stuff
const {
  addReplaceFee,
  getFee,
  removeFee,
  setPlaceholderFilingTypeCode,
  setPlaceholderServiceFee
} = useConnectFeeStore()

setPlaceholderFilingTypeCode(StrrFeeCode.STR_HOST_1)

const hostFee1 = ref<ConnectFeeItem | undefined>(undefined)
const hostFee2 = ref<ConnectFeeItem | undefined>(undefined)
const hostFee3 = ref<ConnectFeeItem | undefined>(undefined)

onMounted(async () => {
  // TODO: check for application id in the route query, if there then load the application
  applicationReset()
  const [fee1, fee2] = await Promise.all([
    getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_HOST_1),
    getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_HOST_2)
  ])
  hostFee1.value = fee1
  hostFee2.value = fee2
  // TODO: expecting new fee code for this
  hostFee3.value = fee1
  if (hostFee1.value) {
    setPlaceholderServiceFee(hostFee1.value.serviceFees)
  }
})

const setFeeBasedOnProperty = () => {
  if (!hostFee1.value || !hostFee2.value || !hostFee3.value) {
    return
  }
  if (propertyTypeFeeTriggers.value.isEntireHomeAndPrincipalResidence) {
    removeFee(StrrFeeCode.STR_HOST_2)
    addReplaceFee(hostFee1.value)
  } else if (propertyTypeFeeTriggers.value.isEntireHomeAndNotPrincipalResidence) {
    removeFee(StrrFeeCode.STR_HOST_1)
    addReplaceFee(hostFee2.value)
  } else if (propertyTypeFeeTriggers.value.isSharedAccommodation) {
    removeFee(StrrFeeCode.STR_HOST_1)
    removeFee(StrrFeeCode.STR_HOST_2)
    hostFee3.value.quantity = unitDetails.value.numberOfRoomsForRent || 1
    hostFee3.value.quantityDesc = hostFee3.value.quantity > 1
      ? t('strr.word.room', hostFee3.value.quantity)
      : undefined
    addReplaceFee(hostFee3.value)
  } else {
    // set placeholder
    removeFee(StrrFeeCode.STR_HOST_1)
    removeFee(StrrFeeCode.STR_HOST_2)
  }
}

// manage fees only when typeofspace and rentalUnitSetupType change
watch(unitDetails, (newVal) => {
  if (newVal.typeOfSpace !== undefined && newVal.rentalUnitSetupType !== undefined) {
    setFeeBasedOnProperty()
  } else {
    removeFee(StrrFeeCode.STR_HOST_1)
    removeFee(StrrFeeCode.STR_HOST_2)
  }
}, { deep: true })

// stepper stuff
const steps = ref<Step[]>([
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-map-marker-plus-outline',
    complete: false,
    isValid: false,
    validationFn: () => (
      propertyStore.validateUnitAddress(true) as boolean &&
      propertyStore.validateUnitDetails(true) as boolean)
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-account-multiple-plus',
    complete: false,
    isValid: false,
    validationFn: () => validateOwners(true) as boolean
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-file-upload-outline',
    complete: false,
    isValid: false,
    validationFn: () => (
      propertyStore.validateBusinessLicense(true) as boolean &&
      documentsStore.validateRequiredDocuments().length === 0)
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-text-box-check-outline',
    complete: false,
    isValid: false,
    validationFn: () => validateUserConfirmation(true) as boolean
  }
])
const activeStepIndex = ref<number>(0)
const activeStep = ref<Step>(steps.value[activeStepIndex.value] as Step)
const stepperRef = shallowRef<InstanceType<typeof ConnectStepper> | null>(null)
const reviewFormRef = shallowRef<InstanceType<typeof FormReviewConfirm> | null>(null)

// need to cleanup the setButtonControl somehow
const handleSubmit = async () => {
  let formErrors: MultiFormValidationResult = []
  try {
    // TODO: move button management into composable ?
    // set buttons to loading state
    setButtonControl({
      leftButtons: [],
      rightButtons: [
        {
          action: () => undefined, // is disabled
          icon: 'i-mdi-chevron-left',
          label: t('btn.back'),
          variant: 'outline',
          disabled: true
        },
        {
          action: () => undefined, // is disabled
          icon: 'i-mdi-chevron-right',
          label: t('btn.submitAndPay'),
          trailing: true,
          loading: true
        }
      ]
    })

    activeStep.value.complete = true // set final review step as active before validation
    reviewFormRef.value?.validateConfirmation() // validate confirmation checkboxes on submit

    // TODO: use common fn for here and ReviewConfirm.vue
    // all step validations
    const validations = [
      propertyStore.validateBusinessLicense(),
      propertyStore.validateUnitAddress(),
      propertyStore.validateUnitDetails(),
      validateOwners(),
      validateUserConfirmation()
    ]

    const validationResults = await Promise.all(validations)
    formErrors = validationResults.flatMap(result => result as MultiFormValidationResult)
    // add documents section error if applicable
    if (documentsStore.validateRequiredDocuments().length > 0) {
      formErrors.push({
        formId: 'supporting-documents',
        success: false,
        errors: []
      })
    }

    const isApplicationValid = formErrors.every(result => result.success === true)

    console.info('is application valid: ', isApplicationValid, formErrors)

    // if all steps valid, submit form with store function
    if (isApplicationValid) {
      console.info('Submit')
      const { paymentToken, filingId, applicationStatus } = await submitApplication()
      const redirectPath = `/dashboard/${filingId}`
      if (applicationStatus === ApplicationStatus.PAYMENT_DUE) {
        handlePaymentRedirect(paymentToken, redirectPath)
      } else {
        await navigateTo(localePath(redirectPath))
      }
    } else {
      stepperRef.value?.buttonRefs[activeStepIndex.value]?.focus() // move focus to stepper on form validation errors
    }
  } catch (e) {
    logFetchError(e, 'Error creating strata application')
    strrModal.openAppSubmitError(e)
  } finally {
    // set buttons back to non loading state
    setButtonControl({
      leftButtons: [],
      rightButtons: [
        {
          action: () => stepperRef.value?.setPreviousStep(),
          icon: 'i-mdi-chevron-left',
          label: t('btn.back'),
          variant: 'outline'
        },
        {
          action: handleSubmit,
          icon: 'i-mdi-chevron-right',
          label: t('btn.submitAndPay'),
          trailing: true
        }
      ]
    })
  }
}

// TODO: musing - should we move this into the stepper component and add button items to the 'Step' object
watch(activeStepIndex, (val) => {
  const buttons: ConnectBtnControlItem[] = []
  if (val !== 0) {
    buttons.push({
      action: () => stepperRef.value?.setPreviousStep(),
      icon: 'i-mdi-chevron-left',
      label: t('btn.back'),
      variant: 'outline'
    })
  }
  const isLastStep = val === steps.value.length - 1
  buttons.push({
    action: isLastStep ? handleSubmit : () => stepperRef.value?.setNextStep(),
    icon: 'i-mdi-chevron-right',
    label: isLastStep ? t('btn.submitAndPay') : t(`strr.step.description.${val + 1}`),
    trailing: true
  })

  setButtonControl({ leftButtons: [], rightButtons: buttons })
}, { immediate: true })

// page stuff
useHead({
  title: t('strr.title.application')
})

definePageMeta({
  layout: 'connect-form',
  middleware: ['auth', 'require-account']
})

setBreadcrumbs([
  {
    label: t('label.bcregDash'),
    to: useRuntimeConfig().public.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
  { label: t('strr.title.dashboard'), to: localePath('/dashboard') },
  { label: t('strr.title.application') }
])
</script>
<template>
  <div class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1 :text="t('strr.title.application')" class="my-5" />
    <ModalGroupHelpAndInfo />
    <ConnectStepper
      ref="stepperRef"
      :key="0"
      v-model:steps="steps"
      v-model:active-step-index="activeStepIndex"
      v-model:active-step="activeStep"
      :stepper-label="$t('strr.step.stepperLabel')"
    />
    <div v-if="activeStepIndex === 0" key="define-your-rental">
      <FormDefineYourRental :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 1" key="add-entities">
      <FormAddOwners :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 2" key="add-documents">
      <FormAddDocuments
        :is-complete="activeStep.complete"
        @return-to-start="stepperRef?.setActiveStep(0)"
      />
    </div>
    <div v-if="activeStepIndex === 3" key="review-confirm">
      <FormReviewConfirm
        ref="reviewFormRef"
        :is-complete="activeStep.complete"
        @edit="stepperRef?.setActiveStep"
      />
    </div>
  </div>
</template>
