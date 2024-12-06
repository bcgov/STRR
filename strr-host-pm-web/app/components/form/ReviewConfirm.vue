<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'

const props = defineProps<{ isComplete: boolean }>()

defineEmits<{
  edit: [index: number]
}>()

const { t } = useI18n()
const { hostTacUrl } = useRuntimeConfig().public
// const accountStore = useConnectAccountStore()
const propertyStore = useHostPropertyStore()
const { blInfo, unitAddress, unitDetails } = storeToRefs(propertyStore)
const { prRequirements, requirementsList, showUnitDetailsForm } = storeToRefs(usePropertyReqStore())
const ownerStore = useHostOwnerStore()
const { hasCompParty, hostOwners } = storeToRefs(ownerStore)
const documentsStore = useDocumentStore()
const { storedDocuments } = storeToRefs(documentsStore)
const applicationStore = useHostApplicationStore()

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

// step 1 items
const exemptInfo = computed((): ConnectInfoTableItem[] => [
  { label: '', info: '', slot: 'border' },
  { label: t('label.exemption'), info: '', slot: 'exempt' },
  { label: t('label.exemptionReason'), info: t(`label.exemptionReasonCode.${prRequirements.value.prExemptionReason}`) }
])
const propertyInfo = computed((): ConnectInfoTableItem[] => [
  { label: t('label.strUnitName'), info: unitAddress.value.address.nickname || t('text.notEntered') },
  { label: t('label.strUnitAddress'), info: '', slot: 'address' },
  ...(prRequirements.value.isPropertyPrExempt
    ? exemptInfo.value
    : []
  ),
  { label: '', info: '', slot: 'border' },
  { label: t('strr.label.propertyType'), info: t(`propertyType.${unitDetails.value.propertyType}`) },
  { label: t('label.typeOfSpace'), info: t(`rentalUnitType.${unitDetails.value.typeOfSpace}`) },
  { label: t('strr.label.rentalUnitSetup'), info: t(`rentalUnitSetupType.${unitDetails.value.rentalUnitSetupType}`) },
  { label: t('strr.label.numberOfRooms'), info: unitDetails.value.numberOfRoomsForRent },
  { label: '', info: '', slot: 'border' },
  { label: t('strr.label.ownershipType'), info: t(`ownershipType.${unitDetails.value.ownershipType}`) },
  { label: t('strr.label.parcelId'), info: unitDetails.value.parcelIdentifier || t('text.notEntered') }
])

// step 3 items
const supportingInfo = computed(() => [
  { label: t('strr.label.supportingDocs'), info: storedDocuments.value, slot: 'documents' },
  { label: '', info: '', slot: 'border' },
  { label: t('strr.label.businessLicense'), info: blInfo.value.businessLicense || t('text.notEntered') },
  { label: t('strr.label.businessLicenseDate'), info: blInfo.value.businessLicenseExpiryDate || t('text.notEntered') }
])

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
</script>
<template>
  <div class="space-y-10" data-testid="strata-review-confirm">
    <!-- property details -->
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
        <ConnectInfoTable :items="propertyInfo">
          <template #label-border>
            <div class="h-px w-full border-b border-gray-100" />
          </template>
          <template #info-border>
            <div class="-ml-4 h-px w-full border-b border-gray-100" />
          </template>
          <template #info-address>
            <ConnectFormAddressDisplay :address="unitAddress.address" />
          </template>
          <template #info-exempt>
            <div class="flex gap-2">
              <UIcon name="i-mdi-check" class="mt-[2px] size-4 text-green-600" />
              <p>{{ $t('text.thisPropIsExempt') }}</p>
            </div>
          </template>
        </ConnectInfoTable>
      </FormCommonReviewSection>
    </ConnectPageSection>
    <!-- Individuals and Businesses -->
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
        <ConnectInfoTable :items="supportingInfo">
          <template #label-border>
            <div class="h-px w-full border-b border-gray-100" />
          </template>
          <template #info-border>
            <div class="-ml-4 h-px w-full border-b border-gray-100" />
          </template>
          <template #info-documents>
            <div class="space-y-1">
              <div v-if="!requirementsList.length && showUnitDetailsForm">
                <div class="flex gap-2">
                  <UIcon name="i-mdi-check" class="mt-[2px] size-4 text-green-600" />
                  <p>{{ $t('text.noDocsReq') }}</p>
                </div>
              </div>
              <div v-else-if="!storedDocuments.length">
                <p>{{ $t('text.noDocsUploaded') }}</p>
              </div>
              <div v-for="doc in storedDocuments" :key="doc.id" class="flex w-full gap-2">
                <UIcon
                  name="i-mdi-paperclip"
                  class="size-6 text-blue-500"
                />
                <div class="flex flex-col">
                  <span class="text-sm font-bold">{{ $t(`form.pr.docType.${doc.type}`) }}</span>
                  <span>{{ doc.name }}</span>
                </div>
              </div>
            </div>
          </template>
        </ConnectInfoTable>
      </FormCommonReviewSection>
    </ConnectPageSection>
    <UForm
      ref="confirmationFormRef"
      :state="applicationStore.userConfirmation"
      :schema="applicationStore.confirmationSchema"
      class="space-y-10"
    >
      <ConnectFormCertify
        v-model="applicationStore.userConfirmation.agreedToRentalAct"
        :items="[{ slot: 'item-1' }, { i18nKey: 'certify.2' }, { i18nKey: 'certify.3' }, { i18nKey: 'certify.4' }]"
        :checkbox-label="{ key: 'certify.confirm', props: { name: getCompPartyName } }"
        :has-error="isComplete && hasFormErrors(confirmationFormRef, ['agreedToRentalAct'])"
        name="agreedToRentalAct"
      >
        <template #item-1>
          <i18n-t keypath="certify.1" scope="global">
            <template #terms>
              <strong>{{ $t('certify.tac') }}.</strong>
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
            <ConnectI18nBold
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
