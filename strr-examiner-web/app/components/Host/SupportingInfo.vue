<script setup lang="ts">
import isEmpty from 'lodash/isEmpty'
import { ConnectPageSection } from '#components'
import { useExaminerStore } from '~/stores/examiner'
import { useFlags } from '~/composables/useFlags'

const props = defineProps<{
  data: HostApplicationResp | HostRegistrationResp | undefined
}>()

const isApplication = props.data ? 'registration' in props.data : false
const reg = props.data ? (isApplication ? props.data.registration : props.data) : undefined
const header = props.data?.header
const { t } = useI18n()
const { getDocument } = useExaminerStore()
const alertFlags = reactive(useFlags(props.data, isApplication))

const openDocInNewTab = async (supportingDocument: ApiDocument) => {
  if (props.data !== undefined) {
    const file = await getDocument(header.applicationNumber!, supportingDocument.fileKey)
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

const getBlRequired = (): string =>
  reg?.strRequirements?.isBusinessLicenceRequired
    ? t('pr.required')
    : t('pr.notRequired')

const blExemptReason = reg?.unitDetails?.blExemptReason
const prExemptReason = reg?.unitDetails?.prExemptReason

const getPrExemptReason = (label: string): string =>
  t(`prExemptReason.${label}`)

const getPrExempt = (): string =>
  reg?.unitDetails?.prExemptReason
    ? t('pr.exempt')
    : t('pr.notExempt')

const getBlExempt = (): string =>
  reg?.unitDetails?.blExemptReason
    ? t('pr.exempt')
    : t('pr.notExempt')

const getStrataHotelCategory = (): string =>
  reg?.unitDetails?.strataHotelCategory
    ? t(`strataHotelCategoryReview.${reg.unitDetails.strataHotelCategory}`)
    : ''

const getOwnershipType = (): string =>
  reg?.unitDetails?.ownershipType === OwnershipType.RENT ? `${t('ownershipType.RENT')}.` : ''

const getPrSectionSubLabel = (): string =>
  `${getPrRequired()} ${getPrExempt()} ${getOwnershipType()}`

const getBlSectionSubLabel = (): string =>
  `${getBlRequired()} ${getBlExempt()}`

</script>
<template>
  <ConnectPageSection>
    <div class="divide-y px-10 py-6">
      <ApplicationDetailsSection
        v-if="reg?.strRequirements?.isStrProhibited"
        :label="t('strr.label.strProhibited')"
        data-testid="str-prohibited-section"
      >
        <template #icon>
          <AlertFlag data-testid="flag-str-prohibited" />
        </template>
        {{ t('strr.label.strProhibitedAction') }}
      </ApplicationDetailsSection>

      <ApplicationDetailsSection
        v-if="reg?.strRequirements?.isBusinessLicenceRequired"
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
            <span v-if="reg.unitDetails?.businessLicense">
              {{ t('strr.label.businessLicenceNumber') }} {{ reg.unitDetails.businessLicense }}
            </span>
            <span v-if="reg.unitDetails?.businessLicenseExpiryDate">
              {{ t('strr.label.businessLicenceExpiryDate') }}
              {{ dateToString(reg.unitDetails.businessLicenseExpiryDate, 'MMM dd, yyyy') }}
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
            v-if="alertFlags.isNotSameProperty || alertFlags.isHostTypeBusiness"
            data-testid="flag-pr-requirement"
          />
        </template>
        <div class="flex">
          <div>
            <div class="flex gap-x-8">
              <span v-if="prExemptReason">
                <strong>{{ t('strr.label.exemptionReason') }}</strong> {{ getPrExemptReason(prExemptReason) }}
              </span>
              <span v-if="getStrataHotelCategory()">
                <strong>{{ t('label.strataHotelCategory') }}:</strong> {{ getStrataHotelCategory() }}
              </span>
            </div>
            <div
              v-if="reg.documents && !isEmpty(reg.documents)"
              class="mt-2"
              data-testid="pr-req-documents"
            >
              <UButton
                v-for="document in reg.documents.filter(
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
          </div>
          <div
            v-if="alertFlags.isNotSameProperty"
            class="ml-3 w-1/3 font-bold text-red-600"
          >
            {{ t('strr.alertFlags.notSameProperty') }}
          </div>
          <div
            v-if="alertFlags.isHostTypeBusiness"
            class="ml-3 w-1/3 font-bold text-red-600"
          >
            {{ t('strr.alertFlags.hostIsBusiness') }}
          </div>
        </div>
      </ApplicationDetailsSection>
    </div>
  </ConnectPageSection>
</template>
