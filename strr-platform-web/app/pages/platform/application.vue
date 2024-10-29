<script setup lang="ts">
import type { ConnectBtnControlItem } from '~/interfaces/connect-btn-control/item-i'
import { ConnectStepper, FormPlatformReviewConfirm } from '#components'

const { t } = useI18n()
const localePath = useLocalePath()
const strrModal = useStrrModals()

const { validatePlatformContact } = useStrrPlatformContact()
const { validatePlatformBusiness } = useStrrPlatformBusiness()
const { validatePlatformDetails } = useStrrPlatformDetails()
const { submitPlatformApplication, validatePlatformConfirmation } = useStrrPlatformApplication()
// fee stuff
const {
  addReplaceFee,
  getFee,
  removeFee,
  setPlaceholderFilingTypeCode,
  setPlaceholderServiceFee
} = useConnectFeeStore()

setPlaceholderFilingTypeCode(ConnectFeeCode.STR_PLAT_SM)

const platFeeSm = ref<ConnectFeeItem | undefined>(undefined)
const platFeeLg = ref<ConnectFeeItem | undefined>(undefined)
const platFeeWv = ref<ConnectFeeItem | undefined>(undefined)
onMounted(async () => {
  const [smallFeeResp, largeFeeResp, waivedFeeResp] = await Promise.all([
    getFee(ConnectFeeEntityType.STRR, ConnectFeeCode.STR_PLAT_SM),
    getFee(ConnectFeeEntityType.STRR, ConnectFeeCode.STR_PLAT_LG),
    getFee(ConnectFeeEntityType.STRR, ConnectFeeCode.STR_PLAT_WV)
  ])
  platFeeSm.value = smallFeeResp
  platFeeLg.value = largeFeeResp
  platFeeWv.value = waivedFeeResp
  if (platFeeWv.value && platFeeSm.value) {
    // NOTE: setting 'waived' changes the text to 'No Fee' instead of $0.00
    platFeeWv.value.waived = true
    // NOTE: service fee is variable and dependent on the account
    // Pay api incorrectly sets the service fee for $0 fee codes to 0,
    // so we are manually setting it to the service fee value from a non-zero fee code
    platFeeWv.value.serviceFees = platFeeSm.value.serviceFees
    setPlaceholderServiceFee(platFeeSm.value.serviceFees)
  }
})

const { platformDetails } = storeToRefs(useStrrPlatformDetails())
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())

watch(() => platformBusiness.value.hasCpbc, (val) => {
  if (val && platFeeWv.value) {
    removeFee(ConnectFeeCode.STR_PLAT_SM)
    removeFee(ConnectFeeCode.STR_PLAT_LG)
    addReplaceFee(platFeeWv.value)
  } else {
    removeFee(ConnectFeeCode.STR_PLAT_WV)
    setFeeBasedOnListingSize(platformDetails.value.listingSize)
  }
})

const setFeeBasedOnListingSize = (listingSize: ListingSize | undefined) => {
  if (platFeeSm.value && platFeeLg.value && listingSize) {
    if (listingSize === ListingSize.UNDER_THOUSAND) {
      removeFee(ConnectFeeCode.STR_PLAT_LG)
      addReplaceFee(platFeeSm.value)
    } else {
      // ListingSize.THOUSAND_OR_MORE
      removeFee(ConnectFeeCode.STR_PLAT_SM)
      addReplaceFee(platFeeLg.value)
    }
  }
}

watch(() => platformDetails.value.listingSize, (val) => {
  if (!platformBusiness.value.hasCpbc) {
    setFeeBasedOnListingSize(val)
  }
})

// stepper stuff
const steps = ref<Step[]>([
  {
    i18nPrefix: 'platform.step',
    icon: 'i-mdi-account-multiple-plus',
    complete: false,
    isValid: false,
    validationFn: async () => await validatePlatformContact(true) as boolean
  },
  {
    i18nPrefix: 'platform.step',
    icon: 'i-mdi-domain-plus',
    complete: false,
    isValid: false,
    validationFn: () => validatePlatformBusiness(true) as boolean
  },
  {
    i18nPrefix: 'platform.step',
    icon: 'i-mdi-earth',
    complete: false,
    isValid: false,
    validationFn: () => validatePlatformDetails(true) as boolean
  },
  {
    i18nPrefix: 'platform.step',
    icon: 'i-mdi-text-box-check-outline',
    complete: false,
    isValid: false,
    validationFn: () => validatePlatformConfirmation(true) as boolean
  }
])
const activeStepIndex = ref<number>(0)
const activeStep = ref<Step>(steps.value[activeStepIndex.value] as Step)
const stepperRef = shallowRef<InstanceType<typeof ConnectStepper> | null>(null)
const reviewFormRef = shallowRef<InstanceType<typeof FormPlatformReviewConfirm> | null>(null)

// need to cleanup the setButtonControl somehow
const handlePlatformSubmit = async () => {
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

    // all step validations
    const validations = [
      validatePlatformContact(),
      validatePlatformBusiness(),
      validatePlatformDetails(),
      validatePlatformConfirmation()
    ]

    const validationResults = await Promise.all(validations)
    formErrors = validationResults.flatMap(result => result as MultiFormValidationResult)
    const isApplicationValid = formErrors.every(result => result.success === true)

    console.info('is application valid: ', isApplicationValid, formErrors)

    // if all steps valid, submit form with store function
    if (isApplicationValid) {
      const response = await submitPlatformApplication()
      if (response) {
        return navigateTo(localePath('/platform/dashboard'))
      }
    } else {
      // TODO: display form errors better
      strrModal.openAppSubmitError(formErrors)
    }
  } catch (e) {
    logFetchError(e, 'Error creating platform application')
    // TODO: handle backend errors
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
          action: handlePlatformSubmit,
          icon: 'i-mdi-chevron-right',
          label: t('btn.submitAndPay'),
          trailing: true
        }
      ]
    })
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
    label: isLastStep ? t('btn.submitAndPay') : t(`platform.step.description.${val + 1}`),
    trailing: true
  })

  setButtonControl({ leftButtons: [], rightButtons: buttons })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}, { immediate: true })

// page stuff
useHead({
  title: t('platform.title.application')
})

definePageMeta({
  layout: 'connect-form',
  path: '/platform/application'
})

setBreadcrumbs([
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: t('platform.title.dashboard'), to: useLocalePath()('/platform/dashboard') },
  { label: t('platform.title.application') }
])
</script>
<template>
  <div class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1 :text="t('platform.title.application')" class="my-5" />
    <ConnectStepper
      ref="stepperRef"
      :key="0"
      v-model:steps="steps"
      v-model:active-step-index="activeStepIndex"
      v-model:active-step="activeStep"
    />
    <div v-if="activeStepIndex === 0" key="contact-information">
      <FormPlatformContactInfo :is-complete="activeStep.complete" />
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
