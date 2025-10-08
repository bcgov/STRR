<script setup lang="ts">
import { ConnectStepper, FormReview } from '#components'
const { t } = useNuxtApp().$i18n
const localePath = useLocalePath()
const strrModal = useStrrModals()
const { handlePaymentRedirect } = useConnectNav()
const { setButtonControl, handleButtonLoading } = useButtonControl()

const propertyStore = useHostPropertyStore()
const propertyReqStore = usePropertyReqStore()
const { unitDetails, propertyTypeFeeTriggers } = storeToRefs(propertyStore)
const { showUnitDetailsForm, prRequirements } = storeToRefs(propertyReqStore)
const { validateOwners } = useHostOwnerStore()
const documentsStore = useDocumentStore()
const {
  submitApplication,
  validateUserConfirmation,
  $reset: applicationReset
} = useHostApplicationStore()
const permitStore = useHostPermitStore()

const { applicationId, registrationId, isRenewal } = useRouterParams()
const { isSaveDraftEnabled, isNewRentalUnitSetupEnabled } = useHostFeatureFlags()
const { fetchStrrFees, getApplicationFee } = useHostApplicationFee()
const loading = ref(false)

// fee stuff
const {
  addReplaceFee,
  initAlternatePaymentMethod,
  removeFee,
  setPlaceholderFilingTypeCode,
  setPlaceholderServiceFee
} = useConnectFeeStore()

setPlaceholderFilingTypeCode(StrrFeeCode.STR_HOST_1)

const hostFee1 = ref<ConnectFeeItem | undefined>(undefined)
const hostFee2 = ref<ConnectFeeItem | undefined>(undefined)
const hostFee3 = ref<ConnectFeeItem | undefined>(undefined)
const hostFee4 = ref<ConnectFeeItem | undefined>(undefined)

onMounted(async () => {
  loading.value = true
  await initAlternatePaymentMethod()
  applicationReset()
  permitStore.$reset()

  if (isRenewal.value && registrationId.value) {
    await permitStore.loadHostRegistrationData(registrationId.value)
    permitStore.isRegistrationRenewal = true
  } else if (applicationId.value) {
    await permitStore.loadHostData(applicationId.value, true)
  }

  const { fee1, fee2, fee3 } = await fetchStrrFees()

  hostFee1.value = { ...fee1 }
  hostFee2.value = { ...fee2 }
  hostFee3.value = { ...fee3 }
  hostFee4.value = { ...fee1 } // TODO: expecting new fee code for this (hostFee4 - shared accommodation)
  if (hostFee1.value) {
    setPlaceholderServiceFee(hostFee1.value.serviceFees)
  }

  setBreadcrumbs([
    {
      label: t('label.bcregDash'),
      to: useRuntimeConfig().public.registryHomeURL + 'dashboard',
      appendAccountId: true,
      external: true
    },
    { label: t('strr.title.dashboard'), to: localePath('/dashboard') },
    {
      label: (permitStore.isRegistrationRenewal
        ? t('strr.title.renewalApplication')
        : t('strr.title.application'))
    }
  ])

  loading.value = false
})

const resetFees = () => {
  removeFee(StrrFeeCode.STR_HOST_1)
  removeFee(StrrFeeCode.STR_HOST_2)
  removeFee(StrrFeeCode.STR_HOST_3)
}

const setFeeBasedOnProperty = () => {
  if (!hostFee1.value || !hostFee2.value || !hostFee3.value || !hostFee4.value) {
    return
  }
  resetFees()
  if (propertyTypeFeeTriggers.value.isEntireHomeAndPrincipalResidence) {
    addReplaceFee(hostFee1.value)
  } else if (propertyTypeFeeTriggers.value.isEntireHomeAndNotPrincipalResidence) {
    addReplaceFee(hostFee2.value)
  } else if (propertyTypeFeeTriggers.value.isSharedAccommodation) {
    if (propertyTypeFeeTriggers.value.isBBorRecProperty) {
      addReplaceFee(hostFee3.value)
    } else {
      hostFee4.value.quantity = unitDetails.value.numberOfRoomsForRent || 1
      addReplaceFee(hostFee4.value)
    }
  } else {
    // set placeholder
    resetFees()
  }
  hostFee4.value.quantityDesc = hostFee4.value.quantity !== undefined && hostFee4.value.quantity > 1
    ? t('strr.word.room', hostFee4.value.quantity)
    : undefined
}

// manage fees only when typeOfSpace, rentalUnitSetupType or propertyType change
// for new rental unit form - do not calculate the fees, it will be calculated on the last step
watch(unitDetails, (newVal) => {
  if (newVal.typeOfSpace && newVal.rentalUnitSetupType && newVal.propertyType && !isNewRentalUnitSetupEnabled) {
    setFeeBasedOnProperty()
  } else {
    resetFees()
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
      propertyStore.validateUnitDetails(true) as boolean &&
      propertyReqStore.validateBlExemption(true) as boolean &&
      propertyReqStore.validatePrRequirements(true) as boolean
    )
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
      documentsStore.validateRequiredDocuments().length === 0 &&
      showUnitDetailsForm.value)
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
const draftApplicationId = ref<string | undefined>(undefined)
const activeStep = ref<Step>(steps.value[activeStepIndex.value] as Step)
const stepperRef = shallowRef<InstanceType<typeof ConnectStepper> | null>(null)
const reviewFormRef = shallowRef<InstanceType<typeof FormReview> | null>(null)

const saveApplication = async (resumeLater = false) => {
  handleButtonLoading(false, 'left', resumeLater ? 1 : 2)
  // prevent flicker of buttons by waiting half a second
  try {
    let appId = applicationId.value
    if (draftApplicationId.value) {
      appId = draftApplicationId.value
    }
    const [, { filingId }] = await Promise.all([
      new Promise(resolve => setTimeout(resolve, 500)),
      submitApplication(true, appId)
    ])
    draftApplicationId.value = filingId
    applicationId.value = filingId
    if (resumeLater) {
      await navigateTo(localePath('/dashboard'))
    } else {
      // update route meta to save application before session expires with new application id
      setOnBeforeSessionExpired(() => submitApplication(true, filingId))
    }
  } catch (e) {
    logFetchError(e, 'Error saving host application')
    strrModal.openAppSubmitError(e)
  } finally {
    handleButtonLoading(true)
  }
}

// need to cleanup the setButtonControl somehow
const handleSubmit = async () => {
  let formErrors: MultiFormValidationResult = []
  try {
    // set buttons to loading state
    handleButtonLoading(false, 'right', 1)

    activeStep.value.complete = true // set final review step as active before validation
    reviewFormRef.value?.validateConfirmation() // validate confirmation checkboxes on submit

    // TODO: use common fn for here and ReviewConfirm.vue
    // all step validations
    const validations = [
      propertyStore.validateBusinessLicense(),
      propertyStore.validateUnitAddress(),
      propertyStore.validateUnitDetails(),
      validateOwners(),
      validateUserConfirmation(),
      propertyReqStore.validateBlExemption(),
      propertyReqStore.validatePrRequirements()
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
    // console.info('is application valid: ', isApplicationValid, formErrors)

    // if all steps valid, submit form with store function
    if (isApplicationValid) {
      const { paymentToken, filingId, applicationStatus } = await submitApplication(false, applicationId.value)
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
    handleButtonLoading(true)
  }
}

// TODO: musing - should we move this into the stepper component and add button items to the 'Step' object
watch([activeStepIndex, () => permitStore.isRegistrationRenewal], () => {
  const buttons: ConnectBtnControlItem[] = []
  if (activeStepIndex.value !== 0) {
    buttons.push({
      action: () => stepperRef.value?.setPreviousStep(),
      icon: 'i-mdi-chevron-left',
      label: t('btn.back'),
      variant: 'outline'
    })
  }
  const isLastStep = activeStepIndex.value === steps.value.length - 1
  buttons.push({
    action: isLastStep ? handleSubmit : () => stepperRef.value?.setNextStep(),
    icon: 'i-mdi-chevron-right',
    label: isLastStep ? t('btn.submitAndPay') : t(`strr.step.description.${activeStepIndex.value + 1}`),
    trailing: true
  })

  // default left side action buttons
  const leftActionButtons: ConnectBtnControlItem[] = [
    { action: () => navigateTo(localePath('/dashboard')), label: t('btn.cancel'), variant: 'outline' }
  ]

  leftActionButtons.push(
    { action: () => saveApplication(true), label: t('btn.saveExit'), variant: 'outline' },
    { action: saveApplication, label: t('btn.save'), variant: 'outline' }
  )

  setButtonControl({
    leftButtons: isSaveDraftEnabled ? leftActionButtons : [],
    rightButtons: buttons
  })
}, { immediate: true })

// remove unnecessary docs when/if exemption options change
watch(() => prRequirements.value.prExemptionReason, async (newVal) => {
  // only execute if unit details form shown - (application has been started)
  // and is not in registration renewal flow
  if (showUnitDetailsForm.value && (!permitStore.isRegistrationRenewal && !loading.value)) {
    // remove all permanent residence proof docs when user select exemption reason
    const docsToDelete = [...documentsStore.prDocs]

    switch (newVal) {
      case PrExemptionReason.FRACTIONAL_OWNERSHIP:
        docsToDelete.push(DocumentUploadType.STRATA_HOTEL_DOCUMENTATION)
        break
      case PrExemptionReason.STRATA_HOTEL:
        docsToDelete.push(DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT)
        break
      default:
        // remove all exemption docs when reason is farm land or undefined
        // (undefined when user has checked and then unchecked theyre exempt)
        // will need to be updated if any of the exemption docs rules change
        docsToDelete.push(...documentsStore.documentCategories.exemption)
        break
    }
    await documentsStore.removeDocumentsByType(docsToDelete)
  }
})

// remove rental docs if ownership type !== rent
watch(() => unitDetails.value.ownershipType, async (newVal) => {
  // only execute if unit details form shown - (application has been started)
  if (showUnitDetailsForm.value && newVal !== undefined && newVal !== OwnershipType.RENT) {
    await documentsStore.removeDocumentsByType(documentsStore.documentCategories.rental)
  }
})

// watch the Stepper to calculate application fees on Review and Confirm step only
watch(activeStepIndex, (val) => {
  if (!isNewRentalUnitSetupEnabled) { return } // get fees for new rental unit setup only
  const { propertyType, rentalUnitSetupOption } = unitDetails.value
  const isReviewStep = val === 3 // get fees when on Review step only
  const hasValidSteps = steps.value.slice(0, 3).every(step => step.isValid) // biz requirement: steps 1-3 must be valid

  if (propertyType && rentalUnitSetupOption && isReviewStep && hasValidSteps) {
    const applicationFee = getApplicationFee(propertyType, rentalUnitSetupOption) // get the fee from the fee matrix
    addReplaceFee(applicationFee)
  } else {
    resetFees()
  }
})

// page stuff
useHead({
  title: t('strr.title.application')
})

definePageMeta({
  layout: 'connect-form',
  middleware: ['auth', 'check-tos', 'require-account'],
  onAccountChange: (_: Account, newAccount: Account) => {
    useStrrModals().openConfirmSwitchAccountModal(
      newAccount.id,
      useLocalePath()('/dashboard')
    )
    return false
  }
})

// save application before session expires
setOnBeforeSessionExpired(() => submitApplication(true, applicationId.value))
</script>
<template>
  <ConnectSpinner v-if="loading" overlay />
  <div v-else class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1
      :text="permitStore.isRegistrationRenewal
        ? t('strr.title.renewalApplication') : t('strr.title.application')"
      class="my-5"
    />
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
      <FormReview
        ref="reviewFormRef"
        :is-complete="activeStep.complete"
        @edit="stepperRef?.setActiveStep"
      />
    </div>
  </div>
</template>
