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
  // NOTE: if we want this to have 'NO FEE' instead of $0.00 in the fee summary then set platFeeWv.value.waived = true
  platFeeWv.value = await waivedFee
  if (platFeeSm.value) {
    setPlaceholderServiceFee(platFeeSm.value.serviceFees)
  }
})

const { platformDetails } = storeToRefs(useStrrPlatformDetails())
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())
// const { getBusinessSchema } = useStrrPlatformBusiness()
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

// need to cleanup the setButtonControl somehow
const handlePlatformSubmit = async () => {
  try {
    // set buttons to loading state
    setButtonControl({
      leftButtons: [
        {
          action: setPreviousStep,
          icon: 'i-mdi-chevron-left',
          label: t('btn.back'),
          variant: 'outline',
          disabled: true
        },
        {
          action: handlePlatformSubmit,
          icon: 'i-mdi-chevron-right',
          label: t('btn.submitAndPay'),
          trailing: true,
          loading: true
        }
      ],
      rightButtons: []
    })

    // TODO: something like this but cleaner
    // validate all forms
    // const isCompletingPartyValid = getContactSchema(true).safeParse(completingParty.value).success
    // const isPrimaryRepValid = getContactSchema(false).safeParse(primaryRep.value).success
    // if (secondaryRep.value) {
    //   const isSecondaryRepValid = getContactSchema(false).safeParse(secondaryRep.value).success
    // }
    // const isBusDetailsValid = getBusinessSchema(
    //   platformBusiness.value.hasCpbc, platformBusiness.value.hasRegOffAtt)
    // console.log(isCompletingPartyValid)

    // if all steps valid, submit form with store function
    await submitPlatformApplication()
  } catch (e) {

  } finally {
    // set buttons back to non loading state
    setButtonControl({
      leftButtons: [
        {
          action: setPreviousStep,
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
      ],
      rightButtons: []
    })
  }
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
