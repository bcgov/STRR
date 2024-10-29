<script setup lang="ts">
import { ConnectFeeCode, ConnectFeeEntityType, type Step } from '#imports'
import type { ConnectBtnControlItem } from '~/interfaces/connect-btn-control/item-i'

const { t } = useI18n()

const { getContactSchema } = useStrrHostContact()
const { primaryContact, secondaryContact } = storeToRefs(useStrrHostContact())
const { propertyDetailsSchema } = useStrrProperty()
const { property } = storeToRefs(useStrrProperty())
const { principal, supportingDocuments } = storeToRefs(useStrrPrincipal())
const { agreeToSubmit } = storeToRefs(useStrrHostApplication())

const { getFee, addReplaceFee, setPlaceholderFilingTypeCode } = useConnectFeeStore()

setPlaceholderFilingTypeCode(ConnectFeeCode.STR_HOST)

onMounted(async () => {
  const hostFee = await getFee(ConnectFeeEntityType.STRR, ConnectFeeCode.STR_HOST)
  if (hostFee) {
    addReplaceFee(hostFee)
  }
})

const steps = ref<Step[]>([
  {
    label: 'createAccount.stepTitle.contact',
    inactiveIconPath: '/icons/create-account/add_person.svg',
    activeIconPath: '/icons/create-account/add_person_active.svg',
    complete: false,
    isValid: false,
    alt: 'Add contacts'
  },
  {
    label: 'createAccount.stepTitle.property',
    inactiveIconPath: '/icons/create-account/add_location.svg',
    activeIconPath: '/icons/create-account/add_location_active.svg',
    complete: false,
    isValid: false,
    alt: 'Add properties'
  },
  {
    label: 'createAccount.stepTitle.eligibility',
    inactiveIconPath: '/icons/create-account/upload_file.svg',
    activeIconPath: '/icons/create-account/upload_file_active.svg',
    complete: false,
    isValid: false,
    alt: 'Upload documents'
  },
  {
    label: 'createAccount.stepTitle.review',
    inactiveIconPath: '/icons/create-account/check.svg',
    activeIconPath: '/icons/create-account/check_active.svg',
    complete: false,
    isValid: false,
    alt: 'Check and verify'
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
    action: isLastStep ? () => {} : setNextStep,
    icon: 'i-mdi-chevron-right',
    label: isLastStep ? t('btn.submitAndPay') : t('btn.next'),
    trailing: true
  })
  setButtonControl({ leftButtons: buttons, rightButtons: [] })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}, { immediate: true })

const setStepValid = (index: number, valid: boolean) => {
  if (index !== 3) {
    // after making changes they will need to re-confirm
    agreeToSubmit.value = false
  }
  // @ts-ignore
  steps.value[index].isValid = valid
}
const validateStep = (schema: any, state: any, index: number) => {
  setStepValid(index, schema.safeParse(state).success)
}

const validateStep1 = () => {
  validateStep(getContactSchema(true), primaryContact.value, 0)
  if (secondaryContact.value) {
    validateStep(getContactSchema(false), secondaryContact.value, 0)
  }
}
watch(primaryContact, validateStep1, { deep: true })
watch(secondaryContact, validateStep1, { deep: true })

watch(property, () => {
  validateStep(propertyDetailsSchema, property.value, 1)
}, { deep: true })

const validateProofPage = () => {
  if (principal.value.isPrincipal && principal.value.declaration && supportingDocuments.value.length > 0) {
    setStepValid(2, true)
  } else if (
    !principal.value.isPrincipal &&
    principal.value.reason &&
    principal.value.reason !== t('createAccount.principalResidence.other')
  ) {
    setStepValid(2, true)
  } else if (!principal.value.isPrincipal && principal.value.reason && principal.value.otherReason) {
    setStepValid(2, true)
  } else {
    setStepValid(2, false)
  }
}
watch(supportingDocuments, validateProofPage, { deep: true })
watch(principal, validateProofPage, { deep: true })

watch(agreeToSubmit, val => setStepValid(3, val))

useHead({
  title: t('createAccount.title')
})

definePageMeta({
  layout: 'connect-form',
  path: '/property-manager/host-application'
})

setBreadcrumbs([
  { label: t('page.home.h1') }
])
</script>
<template>
  <div class="space-y-8 py-8 sm:py-10">
    <ConnectTypographyH1 :text="t('createAccount.title')" class="my-5" />
    <ConnectStepper
      :key="0"
      :active-step="activeStepIndex"
      :steps="steps"
      @change-step="setActiveStep"
    />
    <div v-if="activeStepIndex === 0" key="contact-form">
      <ConnectTypographyH2 :text="t('createAccount.contact.title')" class="my-5" />
      <FormHostContact
        ref="contactForm"
        :is-complete="activeStep.complete"
      />
    </div>
    <div v-else-if="activeStepIndex === 1" key="property-form">
      <ConnectTypographyH2 :text="t('createAccount.details.title')" class="my-5" />
      <FormHostProperty
        ref="propertyForm"
        :is-complete="activeStep.complete"
      />
    </div>
    <div v-else-if="activeStepIndex === 2" key="principal-residence-form">
      <ConnectTypographyH2 :text="t('createAccount.eligibility.title')" class="my-5" />
      <FormHostPrincipalResidence
        ref="principalResidenceForm"
        :is-complete="activeStep.complete"
      />
    </div>
    <div v-else key="review-confirm-form">
      <ConnectTypographyH2 :text="t('createAccount.confirm.title')" class="my-5" />
      <FormHostReviewConfirm
        ref="reviewConfirmForm"
        :is-complete="activeStep.complete"
      />
    </div>
  </div>
</template>
