<script setup lang="ts">
import isEmpty from 'lodash'
import { ConnectPageSection } from '#components'
import { useExaminerStore } from '~/stores/examiner'

const props = defineProps<{
  application: HostApplicationResp | undefined
}>()
const reg = props.application?.registration

const { t } = useI18n()
const { getDocument } = useExaminerStore()

const openDocInNewTab = async (supportingDocument: ApiDocument) => {
  if (props.application !== undefined) {
    const file = await getDocument(props.application.header.applicationNumber, supportingDocument.fileKey)
    const blob = new Blob([file], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    URL.revokeObjectURL(url)
  }
}

const businessLicenceDoc = reg?.documents
  ? reg.documents
    .find(doc => doc.documentType === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE)
  : undefined

// Principal Residence Requirements:
const getPrRequired = (): string =>
  reg?.strRequirements?.isPrincipalResidenceRequired
    ? t('pr.required')
    : t('pr.notRequired')

const getPrExemptReason = (): string =>
  reg?.unitDetails?.prExemptReason
    ? t(`prExemptReason.${reg.unitDetails.prExemptReason}`)
    : t('prExemptReason.notExempt')

const getOwnershipType = (): string =>
  reg?.unitDetails?.ownershipType === OwnershipType.RENT ? `${t('ownershipType.RENT')}.` : ''
</script>
<template>
  <ConnectPageSection>
    <div class="divide-y px-10 py-6">
      <ApplicationDetailsSection v-if="reg?.strRequirements?.isStrProhibited" :label="t('strr.label.strProhibited')">
        {{ t('strr.label.strProhibitedAction') }}
      </ApplicationDetailsSection>

      <ApplicationDetailsSection
        v-if="reg?.strRequirements?.isBusinessLicenceRequired"
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
          <span v-if="reg.unitDetails?.businessLicense">
            {{ t('strr.label.businessLicenceNumber') }} {{ reg.unitDetails.businessLicense }}
          </span>
          <span v-if="reg.unitDetails?.businessLicenseExpiryDate">
            {{ t('strr.label.businessLicenceExpiryDate') }}
            {{ dateToString(reg.unitDetails.businessLicenseExpiryDate, 'MMM dd, yyyy') }}
          </span>
        </div>
      </ApplicationDetailsSection>

      <ApplicationDetailsSection :label="t('strr.label.prRequirement')">
        <div v-if="!isEmpty(reg?.strRequirements)">
          {{ getPrRequired() }}
          {{ getPrExemptReason() }}
          {{ getOwnershipType() }}
        </div>

        <div v-if="!isEmpty(reg?.documents)" class="mt-2">
          <UButton
            v-for="document in application.registration.documents.filter(
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
</template>
