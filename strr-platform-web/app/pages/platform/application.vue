<script setup lang="ts">
import { ConnectFeeCode, ConnectFeeEntityType, type ConnectFeeItem, type Step } from '#imports'
import type { ConnectBtnControlItem } from '~/interfaces/connect-btn-control/item-i'

const { t } = useI18n()

const { getContactSchema } = useStrrPlatformContact()
const { isCompletingPartyRep, completingParty, primaryRep, secondaryRep } = storeToRefs(useStrrPlatformContact())
const { submitPlatformApplication } = useStrrPlatformApplication()
// fee stuff
const { addReplaceFee, getFee, removeFee, setPlaceholderFilingTypeCode, setPlaceholderServiceFee } = useConnectFee()

setPlaceholderFilingTypeCode(ConnectFeeCode.STR_PLAT_SM)

const platFeeSm = ref<ConnectFeeItem | undefined>(undefined)
const platFeeLg = ref<ConnectFeeItem | undefined>(undefined)
const platFeeWv = ref<ConnectFeeItem | undefined>(undefined)
onMounted(async () => {
  const smallFee = getFee(ConnectFeeEntityType.STRR, ConnectFeeCode.STR_PLAT_SM)
  const largeFee = getFee(ConnectFeeEntityType.STRR, ConnectFeeCode.STR_PLAT_LG)
  const waivedFee = getFee(ConnectFeeEntityType.STRR, ConnectFeeCode.STR_PLAT_WV)
  platFeeSm.value = await smallFee
  platFeeLg.value = await largeFee
  platFeeWv.value = await waivedFee
  if (platFeeWv.value && platFeeSm.value) {
    // NOTE: setting 'waived' changes the text to 'NO FEE' instead of $0.00
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
    isValid: false
  },
  {
    i18nPrefix: 'platform.step',
    icon: 'i-mdi-domain-plus',
    complete: false,
    isValid: false
  },
  {
    i18nPrefix: 'platform.step',
    icon: 'i-mdi-earth',
    complete: false,
    isValid: false
  },
  {
    i18nPrefix: 'platform.step',
    icon: 'i-mdi-text-box-check-outline',
    complete: false,
    isValid: false
  }
])
const activeStepIndex: Ref<number> = ref(0)
const activeStep: Ref<Step> = ref(steps.value[activeStepIndex.value] as Step)
const setActiveStep = (newStep: number) => {
  activeStep.value.complete = true
  activeStepIndex.value = newStep
  activeStep.value = steps.value[activeStepIndex.value] as Step
}
const setNextStep = () => {
  if (activeStepIndex.value < steps.value.length - 1) {
    const nextStep = activeStepIndex.value + 1
    activeStepIndex.value = nextStep
    activeStep.value = steps.value[activeStepIndex.value] as Step
    // @ts-ignore
    steps.value[activeStepIndex.value - 1].complete = true
  }
}
const setPreviousStep = () => {
  if (activeStepIndex.value > 0) {
    const nextStep = activeStepIndex.value - 1
    activeStepIndex.value = nextStep
    activeStep.value = steps.value[activeStepIndex.value] as Step
    // @ts-ignore
    steps.value[activeStepIndex.value + 1].complete = true
  }
}

// something like this? need to discuss options
// how can we set loading state on the submit and pay button?
// i wonder if tracking the steps in a store would be useful
const handlePlatformSubmit = () => {
  // validate each step
  // if invalid step, set prop on Review component to highlight invalid fields/section ?
  // show alert with some error text ?

  // if all steps valid, submit form with store function
  submitPlatformApplication()
}

watch(activeStepIndex, (val) => {
  const buttons: ConnectBtnControlItem[] = []
  if (val !== 0) {
    buttons.push({
      action: setPreviousStep,
      icon: 'i-mdi-chevron-left',
      label: t('btn.back'),
      variant: 'outline'
    })
    // set previous steps to complete (in case they skipped past steps.value)
    for (let i = 1; i < val; i++) {
      // @ts-ignore
      steps.value[i].complete = true
    }
  }
  const isLastStep = val === steps.value.length - 1
  buttons.push({
    action: isLastStep ? handlePlatformSubmit : setNextStep,
    icon: 'i-mdi-chevron-right',
    label: isLastStep ? t('btn.submitAndPay') : t('btn.next'),
    trailing: true
  })
  setButtonControl({ leftButtons: buttons, rightButtons: [] })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}, { immediate: true })

const setStepValid = (index: number, valid: boolean) => {
  // @ts-ignore
  steps.value[index].isValid = valid
}
const validateStep = (schema: any, state: any, index: number) => {
  setStepValid(index, schema.safeParse(state).success)
}

const validateStep1 = () => {
  if (isCompletingPartyRep === undefined) {
    setStepValid(0, false)
    return
  }
  validateStep(getContactSchema(true), completingParty.value, 0)
  validateStep(getContactSchema(false), primaryRep.value, 0)
  if (secondaryRep.value) {
    validateStep(getContactSchema(false), secondaryRep.value, 0)
  }
}
watch(completingParty, validateStep1, { deep: true })
watch(primaryRep, validateStep1, { deep: true })
watch(secondaryRep, validateStep1, { deep: true })

// page stuff
useHead({
  title: t('platform.title')
})

definePageMeta({
  layout: 'connect-form',
  order: 1,
  path: '/platform/application'
})

setBreadcrumbs([
  { label: t('platform.title') }
])
</script>
<template>
  <div class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1 :text="t('platform.title')" class="my-5" />
    <ConnectStepper
      :key="0"
      :active-step="activeStepIndex"
      :steps="steps"
      @change-step="setActiveStep"
    />
    <div v-if="activeStepIndex === 0" key="contact-information">
      <FormPlatformContactInfo :is-complete="activeStep.complete" />
    </div>
    <div v-else-if="activeStepIndex === 1" key="business-details">
      <FormPlatformBusinessDetails :is-complete="activeStep.complete" />
    </div>
    <div v-else-if="activeStepIndex === 2" key="platform-information">
      <FormPlatformDetails :is-complete="activeStep.complete" />
    </div>
    <div v-else key="review-confirm">
      <FormPlatformReview
        :is-complete="activeStep.complete"
        @edit="setActiveStep"
      />
    </div>
  </div>
</template>
