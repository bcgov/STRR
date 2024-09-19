<template>
  <div data-test-id="create-account-page" class="relative h-full">
    <div class="w-full flex flex-col justify-between desktop:justify-center items-center">
      <div
        class="shrink w-full flex flex-row mobile:flex-col mobile:justify-between justify-center max-w-[1360px] px-4"
      >
        <div class="grow mr-6 mobile:mr-0">
          <div class="mobile:px-[8px]">
            <BcrosTypographyH1
              :text="t('createAccount.title')"
              data-test-id="create-application-title"
              class="mobile:pb-[20px]"
            />
            <BcrosStepper
              :key="headerUpdateKey"
              :active-step="activeStepIndex"
              :steps="steps"
              @change-step="setActiveStep"
            />
          </div>
          <div :key="activeStepIndex" class="grow">
            <div class="mobile:px-[8px]">
              <BcrosTypographyH2 :text="t(activeStep.title)" class="py-[32px]" />
              <p v-if="activeStep.subtitle" class="mb-[32px]">
                {{ t(activeStep.subtitle) }}
              </p>
            </div>
            <div v-if="activeStepIndex === 0" :key="activeStepIndex">
              <BcrosFormSectionContactInformationForm
                ref="contactForm"
                :full-name="userFullName"
                :has-secondary-contact="hasSecondaryContact"
                :toggle-add-secondary="toggleAddSecondary"
                :is-complete="activeStep.step.complete"
                :second-form-is-complete="activeStep.step.complete"
              />
            </div>
            <div v-if="activeStepIndex === 1" :key="activeStepIndex">
              <BcrosFormSectionPropertyForm :is-complete="activeStep.step.complete" />
            </div>
            <div v-if="activeStepIndex === 2" :key="activeStepIndex">
              <BcrosFormSectionPrincipalResidenceForm :is-complete="steps[activeStepIndex].step.complete" />
            </div>
            <div v-if="activeStepIndex === 3" :key="activeStepIndex">
              <BcrosFormSectionReviewForm
                :secondary-contact="hasSecondaryContact"
                :is-complete="steps[activeStepIndex].step.complete"
              />
            </div>
          </div>
        </div>
        <div class="shrink mobile:grow">
          <FeeWidget :fee="fee" />
        </div>
      </div>
      <BcrosStepperFooter
        :key="activeStepIndex"
        :is-first-step="activeStepIndex.valueOf() == 0"
        :set-next-step="setNextStep"
        :set-previous-step="setPreviousStep"
        :submit="submit"
        :is-last-step="activeStepIndex.valueOf() == steps.length - 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import steps from '../page-data/create-account/steps'
import { FormPageI } from '~/interfaces/form/form-page-i'

const hasSecondaryContact: Ref<boolean> = ref(false)
const activeStepIndex: Ref<number> = ref(0)
const activeStep: Ref<FormPageI> = ref(steps[activeStepIndex.value])
const tPrincipalResidence = (translationKey: string) => t(`createAccount.principalResidence.${translationKey}`)
const contactForm = ref()
const fee = ref<FeeI>()
const headerUpdateKey = ref(0)

const { getHostApplicationFee } = useFees()

const updateFees = async () => {
  fee.value = await getHostApplicationFee()
}

const { t } = useTranslation()
const { userFullName, userFirstName, userLastName, me } = useBcrosAccount()

const { createApplication } = useApplications()

onMounted(() => {
  // if no SBC accounts exist redirect to SBC account creation
  if (!me?.settings.length) {
    navigateTo('/finalization')
  }
  updateFees()
})

const toggleAddSecondary = () => {
  hasSecondaryContact.value = !hasSecondaryContact.value
}

const propertyToApiType = (type: string | undefined): string => {
  const tPropertyForm = (translationKey: string) => t(`createAccount.propertyForm.${translationKey}`)
  for (const key in propertyTypeMap) {
    const propertyKey = propertyTypeMap[key as keyof PropertyTypeMapI]
    if (type && tPropertyForm(propertyKey) === type) {
      return key
    }
  }
  return ''
}

const ownershipToApiType = (type: string | undefined): string => {
  switch (type) {
    case t('createAccount.propertyForm.rent'):
      return 'RENT'
    case t('createAccount.propertyForm.own'):
      return 'OWN'
    case t('createAccount.propertyForm.other'):
      return 'CO_OWN'
  }
  return ''
}

const submit = () => {
  validateStep(primaryContactSchema, formState.primaryContact, 0)
  if (hasSecondaryContact.value) {
    validateStep(secondaryContactSchema, formState.secondaryContact, 0)
  }
  validateStep(propertyDetailsSchema, formState.propertyDetails, 1)
  validateProofPage()
  validateReviewPage()
  headerUpdateKey.value++
  const allStepsCheck = steps.every(step => step.step.isValid && step.step.complete)
  if (allStepsCheck) {
    createApplication(
      userFirstName,
      userLastName,
      hasSecondaryContact.value,
      propertyToApiType(formState.propertyDetails.propertyType),
      ownershipToApiType(formState.propertyDetails.ownershipType)
    )
  } else {
    scrollToTop()
  }
}

const setActiveStep = (newStep: number) => {
  validateSteps()
  activeStep.value.step.complete = true
  activeStepIndex.value = newStep
  activeStep.value = steps[activeStepIndex.value]
}

const setStepValid = (index: number, valid: boolean) => {
  steps[index].step.isValid = valid
}

const validateStep = (schema: any, state: any, index: number) => {
  steps[index].step.isValid = schema.safeParse(state).success
}

watch(formState.primaryContact, () => {
  validateStep(primaryContactSchema, formState.primaryContact, 0)
})

watch(formState.secondaryContact, () => {
  validateStep(secondaryContactSchema, formState.secondaryContact, 0)
})

watch(formState.propertyDetails, () => {
  validateStep(propertyDetailsSchema, formState.propertyDetails, 1)
})

const validateProofPage = () => {
  if (formState.principal.isPrincipal && formState.principal.declaration && formState.supportingDocuments.length > 0) {
    setStepValid(2, true)
  } else if (
    !formState.principal.isPrincipal &&
    formState.principal.reason &&
    formState.principal.reason !== tPrincipalResidence('other')
  ) {
    setStepValid(2, true)
  } else if (!formState.principal.isPrincipal && formState.principal.reason && formState.principal.otherReason) {
    setStepValid(2, true)
  } else {
    setStepValid(2, false)
  }
}

const validateReviewPage = () => {
  setStepValid(3, formState.principal.agreeToSubmit)
  steps[3].step.complete = true
}

watch(formState.supportingDocuments, () => {
  validateProofPage()
})

watch(formState.principal, () => {
  validateProofPage()
})

const validateSteps = () => {
  if (activeStepIndex.value === 0) {
    validateStep(primaryContactSchema, formState.primaryContact, 0)
    if (hasSecondaryContact.value) {
      validateStep(secondaryContactSchema, formState.secondaryContact, 0)
    }
  } else if (activeStepIndex.value === 1) {
    validateStep(propertyDetailsSchema, formState.propertyDetails, 1)
  } else if (activeStepIndex.value === 2) {
    validateProofPage()
  } else if (activeStepIndex.value === 3) {
    validateReviewPage()
  }
}

const setNextStep = () => {
  if (activeStepIndex.value < steps.length - 1) {
    const nextStep = activeStepIndex.value + 1
    activeStepIndex.value = nextStep
    activeStep.value = steps[activeStepIndex.value]
    steps[activeStepIndex.value - 1].step.complete = true
    scrollToTop()
  }
}

const setPreviousStep = () => {
  if (activeStepIndex.value > 0) {
    const nextStep = activeStepIndex.value - 1
    activeStepIndex.value = nextStep
    activeStep.value = steps[activeStepIndex.value]
    steps[activeStepIndex.value + 1].step.complete = true
    scrollToTop()
  }
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

definePageMeta({
  layout: 'wide'
})
</script>
