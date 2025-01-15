<script setup lang="ts">
import { isEmpty } from 'lodash'
import { ConnectPageSection, ConnectTransitionCollapse, HostDetailsOwners } from '#components'
import { useExaminerStore } from '~/store/examiner'
import type { HostDetailsDisplayItem } from '~/types/host-details-display-item'

const props = defineProps<{ application: HostApplicationResp }>()

const { t } = useI18n()
const { header, registration } = props.application
const { unitDetails, strRequirements } = registration

const emit = defineEmits<{
  approveApplication: [],
  rejectApplication: []
}>()

const { getDocument } = useExaminerStore()

const openDocInNewTab = async (supportingDocument: ApiDocument) => {
  const file = await getDocument(header.applicationNumber, supportingDocument.fileKey)
  const blob = new Blob([file], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  URL.revokeObjectURL(url)
}

const businessLicenceDoc = registration.documents
  .find(doc => doc.documentType === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE)

// Principal Residence Requirements:
const getPrRequired = (): string =>
  strRequirements?.isPrincipalResidenceRequired
    ? t('pr.required')
    : t('pr.notRequired')

const getPrExemptReason = (): string =>
  registration.unitDetails.prExemptReason
    ? t(`prExemptReason.${registration.unitDetails.prExemptReason}`)
    : t('prExemptReason.notExempt')

const getOwnershipType = (): string =>
  registration?.unitDetails.ownershipType === OwnershipType.RENT ? `${t('ownershipType.RENT')}.` : ''

const showExpansion = ref<boolean>(false)
const displayItem = ref<HostDetailsDisplayItem>(undefined)
const displayDetailsItem = (item: HostDetailsDisplayItem) => {
  displayItem.value = item
  showExpansion.value = true
}
</script>
<template>
  <div>
    <div class="grid grid-cols-4 gap-x-5 divide-x text-sm text-bcGovColor-midGray">
      <div class="space-y-2">
        <strong>{{ t('strr.label.rentalUnit').toUpperCase() }}</strong>
        <div class="w-[150px]">
          <UIcon name="i-mdi-map-marker-outline" />
          {{ displayFullUnitAddress(registration?.unitAddress) }}
        </div>
        <div v-if="strRequirements?.organizationNm">
          <UIcon name="i-mdi-map-outline" />
          {{ strRequirements?.organizationNm }}
        </div>
      </div>

      <div class="space-y-2 pl-5">
        <strong>{{ t('strr.label.host').toUpperCase() }}</strong>
        <div class="w-[150px]">
          <UIcon name="i-mdi-map-marker-outline" />
          {{ displayFullAddress(registration?.primaryContact.mailingAddress) }}
        </div>
        <div class="flex items-center gap-1">
          <UIcon name="i-mdi-account" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="displayContactFullName(registration?.primaryContact)"
            :padded="false"
            variant="link"
            @click="displayDetailsItem('primaryContact')"
          />
        </div>
        <div>
          <UIcon name="i-mdi-at" />
          {{ registration?.primaryContact.emailAddress }}
        </div>
        <div>
          <strong>{{ t('strr.label.hostType') }}</strong>
          {{ t(`ownerType.${registration?.primaryContact.contactType}`) }}
        </div>
        <div>
          <strong>{{ t('strr.label.ownerRenter') }}</strong>
          {{ t(`ownershipType.${unitDetails.ownershipType}`) }}
        </div>
      </div>

      <div class="space-y-2 pl-5">
        <div>
          {{ t(`propertyType.${unitDetails.propertyType}`) }}
        </div>
        <div v-if="unitDetails.numberOfRoomsForRent">
          {{ t(`rentalUnitType.${unitDetails.rentalUnitSpaceType}`) }}
          ({{ unitDetails.numberOfRoomsForRent + ' ' + t('strr.label.room', unitDetails.numberOfRoomsForRent) }})
        </div>
        <div>{{ t(`hostResidence.${unitDetails.hostResidence}`) }}</div>
        <div><strong>{{ t('strr.label.pid') }}</strong> {{ unitDetails.parcelIdentifier }}</div>
        <div>
          <strong>{{ t('strr.label.registeredRentals') }}</strong>
          <!-- TODO: Get number of registered rentals -->
        </div>
        <div>
          <strong>{{ t('strr.label.prRegisteredRentals') }}</strong>
          <!-- TODO: Get number of PR registered rentals -->
        </div>
      </div>

      <div class="space-y-2 pl-5">
        <div v-if="registration?.secondaryContact" class="flex items-center gap-1">
          <UIcon name="i-mdi-account-multiple-outline" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="registration?.secondaryContact?.contactType === OwnerType.INDIVIDUAL
              ? displayContactFullName(registration?.secondaryContact)
              : registration?.secondaryContact?.businessLegalName"
            :padded="false"
            variant="link"
            @click="displayDetailsItem('secondaryContact')"
          />
        </div>

        <div v-if="registration?.propertyManager?.propertyManagerType" class="flex items-center gap-1">
          <UIcon name="i-mdi-at" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="registration?.propertyManager?.propertyManagerType === OwnerType.INDIVIDUAL
              ? displayContactFullName(registration?.propertyManager.contact)
              : registration?.propertyManager?.business?.legalName"
            :padded="false"
            variant="link"
            @click="displayDetailsItem('propertyManager')"
          />
        </div>
      </div>
    </div>

    <ConnectTransitionCollapse>
      <ConnectPageSection v-if="showExpansion" class="my-10">
        <HostDetailsOwners
          :application="props.application.registration"
          :display="displayItem"
          @close="showExpansion = false"
        />
      </ConnectPageSection>
    </ConnectTransitionCollapse>

    <ConnectPageSection>
      <div class="divide-y px-10 py-6">
        <ApplicationDetailsSection v-if="strRequirements?.isStrProhibited" :label="t('strr.label.strProhibited')">
          {{ t('strr.label.strProhibitedAction') }}
        </ApplicationDetailsSection>

        <ApplicationDetailsSection
          v-if="strRequirements?.isBusinessLicenceRequired"
          :label="t('strr.label.businessLicence')"
        >
          <div class="flex gap-x-8">
            <UButton
              v-if="businessLicenceDoc"
              class="mr-4 gap-x-1 p-0"
              variant="link"
              icon="mdi-file-document-outline"
              @click="openDocInNewTab(businessLicenceDoc)"
            >
              {{ t(`documentLabels.${DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE}`) }}
            </UButton>
            <span v-if="unitDetails.businessLicense">
              {{ t('strr.label.businessLicenceNumber') }} {{ unitDetails.businessLicense }}
            </span>
            <span v-if="unitDetails.businessLicenseExpiryDate">
              {{ t('strr.label.businessLicenceExpiryDate') }}
              {{ dateToString(unitDetails.businessLicenseExpiryDate, 'MMM dd, yyyy') }}
            </span>
          </div>
        </ApplicationDetailsSection>

        <ApplicationDetailsSection :label="t('strr.label.prRequirement')">
          <div v-if="!isEmpty(strRequirements)">
            {{ getPrRequired() }}
            {{ getPrExemptReason() }}
            {{ getOwnershipType() }}
          </div>

          <div v-if="!isEmpty(registration.documents)" class="mt-2">
            <UButton
              v-for="document in registration.documents.filter(
                doc => doc.documentType !== DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
              )"
              :key="document.fileKey"
              class="mr-4 gap-x-1 p-0"
              variant="link"
              icon="mdi-file-document-outline"
              @click="openDocInNewTab(document)"
            >
              {{ t(`documentLabels.${document.documentType}`) }}
            </UButton>
          </div>
        </ApplicationDetailsSection>
      </div>
    </ConnectPageSection>
  </div>
</template>
