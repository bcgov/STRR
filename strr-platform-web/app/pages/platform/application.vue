<script setup lang="ts">
import { ConnectStepper, FormPlatformReviewConfirm } from '#components'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const strrModal = useStrrModals()
const { handlePaymentRedirect } = useConnectNav()
const { setButtonControl, handleButtonLoading } = useButtonControl()
const ldStore = useConnectLaunchdarklyStore()

const { validateContact } = useStrrContactStore()
const { validatePlatformBusiness } = useStrrPlatformBusiness()
const { validatePlatformDetails } = useStrrPlatformDetails()
const {
  submitPlatformApplication,
  validatePlatformConfirmation,
  $reset: applicationReset
} = useStrrPlatformApplication()
const platformStore = useStrrPlatformStore()
const {
  renewalRegId,
  isRegistrationRenewal
} = storeToRefs(useStrrPlatformStore())

const { platformDetails } = storeToRefs(useStrrPlatformDetails())
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())

const applicationId = ref(route.query.applicationId as string)
const isRenewal = ref(Boolean(route.query.renew))
const isRegRenewalFlow = computed(() => isRenewal.value && renewalRegId.value)
const loading = ref(false)

// fee stuff
const {
  addReplaceFee,
  getFee,
  removeFee,
  setPlaceholderFilingTypeCode,
  setPlaceholderServiceFee,
  initAlternatePaymentMethod
} = useConnectFeeStore()

setPlaceholderFilingTypeCode(StrrFeeCode.STR_PLAT_SM)

const platFeeSm = ref<ConnectFeeItem | undefined>(undefined)
const platFeeLg = ref<ConnectFeeItem | undefined>(undefined)
const platFeeWv = ref<ConnectFeeItem | undefined>(undefined)
onMounted(async () => {
  loading.value = true
  await initAlternatePaymentMethod()

  applicationReset()

  const [smallFeeResp, largeFeeResp, waivedFeeResp] = await Promise.all([
    getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_PLAT_SM),
    getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_PLAT_LG),
    getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_PLAT_WV)
  ])
  platFeeSm.value = smallFeeResp
  platFeeLg.value = largeFeeResp
  platFeeWv.value = waivedFeeResp

  if (isRegRenewalFlow.value) {
    isRegistrationRenewal.value = true
    await platformStore.loadPlatformRegistrationData(renewalRegId.value!)
  } else if (applicationId.value) {
    await platformStore.loadPlatform(applicationId.value, true)
  }

  setBreadcrumbs([
    {
      label: t('label.bcregDash'),
      to: useRuntimeConfig().public.registryHomeURL + 'dashboard',
      appendAccountId: true,
      external: true
    },
    { label: t('strr.title.dashboard'), to: localePath('/platform/dashboard') },
    {
      label: isRegistrationRenewal.value
        ? t('strr.title.renewalApplication')
        : t('strr.title.application')
    }
  ])

  if (platFeeWv.value && platFeeSm.value) {
    // NOTE: setting 'waived' changes the text to 'No Fee' instead of $0.00
    platFeeWv.value.waived = true
    setPlaceholderServiceFee(platFeeSm.value.serviceFees)
  }
  loading.value = false
})

watch(() => platformBusiness.value?.hasCpbc, (val) => {
  if (val && platFeeWv.value) {
    removeFee(StrrFeeCode.STR_PLAT_SM)
    removeFee(StrrFeeCode.STR_PLAT_LG)
    addReplaceFee(platFeeWv.value)
  } else {
    removeFee(StrrFeeCode.STR_PLAT_WV)
    setFeeBasedOnListingSize(platformDetails.value.listingSize)
  }
})

const setFeeBasedOnListingSize = (listingSize: ListingSize | undefined) => {
  if (platFeeSm.value && platFeeLg.value && listingSize) {
    if (listingSize === ListingSize.THOUSAND_AND_ABOVE) {
      // large fee for greater than 1000
      removeFee(StrrFeeCode.STR_PLAT_SM)
      addReplaceFee(platFeeLg.value)
    } else { // both listing size options under 1000 have the same fee
      removeFee(StrrFeeCode.STR_PLAT_LG)
      addReplaceFee(platFeeSm.value)
    }
  }
}

watch(() => platformDetails.value.listingSize, (val) => {
  if (!platformBusiness.value?.hasCpbc) {
    setFeeBasedOnListingSize(val)
  }
})

// stepper stuff
const steps = ref<Step[]>([
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-account-multiple-plus',
    complete: false,
    isValid: false,
    validationFn: async () => await validateContact(true) as boolean
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-domain-plus',
    complete: false,
    isValid: false,
    validationFn: () => validatePlatformBusiness(true) as boolean
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-earth',
    complete: false,
    isValid: false,
    validationFn: () => validatePlatformDetails(true) as boolean
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-text-box-check-outline',
    complete: false,
    isValid: false,
    validationFn: () => validatePlatformConfirmation(true) as boolean
  }
])
const activeStepIndex = ref<number>(0)
const draftApplicationId = ref<string | undefined>(undefined)
const activeStep = ref<Step>(steps.value[activeStepIndex.value] as Step)
const stepperRef = shallowRef<InstanceType<typeof ConnectStepper> | null>(null)
const reviewFormRef = shallowRef<InstanceType<typeof FormPlatformReviewConfirm> | null>(null)

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
      submitPlatformApplication(true, appId)
    ])
    draftApplicationId.value = filingId
    applicationId.value = filingId
    if (resumeLater) {
      await navigateTo(localePath('/platform/dashboard'))
    } else {
      // update route meta to save application before session expires with new application id
      setOnBeforeSessionExpired(() => submitPlatformApplication(true, filingId))
    }
  } catch (e) {
    logFetchError(e, 'Error saving host application')
    strrModal.openAppSubmitError(e)
  } finally {
    handleButtonLoading(true)
  }
}

const handlePlatformSubmit = async () => {
  let formErrors: MultiFormValidationResult = []
  try {
    // set buttons to loading state
    handleButtonLoading(false, 'right', 1)

    activeStep.value.complete = true // set final review step as active before validation
    reviewFormRef.value?.validateConfirmation() // validate confirmation checkboxes on submit

    // all step validations
    const validations = [
      validateContact(),
      validatePlatformBusiness(),
      validatePlatformDetails(),
      validatePlatformConfirmation()
    ]

    const validationResults = await Promise.all(validations)
    formErrors = validationResults.flatMap(result => result as MultiFormValidationResult)
    const isApplicationValid = formErrors.every(result => result.success === true)

    // if all steps valid, submit form with store function
    if (isApplicationValid) {
      const { paymentToken, applicationStatus } = await submitPlatformApplication(false, applicationId.value)
      const redirectPath = '/platform/dashboard'
      if (applicationStatus === ApplicationStatus.PAYMENT_DUE) {
        handlePaymentRedirect(paymentToken, redirectPath)
      } else {
        await navigateTo(localePath(redirectPath))
      }
    } else {
      stepperRef.value?.buttonRefs[activeStepIndex.value]?.focus() // move focus to stepper on form validation errors
    }
  } catch (e) {
    logFetchError(e, 'Error creating platform application')
    strrModal.openAppSubmitError(e)
  } finally {
    // set buttons back to non loading state
    handleButtonLoading(true)
  }
}

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
    action: isLastStep ? handlePlatformSubmit : () => stepperRef.value?.setNextStep(),
    icon: 'i-mdi-chevron-right',
    label: isLastStep ? t('btn.submitAndPay') : t(`strr.step.description.${val + 1}`),
    trailing: true
  })

  setButtonControl({
    leftButtons: ldStore.getStoredFlag('enable-save-draft')
      ? [
          {
            action: () => navigateTo(localePath('/platform/dashboard')),
            label: t('btn.cancel'),
            variant: 'outline'
          },
          { action: () => saveApplication(true), label: t('btn.saveExit'), variant: 'outline' },
          { action: saveApplication, label: t('btn.save'), variant: 'outline' }
        ]
      : [],
    rightButtons: buttons
  })
}, { immediate: true })

// page stuff
useHead({
  title: t('strr.title.application')
})

definePageMeta({
  layout: 'connect-form',
  middleware: ['auth', 'check-tos', 'require-premium-account', 'application-page'],
  onAccountChange: (oldAccount: Account, newAccount: Account) => manageAccountChangeApplication(oldAccount, newAccount)
})

// save application before session expires
setOnBeforeSessionExpired(() => submitPlatformApplication(true, applicationId.value))
</script>
<template>
  <ConnectSpinner v-if="loading" overlay />
  <div v-else class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1
      :text="isRegistrationRenewal ? $t('strr.title.renewalApplication') : $t('strr.title.application')"
      class="my-5"
    />
    <ModalGroupHelpAndInfo />
    <ConnectStepper
      ref="stepperRef"
      :key="0"
      v-model:steps="steps"
      v-model:active-step-index="activeStepIndex"
      v-model:active-step="activeStep"
      :stepper-label="$t('label.platAppStepLabel')"
    />
    <div v-if="activeStepIndex === 0" key="contact-information">
      <FormContactInfo :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 1" key="business-details">
      <FormPlatformBusinessDetails :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 2" key="platform-information">
      <FormPlatformDetails :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 3" key="review-confirm">
      <FormPlatformReviewConfirm
        ref="reviewFormRef"
        :is-complete="activeStep.complete"
        @edit="stepperRef?.setActiveStep"
      />
    </div>
  </div>
</template>
