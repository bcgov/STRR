<template>
  <div data-test-id="create-account-page" class="relative h-full">
    <div class="w-full flex flex-col justify-between desktop:justify-center items-center">
      <div
        class="shrink w-full flex flex-row m:flex-col m:justify-between justify-center max-w-[1360px] px-4"
      >
        <div class="grow mr-6 m:mr-0">
          <div class="m:px-2">
            <BcrosTypographyH1
              :text="t('createAccount.title')"
              data-test-id="create-application-title"
              class="m:pb-5"
            />
            <div class="flex d:flex-row m:flex-col mb-8">
              <InfoModal
                :header="t('createAccount.modal.contactInfo.header')"
                :open-button-label="t('createAccount.modal.contactInfo.openButtonLabel')"
                :hide-contact-info="false"
              >
                <p class="mb-10">
                  {{ t('createAccount.modal.contactInfo.contactUsFirstPart') }}
                  <a
                    :href="`${t('createAccount.modal.contactInfo.informationPageLink')}`"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ t('createAccount.modal.contactInfo.informationPageLabel') }}
                  </a>{{ t('createAccount.modal.contactInfo.contactUsSecondPart') }}
                </p>
              </InfoModal>
              <div class="m:hidden self-stretch w-px bg-bcGovColor-formFieldLines mx-4 h-6" />
              <InfoModal
                :header="t('createAccount.modal.bcrosFoippaNotice.header')"
                :open-button-label="t('createAccount.modal.bcrosFoippaNotice.openButtonLabel')"
                :open-button-icon="'i-mdi-info-circle-outline'"
                :hide-contact-info="true"
              >
                <p class="mb-10">
                  {{ $t('createAccount.modal.bcrosFoippaNotice.noticeTextFirstPart') }}
                  <i>{{ $t('createAccount.modal.bcrosFoippaNotice.actName') }}</i>
                  {{ $t('createAccount.modal.bcrosFoippaNotice.noticeTextSecondPart') }}
                  <a :href="`mailto:${t('createAccount.modal.bcrosFoippaNotice.email')}`">
                    {{ t('createAccount.modal.bcrosFoippaNotice.email') }}
                  </a>.
                </p>
              </InfoModal>
            </div>
            <BcrosStepper
              :key="headerUpdateKey"
              :active-step="activeStepIndex"
              :steps="steps"
              @change-step="setActiveStep"
            />
          </div>
          <div :key="activeStepIndex" class="grow">
            <div class="m:px-2">
              <BcrosTypographyH2 :text="t(activeStep.title)" class="py-8" />
              <p v-if="activeStep.subtitle" class="mb-8">
                {{ t(activeStep.subtitle) }}
              </p>
            </div>
            <div v-if="activeStepIndex === 0" :key="activeStepIndex">
              <BcrosFormSectionPropertyManagerForm
                :is-complete="steps[activeStepIndex].step.complete"
              />
            </div>
            <div v-if="activeStepIndex === 1" :key="activeStepIndex">
              <BcrosFormSectionContactInformationForm
                ref="contactForm"
                :full-name="userFullName"
                :has-secondary-contact="hasSecondaryContact"
                :toggle-add-secondary="toggleAddSecondary"
                :is-complete="activeStep.step.complete"
                :second-form-is-complete="activeStep.step.complete"
              />
            </div>
            <div v-if="activeStepIndex === 2" :key="activeStepIndex">
              <BcrosFormSectionPropertyForm :is-complete="steps[activeStepIndex].step.complete" />
            </div>
            <div v-if="activeStepIndex === 3" :key="activeStepIndex">
              <BcrosFormSectionPrincipalResidenceForm :is-complete="steps[activeStepIndex].step.complete" />
            </div>
            <div v-if="activeStepIndex === 4" :key="activeStepIndex">
              <BcrosFormSectionReviewForm
                :secondary-contact="hasSecondaryContact"
                :is-complete="steps[activeStepIndex].step.complete"
              />
            </div>
          </div>
        </div>
        <div class="shrink m:grow">
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
        :submit-in-progress="submitInProgress"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import steps from '../page-data/create-account/steps'
import InfoModal from '~/components/common/InfoModal.vue'
import { FormPageI } from '~/interfaces/form/form-page-i'

const hasSecondaryContact: Ref<boolean> = ref(false)
const activeStepIndex: Ref<number> = ref(0)
const activeStep: Ref<FormPageI> = ref(steps[activeStepIndex.value])
const tPrincipalResidence = (translationKey: string) => t(`createAccount.principalResidence.${translationKey}`)
const contactForm = ref()
const fee = ref<FeeI>()
const headerUpdateKey = ref(0)

const { goToCreateSbcAccount } = useBcrosNavigate()
const { getHostApplicationFee } = useFees()

const updateFees = async () => {
  fee.value = await getHostApplicationFee()
}

const { t } = useTranslation()
const { userFullName, me } = useBcrosAccount()

const { createApplication } = useApplications()
const submitInProgress = ref(false)
onMounted(() => {
  // if no SBC accounts exist redirect to SBC account creation
  if (!me?.settings.length) {
    goToCreateSbcAccount()
  }
  updateFees()
})

const toggleAddSecondary = () => {
  hasSecondaryContact.value = !hasSecondaryContact.value
}

const submit = async () => {
  validatePropertyManagerStep()
  validateStep(primaryContactSchema, formState.primaryContact, 1)
  if (hasSecondaryContact.value) {
    validateStep(secondaryContactSchema, formState.secondaryContact, 1)
  }
  validateStep(propertyDetailsSchema, formState.propertyDetails, 2)
  validateProofPage()
  validateReviewPage()
  headerUpdateKey.value++
  const allStepsCheck = steps.every(step => step.step.isValid && step.step.complete)
  if (allStepsCheck) {
    submitInProgress.value = true
    try {
      await createApplication(
        hasSecondaryContact.value,
        formState.propertyDetails.propertyType,
        formState.propertyDetails.ownershipType
      )
    } finally {
      submitInProgress.value = false
    }
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

const validatePropertyManagerStep = () => {
  if (!formState.isPropertyManagerRole && !formState.hasPropertyManager) {
    steps[0].step.isValid = true
  } else {
    validateStep(propertyManagerSchema, formState.propertyManager, 0)
  }
}

watch(formState.propertyManager, () => {
  validatePropertyManagerStep()
})

watch(formState.primaryContact, () => {
  validateStep(primaryContactSchema, formState.primaryContact, 1)
})

watch(formState.secondaryContact, () => {
  validateStep(secondaryContactSchema, formState.secondaryContact, 1)
})

watch(formState.propertyDetails, () => {
  validateStep(propertyDetailsSchema, formState.propertyDetails, 2)
})

const validateProofPage = () => {
  if (
    formState.principal.isPrincipalResidence &&
    formState.principal.agreedToRentalAct &&
    formState.supportingDocuments.length > 0
  ) {
    setStepValid(3, true)
  } else if (
    !formState.principal.isPrincipalResidence &&
    formState.principal.nonPrincipalOption &&
    formState.principal.nonPrincipalOption !== tPrincipalResidence('other')
  ) {
    setStepValid(3, true)
  } else if (
    !formState.principal.isPrincipalResidence &&
    formState.principal.nonPrincipalOption &&
    formState.principal.specifiedServiceProvider
  ) {
    setStepValid(3, true)
  } else {
    setStepValid(3, false)
  }
}

const validateReviewPage = () => {
  setStepValid(4, formState.principal.agreedToSubmit &&
    (formState.isPropertyManagerRole ? formState.hasHostAuthorization : true))
  steps[4].step.complete = true
}

watch(formState.supportingDocuments, () => {
  validateProofPage()
})

watch(formState.principal, () => {
  validateProofPage()
})

const validateSteps = () => {
  if (activeStepIndex.value === 0) {
    validatePropertyManagerStep()
  } else if (activeStepIndex.value === 1) {
    validateStep(primaryContactSchema, formState.primaryContact, 1)
    if (hasSecondaryContact.value) {
      validateStep(secondaryContactSchema, formState.secondaryContact, 1)
    }
  } else if (activeStepIndex.value === 2) {
    validateStep(propertyDetailsSchema, formState.propertyDetails, 2)
  } else if (activeStepIndex.value === 3) {
    validateProofPage()
  } else if (activeStepIndex.value === 4) {
    validateReviewPage()
  }
}

const setNextStep = () => {
  if (activeStepIndex.value < steps.length - 1) {
    validateSteps()
    const nextStep = activeStepIndex.value + 1
    activeStepIndex.value = nextStep
    activeStep.value = steps[activeStepIndex.value]
    steps[activeStepIndex.value - 1].step.complete = true
    scrollToTop()
  }
}

const setPreviousStep = () => {
  if (activeStepIndex.value > 0) {
    validateSteps()
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
