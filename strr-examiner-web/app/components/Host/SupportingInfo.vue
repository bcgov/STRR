<script setup lang="ts">
import isEmpty from 'lodash/isEmpty'
import { ConnectPageSection } from '#components'
import { useExaminerStore } from '~/stores/examiner'
import { useExaminerDocumentStore } from '~/stores/document'
import { useFlags } from '~/composables/useFlags'

const exStore = useExaminerStore()
const { activeReg, isApplication } = storeToRefs(exStore)
const { t } = useNuxtApp().$i18n
const alertFlags = reactive(useFlags())
const { isFeatureEnabled } = useFeatureFlags()
const isBusinessLicenseDocumentUploadEnabled = isFeatureEnabled('enable-business-license-document-upload')
const { isSnapshotRoute } = useExaminerRoute()

const docStore = useExaminerDocumentStore()
const { isPrUploadOpen } = storeToRefs(docStore)

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

const needsBusinessLicenseDocumentUpload = computed(() => {
  if (!isBusinessLicenseDocumentUploadEnabled.value || !activeReg.value) {
    return false
  }
  if (activeReg.value.status !== RegistrationStatus.ACTIVE) {
    return false
  }
  const jurisdiction = activeReg.value.unitDetails?.jurisdiction
  const needsBusinessLicense = activeReg.value.status === RegistrationStatus.ACTIVE &&
    needsBusinessLicenseUpload(jurisdiction)
  return needsBusinessLicense
})

const shouldShowBlUploadBtnAlerts = computed(() => {
  if (isApplication.value) {
    return false
  }
  return needsBusinessLicenseDocumentUpload.value
})

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

// all documents for registrations with date badges, excluding BL (they are in its own section)
const registrationDocumentsConfig: SupportingDocumentsConfig = {
  excludeTypes: [DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE],
  excludeUploadStep: [DocumentUploadStep.NOC],
  showDateBadgeForAll: true
}

// BL documents for registrations with date badges
const businessLicenseRegistrationConfig: SupportingDocumentsConfig = {
  includeTypes: [DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE],
  excludeUploadStep: [DocumentUploadStep.NOC],
  showDateBadgeForAll: true
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
      <div class="grid grid-cols-12 items-start gap-4">
        <div
          :class="!isApplication &&
            (activeReg?.status === RegistrationStatus.ACTIVE ||
              activeReg?.status === RegistrationStatus.SUSPENDED)
            ? 'col-span-11'
            : 'col-span-12'"
          class="divide-y"
        >
          <ApplicationDetailsSection
            v-if="hasBlSection"
            :label="t('strr.label.businessLicence')"
            :sub-label="getBlSectionSubLabel()"
            data-testid="business-lic-section"
          >
            <template #icon>
              <AlertFlag
                v-if="shouldShowBlUploadBtnAlerts"
                :tooltip-text="t('alert.businessLicense.title')"
                data-testid="flag-business-license"
              />
            </template>
            <div class="flex items-start gap-1" :class="{ 'justify-between': shouldShowBlUploadBtnAlerts }">
              <div class="flex flex-1 flex-col gap-y-2">
                <div v-if="businessLicenseExemptReason">
                  <strong>{{ t('strr.label.exemptionReason') }}</strong> {{ businessLicenseExemptReason }}
                </div>
                <div class="flex gap-x-8">
                  <span v-if="businessLicenseNum">
                    {{ t('strr.label.businessLicenceNumber') }} {{ businessLicenseNum }}
                  </span>
                  <span v-if="businessLicenseExpiryDate">
                    {{ t('strr.label.businessLicenceExpiryDate') }}
                    {{ dateToString(businessLicenseExpiryDate, 'MMM dd, yyyy') }}
                  </span>
                </div>
                <div>
                  <SupportingDocuments
                    class="mb-1 flex flex-col gap-y-2"
                    data-testid="bl-documents"
                    :config="isApplication ? businessLicenseDocumentsConfig : businessLicenseRegistrationConfig"
                  />
                  <SupportingDocuments
                    class="mb-1 flex flex-col gap-y-2"
                    data-testid="bl-noc-documents"
                    :config="businessLicenseNocDocumentsConfig"
                  />
                </div>
              </div>
            </div>
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
            <div class="flex items-start justify-between gap-1">
              <div class="flex flex-1 flex-col gap-y-2">
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
                    class="mb-1 flex flex-col gap-y-2"
                    data-testid="initial-app-documents"
                    :config="isApplication ? applicationDocumentsConfig : registrationDocumentsConfig"
                  />
                  <SupportingDocuments
                    class="flex flex-col gap-y-2"
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
            </div>
          </ApplicationDetailsSection>
        </div>
        <div
          v-if="!isApplication && !isSnapshotRoute &&
            (activeReg?.status === RegistrationStatus.ACTIVE ||
              activeReg?.status === RegistrationStatus.SUSPENDED)"
          class="col-span-1 flex justify-end"
        >
          <UButton
            label="Add Document"
            variant="outline"
            size="sm"
            data-testid="add-pr-doc-btn"
            :disabled="isPrUploadOpen"
            @click="docStore.openPrUpload()"
          />
        </div>
      </div>
    </div>
  </ConnectPageSection>
</template>
