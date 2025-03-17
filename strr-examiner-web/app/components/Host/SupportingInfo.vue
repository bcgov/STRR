<script setup lang="ts">
import isEmpty from 'lodash/isEmpty'
import { ConnectPageSection } from '#components'
import { useExaminerStore } from '~/stores/examiner'
import { useFlags } from '~/composables/useFlags'

const exStore = useExaminerStore()
const { getDocument } = exStore
const { activeReg, activeHeader, isApplication } = storeToRefs(exStore)
const { t } = useI18n()
const alertFlags = reactive(useFlags())

const openDocInNewTab = async (supportingDocument: ApiDocument) => {
  if (activeReg.value !== undefined) {
    const file = await getDocument(activeHeader.value.applicationNumber!, supportingDocument.fileKey)
    const blob = new Blob([file], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    URL.revokeObjectURL(url)
  }
}

const businessLicenceDoc = activeReg.value?.documents.length > 0
  ? activeReg.value.documents
    .find(doc => doc.documentType === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE)
  : undefined

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

const blExemptReason = activeReg.value?.unitDetails?.blExemptReason
const prExemptReason = activeReg.value?.unitDetails?.prExemptReason

const getPrExemptReason = (label: string): string =>
  t(`prExemptReason.${label}`)

const getPrExempt = (): string =>
  activeReg.value?.unitDetails?.prExemptReason
    ? t('pr.exempt')
    : t('pr.notExempt')

const getBlExempt = (): string =>
  activeReg.value?.unitDetails?.blExemptReason
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
        v-if="activeReg?.strRequirements?.isBusinessLicenceRequired"
        :label="t('strr.label.businessLicence')"
        :sub-label="getBlSectionSubLabel()"
        data-testid="business-lic-section"
      >
        <div class="flex gap-x-8">
          <span v-if="blExemptReason">
            <strong>{{ t('strr.label.exemptionReason') }}</strong> {{ blExemptReason }}
          </span>
          <template v-else>
            <UButton
              v-if="businessLicenceDoc"
              class="mr-4 gap-x-1 p-0"
              variant="link"
              icon="mdi-file-document-outline"
              data-testid="open-business-lic-btn"
              @click="openDocInNewTab(businessLicenceDoc)"
            >
              {{ t(`documentLabels.${DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE}`) }}
            </UButton>
            <span v-if="activeReg.unitDetails?.businessLicense">
              {{ t('strr.label.businessLicenceNumber') }} {{ activeReg?.unitDetails.businessLicense }}
            </span>
            <span v-if="activeReg.unitDetails?.businessLicenseExpiryDate">
              {{ t('strr.label.businessLicenceExpiryDate') }}
              {{ dateToString(activeReg.unitDetails.businessLicenseExpiryDate, 'MMM dd, yyyy') }}
            </span>
          </template>
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
        <div class="flex gap-y-2">
          <div
            v-if="prExemptReason || getStrataHotelCategory()"
            class="flex gap-x-8"
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
            class="flex flex-wrap gap-y-1"
            data-testid="pr-req-documents"
          >
            <span
              v-for="document in activeReg.documents.filter(
                (doc: ApiDocument) => doc.documentType !== DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
              )"
              :key="document.fileKey"
              class="mr-4 flex whitespace-nowrap"
            >
              <UButton
                class="gap-x-1 p-0"
                variant="link"
                icon="mdi-file-document-outline"
                @click="openDocInNewTab(document)"
              >
                {{ t(`documentLabels.${document.documentType}`) }}
              </UButton>
              <UBadge
                v-if="document.uploadStep === DocumentUploadStep.NOC"
                :label="`${ t('strr.label.added')} ` + document.uploadDate"
                size="sm"
                class="ml-1 px-3 py-0 font-bold"
                data-testid="supporting-doc-date-badge"
              />
            </span>
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
