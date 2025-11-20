<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { ConnectStepper, FormReviewConfirm } from '#components'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const strrModal = useStrrModals()
const { handlePaymentRedirect } = useConnectNav()
const { handleButtonLoading, setButtonControl } = useButtonControl()
const ldStore = useConnectLaunchdarklyStore()

const { validateContact } = useStrrContactStore()
const { validateStrataBusiness } = useStrrStrataBusinessStore()
const { validateStrataDetails } = useStrrStrataDetailsStore()
const { validateDocuments } = useDocumentStore()
const {
  submitStrataApplication,
  validateStrataConfirmation,
  $reset: applicationReset
} = useStrrStrataApplicationStore()
const permitStore = useStrrStrataStore()

const applicationId = ref(route.query.applicationId as string)
const loading = ref(false)

// fee stuff
const {
  addReplaceFee,
  getFee,
  setPlaceholderFilingTypeCode,
  initAlternatePaymentMethod
} = useConnectFeeStore()

const strataFee = ref<ConnectFeeItem | undefined>(undefined)

const isRenewal = useRouteQuery('renew')
const isRegRenewalFlow = computed(() => isRenewal.value && useState('renewalRegId').value)

onMounted(async () => {
  loading.value = true
  await initAlternatePaymentMethod()
  applicationReset()

  if (isRegRenewalFlow.value) {
    const renewalRegId = useState('renewalRegId')
    if (!renewalRegId.value) {
      navigateTo(localePath('/strata-hotel/dashboard'))
      return
    }
    await permitStore.loadStrataRegistrationData(renewalRegId.value as string)
    permitStore.isRegistrationRenewal = true
  } else if (applicationId.value) {
    await permitStore.loadStrata(applicationId.value, true)
  }
  strataFee.value = await getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_STRATA)
  if (strataFee.value) {
    addReplaceFee(strataFee.value)
  } else {
    // error getting fee info from api
    // TODO: set fee to a static value or set an error in the fee summary?
    setPlaceholderFilingTypeCode(StrrFeeCode.STR_STRATA)
  }
  loading.value = false
})

// stepper stuff
// TODO: replace validation functions
const steps = ref<Step[]>([
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-domain-plus',
    complete: false,
    isValid: false,
    validationFn: async () => await validateContact(true) as boolean
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-account-multiple-plus',
    complete: false,
    isValid: false,
    validationFn: () => validateStrataBusiness(true) as boolean
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-map-marker-plus-outline',
    complete: false,
    isValid: false,
    validationFn: () => (
      validateStrataDetails(true, permitStore.isRegistrationRenewal) as boolean &&
      validateDocuments(true) as boolean
    )
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-text-box-check-outline',
    complete: false,
    isValid: false,
    validationFn: () => validateStrataConfirmation(true) as boolean
  }
])
const activeStepIndex = ref<number>(0)
const draftApplicationId = ref<string | undefined>(undefined)
const activeStep = ref<Step>(steps.value[activeStepIndex.value] as Step)
const stepperRef = shallowRef<InstanceType<typeof ConnectStepper> | null>(null)
const reviewFormRef = shallowRef<InstanceType<typeof FormReviewConfirm> | null>(null)

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
      submitStrataApplication(true, appId)
    ])
    draftApplicationId.value = filingId
    applicationId.value = filingId
    if (resumeLater) {
      await navigateTo(localePath('/strata-hotel/dashboard'))
    } else {
      // update route meta to save application before session expires with new application id
      setOnBeforeSessionExpired(() => submitStrataApplication(true, filingId))
    }
  } catch (e) {
    logFetchError(e, 'Error saving host application')
    strrModal.openAppSubmitError(e)
  } finally {
    handleButtonLoading(true)
  }
}

const handleStrataSubmit = async () => {
  let formErrors: MultiFormValidationResult = []
  try {
    // set buttons to loading state
    handleButtonLoading(false, 'right', 1)

    activeStep.value.complete = true // set final review step as active before validation
    reviewFormRef.value?.validateConfirmation() // validate confirmation checkboxes on submit

    // all step validations
    const validations = [
      validateContact(),
      validateStrataBusiness(),
      validateStrataDetails(false, permitStore.isRegistrationRenewal),
      validateDocuments(),
      validateStrataConfirmation()
    ]

    const validationResults = await Promise.all(validations)
    formErrors = validationResults.flatMap(result => result as MultiFormValidationResult)
    const isApplicationValid = formErrors.every(result => result.success === true)

    // console.info('is application valid: ', isApplicationValid, formErrors)

    // if all steps valid, submit form with store function
    if (isApplicationValid) {
      const { paymentToken, filingId, applicationStatus } = await submitStrataApplication(false, applicationId.value)
      const redirectPath = `/strata-hotel/dashboard/${filingId}`
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
    action: isLastStep ? handleStrataSubmit : () => stepperRef.value?.setNextStep(),
    icon: 'i-mdi-chevron-right',
    label: isLastStep ? t('btn.submitAndPay') : t(`strr.step.description.${val + 1}`),
    trailing: true
  })

  setButtonControl({
    leftButtons: ldStore.getStoredFlag('enable-save-draft')
      ? [
          {
            action: () => navigateTo(localePath('/strata-hotel/dashboard')),
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
  title: permitStore.isRegistrationRenewal ? t('strr.title.applicationRenewal') : t('strr.title.application')
})

definePageMeta({
  layout: 'connect-form',
  middleware: ['auth', 'check-tos', 'require-account'],
  onAccountChange: (_: Account, newAccount: Account) => {
    useStrrModals().openConfirmSwitchAccountModal(
      newAccount.id,
      useLocalePath()('/strata-hotel/dashboard')
    )
    return false
  }
})

// save application before session expires
setOnBeforeSessionExpired(() => submitStrataApplication(true, applicationId.value))

setBreadcrumbs([
  {
    label: t('label.bcregDash'),
    to: useRuntimeConfig().public.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
  { label: t('strr.title.dashboard'), to: localePath('/strata-hotel/dashboard') },
  {
    label: permitStore.isRegistrationRenewal
      ? t('breadcrumb.str.strataApplicationRenewal')
      : t('breadcrumb.str.strataApplication')
  }
])
</script>
<template>
  <ConnectSpinner v-if="loading" overlay />
  <div v-else class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1
      :text="permitStore.isRegistrationRenewal
        ? t('strr.title.applicationRenewal') : t('strr.title.application')"
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
    <div v-if="activeStepIndex === 0" key="contact-information">
      <FormContactInfo :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 1" key="business-details">
      <FormBusinessDetails :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 2" key="strata-information">
      <FormStrataDetails :is-complete="activeStep.complete" />
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
