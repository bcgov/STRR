<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'

const props = defineProps<{ isComplete: boolean }>()

defineEmits<{ edit: [index: number] }>()

const { t } = useI18n()
const { hostTacUrl } = useRuntimeConfig().public
const propertyStore = useHostPropertyStore()
const ownerStore = useHostOwnerStore()
const { hasCompParty, hostOwners } = storeToRefs(ownerStore)
const documentsStore = useDocumentStore()
const applicationStore = useHostApplicationStore()
const reqStore = usePropertyReqStore()

const confirmationFormRef = ref<Form<z.output<typeof applicationStore.confirmationSchema>>>()
const sectionErrors = ref<MultiFormValidationResult>([])

const validateConfirmation = () => {
  confirmationFormRef.value?.validate(undefined, { silent: true })
}

const isSectionInvalid = (formId: string) => {
  return sectionErrors.value.some(item => item.formId === formId && !item.success)
}

// expose to trigger on application submission
defineExpose({ validateConfirmation })

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    validateConfirmation()
  }

  const validations = [
    propertyStore.validateBusinessLicense(),
    propertyStore.validateUnitAddress(),
    propertyStore.validateUnitDetails(),
    ownerStore.validateOwners(),
    applicationStore.validateUserConfirmation()
  ]

  const validationResults = await Promise.all(validations)
  sectionErrors.value = validationResults.flatMap(result => result as MultiFormValidationResult)
  // add documents section error if applicable
  if (documentsStore.validateRequiredDocuments().length > 0) {
    sectionErrors.value.push({
      formId: 'supporting-documents',
      success: false,
      errors: []
    })
  }
})

// TODO: move to common util or store (also used in summary component)
const getFullName = (owner: HostOwner) => {
  return `${owner.firstName || ''} ${owner.middleName || ''} ${owner.lastName || ''}`.replaceAll('  ', ' ').trim()
}
const getCompPartyName = computed(() => {
  const compPartyIdx = ownerStore.findCompPartyIndex()
  if (hasCompParty.value && hostOwners.value[compPartyIdx]) {
    return getFullName(hostOwners.value[compPartyIdx])
  }
  return `[${t('label.completingParty')}]`
})

const agreedToRentalActListItems = computed(() => {
  if (
    reqStore.hasReqs &&
      (!reqStore.propertyReqs.isPrincipalResidenceRequired || reqStore.prRequirements.prExemptionReason !== undefined)
  ) {
    return [{ slot: 'item-1' }, { i18nKey: 'certify.2' }, { i18nKey: 'certify.4' }]
  } else {
    return [{ slot: 'item-1' }, { i18nKey: 'certify.2' }, { i18nKey: 'certify.3' }, { i18nKey: 'certify.4' }]
  }
})
</script>
<template>
  <div class="space-y-10" data-testid="strata-review-confirm">
    <!-- step 1: property details -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.label.shortTermRental'),
        labelClass: 'text-lg font-bold text-gray-900',
        icon: 'i-mdi-map-marker-plus-outline',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('rental-unit-address-form') || isSectionInvalid('unit-details-form')"
        @edit="$emit('edit', 0)"
      >
        <SummaryProperty />
      </FormCommonReviewSection>
    </ConnectPageSection>
    <!-- step 2: Individuals and Businesses -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.label.individualsBusinesses'),
        labelClass: 'text-lg font-bold text-gray-900',
        icon: 'i-mdi-account-multiple-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('host-owners')"
        @edit="$emit('edit', 1)"
      >
        <SummaryOwners v-if="ownerStore.hostOwners.length" />
      </FormCommonReviewSection>
    </ConnectPageSection>
    <!-- step 3: supporting info -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.label.supportingInfo'),
        labelClass: 'text-lg font-bold text-gray-900',
        icon: 'i-mdi-file-upload-outline',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('business-license-form') || isSectionInvalid('supporting-documents')"
        @edit="$emit('edit', 2)"
      >
        <SummarySupportingInfo />
      </FormCommonReviewSection>
    </ConnectPageSection>
    <!-- certify -->
    <UForm
      ref="confirmationFormRef"
      :state="applicationStore.userConfirmation"
      :schema="applicationStore.confirmationSchema"
      class="space-y-10"
    >
      <ConnectFormCertify
        v-model="applicationStore.userConfirmation.agreedToRentalAct"
        data-testid="section-agreed-to-rental-act"
        :items="agreedToRentalActListItems"
        :checkbox-label="{ key: 'certify.confirm', props: { name: getCompPartyName } }"
        :has-error="isComplete && hasFormErrors(confirmationFormRef, ['agreedToRentalAct'])"
        name="agreedToRentalAct"
      >
        <template #item-1>
          <i18n-t keypath="certify.1" scope="global">
            <template #terms>
              <strong>{{ $t('certify.tac') }}</strong>
            </template>
            <template #link>
              <UButton
                :label="$t('link.hostTAC')"
                :to="hostTacUrl"
                :padded="false"
                variant="link"
                target="_blank"
                class="text-base underline"
              />
            </template>
          </i18n-t>
        </template>
      </ConnectFormCertify>
      <ConnectFormCertify
        v-model="applicationStore.userConfirmation.agreedToSubmit"
        :title="$t('label.authorization')"
        :items="[]"
        :checkbox-label="{ key: 'certify.authorization', props: { name: getCompPartyName } }"
        :has-error="isComplete && hasFormErrors(confirmationFormRef, ['agreedToSubmit'])"
        name="agreedToSubmit"
      >
        <template #checkboxLabel>
          <div>
            <ConnectI18nHelper
              class="text-bcGovGray-700"
              translation-path="certify.authorization"
              :name="getCompPartyName"
            />
            <dl class="mt-4 flex gap-2">
              <dt class="font-bold">
                {{ $t('label.date') }}:
              </dt>
              <dd>{{ dateToStringPacific(new Date(), 'DDD') }}</dd>
            </dl>
          </div>
        </template>
      </ConnectFormCertify>
    </UForm>
  </div>
</template>
