<script setup lang="ts">
import isEmpty from 'lodash/isEmpty'
import { ConnectPageSection } from '#components'
import { useExaminerStore } from '~/stores/examiner'
import { useFlags } from '~/composables/useFlags'

const exStore = useExaminerStore()
const { activeReg, isApplication } = storeToRefs(exStore)
const { t } = useI18n()
const alertFlags = reactive(useFlags())

// Principal Residence Requirements:
const getPrRequired = (): string => {
  if (!isApplication.value) {
    return ''
  }
  return activeReg.value?.strRequirements?.isPrincipalResidenceRequired
    ? t('pr.required')
    : t('pr.notRequired')
}

const getBlRequired = (): string => {
  if (!isApplication.value) {
    return ''
  }
  return activeReg.value?.strRequirements?.isBusinessLicenceRequired
    ? t('pr.required')
    : t('pr.notRequired')
}

const prExemptReason = activeReg.value?.unitDetails?.prExemptReason
const businessLicenseExemptReason = activeReg.value?.unitDetails?.blExemptReason
const businessLicenseNum = activeReg.value.unitDetails?.businessLicense
const businessLicenseExpiryDate = activeReg.value.unitDetails?.businessLicenseExpiryDate

const getPrExemptReason = (label: string): string =>
  t(`prExemptReason.${label}`)

const getPrExempt = (): string =>
  prExemptReason
    ? t('pr.exempt')
    : t('pr.notExempt')

const getBlExempt = (): string =>
  businessLicenseExemptReason
    ? t('pr.exempt')
    : t('pr.notExempt')

const getStrataHotelCategory = (): string =>
  activeReg.value?.unitDetails?.strataHotelCategory
    ? t(`strataHotelCategoryReview.${activeReg.value.unitDetails.strataHotelCategory}`)
    : ''

const getOwnershipType = (): string =>
  activeReg.value?.unitDetails?.ownershipType === OwnershipType.RENT ? `${t('ownershipType.RENT')}.` : ''

const getPrSectionSubLabel = (): string =>
  `${getPrRequired()} ${getPrExempt()} ${getOwnershipType()}`

const getBlSectionSubLabel = (): string =>
  `${getBlRequired()} ${getBlExempt()}`

const hasPRFlags = computed(() =>
  (isApplication.value && alertFlags.isNotSameProperty) || alertFlags.isHostTypeBusiness)

const hasBusinessLicenseDocument = computed((): boolean =>
  activeReg.value.documents.some((doc: ApiDocument) =>
    doc.documentType === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
  )
)

const hasBlSection = computed((): boolean =>
  hasBusinessLicenseDocument.value ||
  businessLicenseExemptReason ||
  businessLicenseNum ||
  businessLicenseExpiryDate
)

// only BL docs during initial application submission, do not show badges
const businessLicenseDocumentsConfig: SupportingDocumentsConfig = {
  includeTypes: [DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE],
  excludeUploadStep: [DocumentUploadStep.NOC]
}

// only BL docs during NOC Pending, show badges for NOC docs
const businessLicenseNocDocumentsConfig: SupportingDocumentsConfig = {
  includeTypes: [DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE],
  includeUploadStep: [DocumentUploadStep.NOC],
  includeDateBadge: [DocumentUploadStep.NOC]
}

// all documents during initial application, excluding BL (they are in its own section)
const applicationDocumentsConfig: SupportingDocumentsConfig = {
  excludeTypes: [DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE],
  excludeUploadStep: [DocumentUploadStep.NOC]
}

// only NOC documents with date badges, excluding BL (they are in its own section)
const nocDocumentsConfig: SupportingDocumentsConfig = {
  excludeTypes: [DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE],
  includeUploadStep: [DocumentUploadStep.NOC],
  includeDateBadge: [DocumentUploadStep.NOC]
}

</script>
<template>
  <ConnectPageSection>
    <div class="divide-y px-10 py-6">
      <ApplicationDetailsSection
        v-if="activeReg?.strRequirements?.isStrProhibited"
        :label="t('strr.label.strProhibited')"
        data-testid="str-prohibited-section"
      >
        <template #icon>
          <AlertFlag data-testid="flag-str-prohibited" />
        </template>
        {{ t('strr.label.strProhibitedAction') }}
      </ApplicationDetailsSection>

      <ApplicationDetailsSection
        v-if="hasBlSection"
        :label="t('strr.label.businessLicence')"
        :sub-label="getBlSectionSubLabel()"
        data-testid="business-lic-section"
      >
        <div class="flex gap-x-8">
          <div v-if="businessLicenseExemptReason">
            <strong>{{ t('strr.label.exemptionReason') }}</strong> {{ businessLicenseExemptReason }}
          </div>
          <span v-if="businessLicenseNum">
            {{ t('strr.label.businessLicenceNumber') }} {{ businessLicenseNum }}
          </span>
          <span v-if="businessLicenseExpiryDate">
            {{ t('strr.label.businessLicenceExpiryDate') }}
            {{ dateToString(businessLicenseExpiryDate, 'MMM dd, yyyy') }}
          </span>
          <SupportingDocuments
            class="mb-1 flex flex-wrap gap-y-1"
            data-testid="bl-documents"
            :config="businessLicenseDocumentsConfig"
          />
        </div>

        <SupportingDocuments
          class="mb-1 flex flex-wrap gap-y-1"
          data-testid="bl-noc-documents"
          :config="businessLicenseNocDocumentsConfig"
        />
      </ApplicationDetailsSection>

      <ApplicationDetailsSection
        :label="t('strr.label.prRequirement')"
        :sub-label="getPrSectionSubLabel()"
        data-testid="pr-req-section"
      >
        <template #icon>
          <AlertFlag
            v-if="(isApplication && alertFlags.isNotSameProperty) || alertFlags.isHostTypeBusiness"
            data-testid="flag-pr-requirement"
          />
        </template>
        <div class="flex">
          <div
            v-if="prExemptReason || getStrataHotelCategory()"
            class="mb-2 flex gap-x-8"
          >
            <span v-if="prExemptReason">
              <strong>{{ t('strr.label.exemptionReason') }}</strong> {{ getPrExemptReason(prExemptReason) }}
            </span>
            <span v-if="getStrataHotelCategory()">
              <strong>{{ t('label.strataHotelCategory') }}:</strong> {{ getStrataHotelCategory() }}
            </span>
          </div>
          <div
            v-if="activeReg.documents && !isEmpty(activeReg.documents)"
            data-testid="pr-req-documents"
          >
            <SupportingDocuments
              class="mb-1 flex gap-y-1"
              data-testid="initial-app-documents"
              :config="applicationDocumentsConfig"
            />
            <SupportingDocuments
              class="flex flex-wrap gap-y-1"
              data-testid="noc-documents"
              :config="nocDocumentsConfig"
            />
          </div>
          <div
            v-if="hasPRFlags"
            class="w-full space-y-5"
          >
            <div
              v-if="isApplication && alertFlags.isNotSameProperty"
              class="font-bold text-red-600"
            >
              {{ t('strr.alertFlags.notSameProperty') }}
            </div>
            <div
              v-if="alertFlags.isHostTypeBusiness"
              class="font-bold text-red-600"
            >
              {{ t('strr.alertFlags.hostIsBusiness') }}
            </div>
          </div>
        </div>
      </ApplicationDetailsSection>
    </div>
  </ConnectPageSection>
</template>
