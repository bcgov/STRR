<template>
  <div data-cy="create-account-page" class="relative h-full">
    <div class="w-full flex flex-col justify-between desktop:justify-center items-center">
      <div class="shrink w-full flex flex-row mobile:flex-col mobile:justify-between max-w-[1360px] justify-center">
        <div class="grow pr-[24px] mobile:pr-[0px]">
          <div class="mobile:px-[8px]">
            <BcrosTypographyH1 text="create-account.title" data-cy="accountPageTitle" class="mobile:pb-[20px]" />
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
                :id="id.toString()"
                ref="contactForm"
                :full-name="userFullName"
                :add-secondary-contact="addSecondaryContact"
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
                :secondary-contact="addSecondaryContact"
                :is-complete="steps[activeStepIndex].step.complete"
              />
            </div>
          </div>
        </div>
        <div class="shrink mobile:grow">
          <BcrosFeeWidget
            :fee="fee"
          />
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
import steps from '../../page-data/create-account/steps'
import { FormPageI } from '~/interfaces/form/form-page-i'

const addSecondaryContact: Ref<boolean> = ref(false)
const activeStepIndex: Ref<number> = ref(0)
const activeStep: Ref<FormPageI> = ref(steps[activeStepIndex.value])
const tPrincipalResidence = (translationKey: string) => t(`create-account.principal-residence.${translationKey}`)
const contactForm = ref()
const fee = ref<string>()
const headerUpdateKey = ref(0)
const route = useRoute()

const id = route.params.id

const { getFeeAmount } = useFees()

const updateFees = async () => {
  fee.value = await getFeeAmount()
}

onMounted(() => {
  updateFees()
})

const t = useNuxtApp().$i18n.t
const {
  currentAccount,
  userFullName,
  userFirstName,
  userLastName
} = useBcrosAccount()

const toggleAddSecondary = () => { addSecondaryContact.value = !addSecondaryContact.value }

const propertyToApiType = (type: string | undefined): string => {
  switch (type) {
    case (t('create-account.property-form.primaryDwelling')):
      return 'PRIMARY'
    case (t('create-account.property-form.secondarySuite')):
      return 'SECONDARY'
    case (t('create-account.property-form.accessory')):
      return 'ACCESSORY'
    case (t('create-account.property-form.float')):
      return 'FLOAT_HOME'
    case (t('create-account.property-form.other')):
      return 'OTHER'
  }
  return ''
}

const ownershipToApiType = (type: string | undefined): string => {
  switch (type) {
    case (t('create-account.property-form.rent')):
      return 'RENT'
    case (t('create-account.property-form.own')):
      return 'OWN'
    case (t('create-account.property-form.other')):
      return 'CO_OWN'
  }
  return ''
}

const submit = () => {
  validateStep(contactSchema, formState.primaryContact, 0)
  validateStep(contactSchema, formState.secondaryContact, 0)
  validateStep(propertyDetailsSchema, formState.propertyDetails, 1)
  steps[1].step.complete = true
  steps[2].step.complete = true
  headerUpdateKey.value++
  formState.principal.agreeToSubmit
    ? submitCreateAccountForm(
      userFirstName,
      userLastName,
      currentAccount.id,
      addSecondaryContact.value,
      propertyToApiType(formState.propertyDetails.propertyType),
      ownershipToApiType(formState.propertyDetails.ownershipType)
    )
    : steps[3].step.complete = true
}

const setActiveStep = (newStep: number) => {
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
  validateStep(contactSchema, formState.primaryContact, 0)
})

watch(formState.secondaryContact, () => {
  validateStep(contactSchema, formState.secondaryContact, 0)
})

watch(formState.propertyDetails, () => {
  validateStep(propertyDetailsSchema, formState.propertyDetails, 1)
})

const validateProofPage = () => {
  if (formState.principal.isPrincipal &&
    formState.principal.declaration &&
    formState.supportingDocuments.length > 0
  ) {
    setStepValid(2, true)
  } else if (!formState.principal.isPrincipal &&
    formState.principal.reason &&
    formState.principal.reason !== tPrincipalResidence('other')
  ) {
    setStepValid(2, true)
  } else if (!formState.principal.isPrincipal &&
    formState.principal.reason &&
    formState.principal.otherReason
  ) {
    setStepValid(2, true)
  } else {
    setStepValid(2, false)
  }
}

watch(formState.supportingDocuments, () => {
  validateProofPage()
})

watch(formState.principal, () => {
  validateProofPage()
})

const setNextStep = () => {
  if (activeStepIndex.value < steps.length - 1) {
    const nextStep = activeStepIndex.value + 1
    activeStepIndex.value = nextStep
    activeStep.value = steps[activeStepIndex.value]
    steps[activeStepIndex.value - 1].step.complete = true
  }
}

const setPreviousStep = () => {
  if (activeStepIndex.value > 0) {
    const nextStep = activeStepIndex.value - 1
    activeStepIndex.value = nextStep
    activeStep.value = steps[activeStepIndex.value]
    steps[activeStepIndex.value + 1].step.complete = true
  }
}

definePageMeta({
  layout: 'wide'
})

</script>
