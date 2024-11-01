<script setup lang="ts">
import { ConnectStepper, FormPlatformReviewConfirm } from '#components'

const { t } = useI18n()

const { validateContact } = useStrrContactStore()
const { validateStrataBusiness } = useStrrStrataBusinessStore()
const { validateStrataDetails } = useStrrStrataDetailsStore()
const { validateStrataConfirmation } = useStrrStrataApplicationStore()
// fee stuff
const {
  addReplaceFee,
  getFee,
  setPlaceholderFilingTypeCode
} = useConnectFeeStore()

const strataFee = ref<ConnectFeeItem | undefined>(undefined)

onMounted(async () => {
  // TODO: check for application id in the route query, if there then load the application
  strataFee.value = await getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_STRATA)
  if (strataFee.value) {
    addReplaceFee(strataFee.value)
  } else {
    // error getting fee info from api
    // TODO: set fee to a static value or set an error in the fee summary?
    setPlaceholderFilingTypeCode(StrrFeeCode.STR_STRATA)
  }
})

// stepper stuff
// TODO: replace validation functions
const steps = ref<Step[]>([
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-domain-plus',
    complete: false,
    isValid: false,
    validationFn: () => validateStrataBusiness(true) as boolean
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-account-multiple-plus',
    complete: false,
    isValid: false,
    validationFn: async () => await validateContact(true) as boolean
  },
  {
    i18nPrefix: 'strr.step',
    icon: 'i-mdi-map-marker-plus-outline',
    complete: false,
    isValid: false,
    validationFn: () => validateStrataDetails(true) as boolean
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
const activeStep = ref<Step>(steps.value[activeStepIndex.value] as Step)
const stepperRef = shallowRef<InstanceType<typeof ConnectStepper> | null>(null)
const reviewFormRef = shallowRef<InstanceType<typeof FormPlatformReviewConfirm> | null>(null)

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
    // TODO: make submission function
    action: isLastStep ? () => console.info('TODO') : () => stepperRef.value?.setNextStep(),
    icon: 'i-mdi-chevron-right',
    label: isLastStep ? t('btn.submitAndPay') : t(`strr.step.description.${val + 1}`),
    trailing: true
  })

  setButtonControl({ leftButtons: [], rightButtons: buttons })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}, { immediate: true })

// page stuff
useHead({
  title: t('strr.title.application')
})

definePageMeta({
  layout: 'connect-form',
  middleware: ['auth'],
  path: '/strata-hotel/application'
})

setBreadcrumbs([
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: t('strr.title.dashboard'), to: useLocalePath()('/strata-hotel/dashboard') },
  { label: t('strr.title.application') }
])
</script>
<template>
  <div class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1 :text="t('strr.title.application')" class="my-5" />
    <ConnectStepper
      :key="0"
      v-model:steps="steps"
      v-model:active-step-index="activeStepIndex"
      v-model:active-step="activeStep"
      :stepper-label="$t('strr.step.stepperLabel')"
    />
    <div v-if="activeStepIndex === 0" key="contact-information">
      <!-- TODO: replace with strata version -->
      <FormPlatformBusinessDetails :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 1" key="business-details">
      <FormContactInfo :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 2" key="platform-information">
      <!-- TODO: replace with strata version -->
      <FormPlatformDetails :is-complete="activeStep.complete" />
    </div>
    <div v-if="activeStepIndex === 3" key="review-confirm">
      <!-- TODO: replace with strata version -->
      <FormPlatformReviewConfirm
        ref="reviewFormRef"
        :is-complete="activeStep.complete"
        @edit="stepperRef?.setActiveStep"
      />
    </div>
  </div>
</template>
