<template>
  <div
    data-test-id="application-details"
    class="application-details-page"
  >
    <BcrosBanner
      :application="application"
      class="mobile:h-auto"
    >
      <div class="flex m:mb-2 m:justify-between" data-test-id="application-header">
        <div class="mobile:grid mobile:grid-cols-10 flex desktop:items-center">
          <BcrosTypographyH1
            :text="
              `${applicationDetails?.unitAddress.nickname ?? ''} ${tApplicationDetails('applicationTitle')}
              #${application?.header.applicationNumber ?? '-'}`"
            class="mobile:text-6 mobile:col-span-7"
            no-spacing
            data-test-id="application-title"
          />
          <BcrosChip
            v-if="flavour"
            :flavour="flavour"
            class="ml-[16px] mobile:mt-4 mobile:col-span-3"
            data-test-id="application-status-chip"
          >
            {{ flavour.text }}
          </BcrosChip>
        </div>
      </div>
    </BcrosBanner>
    <div
      v-if="isPaymentDue"
      class="bg-red-50 border border-red-200 mt-[104px] mobile:pt-[70px]"
      data-test-id="payment-due-banner"
    >
      <div class="flex items-center py-5">
        <UIcon name="i-mdi-alert" class="text-red-500 ml-5" />
        <span class="font-bold ml-2">{{ tApplicationDetails('paymentDueBannerTitle') }}:</span>
        <span class="ml-1">{{ tApplicationDetails('paymentDueBannerMessage') }}</span>
      </div>
    </div>
    <div
      :class="[
        isPaymentDue ? 'mt-10 mobile:pt-7' : 'mt-[104px] mobile:pt-[70px]'
      ]"
    >
      <div data-test-id="application-status">
        <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
          {{ tApplicationDetails('applicationStatus') }}
        </h2>
        <div class="bg-white p-8 mobile:px-5">
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem :title="tApplicationDetails('status')">
              <p data-test-id="application-status-text">
                {{ displayApplicationStatus() }}
              </p>
            </BcrosFormSectionReviewItem>
          </div>
        </div>
      </div>
      <div class="">
        <!-- Property Manager -->
        <BcrosFormSectionPropertyManagerSummaryView
          v-if="applicationDetails.propertyManager"
          :property-manager="applicationDetails.propertyManager"
          header-tag="h2"
          header-class="font-bold mb-6 mobile:mx-2 text-xl"
          data-test-id="property-manager-details"
          class="mt-10"
        />

        <!-- Host Information -->
        <BcrosFormSectionContactInformationSummaryView
          header="Host Information"
          :contact="applicationDetails.primaryContact"
          class="mt-10"
          data-test-id="primary-contact"
        />

        <!-- Co-Host Information -->
        <BcrosFormSectionContactInformationSummaryView
          v-if="applicationDetails?.secondaryContact"
          header="Co-Host Information"
          :contact="applicationDetails.secondaryContact"
          class="mt-10"
          data-test-id="secondary-contact"
        />

        <!-- Property Details -->
        <div class="mt-10">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tReview('propertyDetails') }}
          </h2>
          <div class="bg-white p-8 m:px-2 grid d:grid-cols-3 d:grid-rows-5">
            <BcrosFormSectionReviewItem
              :title="tReview('nickname')"
              :content="applicationDetails?.unitAddress.nickname || '-'"
              data-test-id="unit-nickname"
              class="break-all"
            />
            <BcrosFormSectionReviewItem
              :title="tReview('rentalUnitSpaceType')"
              :content="tApplicationDetails(applicationDetails?.unitDetails.rentalUnitSpaceType)|| '-'"
              data-test-id="rentalUnitSpaceType-type"
            />
            <BcrosFormSectionReviewItem
              :title="tReview('parcelIdentifier')"
              :content="applicationDetails?.unitDetails.parcelIdentifier || '-'"
              data-test-id="parcel-identifier"
              class="break-all"
            />
            <div class="grid grid-rows-subgrid d:row-span-5">
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('address')"
                data-test-id="unit-address"
              >
                <!-- eslint-disable-next-line vue/no-v-html -->
                <p v-html="displayFullAddressWithStreetAttributes(applicationDetails?.unitAddress)" />
              </BcrosFormSectionReviewItem>
            </div>
            <BcrosFormSectionReviewItem
              :title="tReview('isUnitOnPrincipalResidenceProperty')"
              :content="tApplicationDetails(
                applicationDetails?.unitDetails.isUnitOnPrincipalResidenceProperty
                  ? 'true'
                  : 'false'
              ) || '-'"
              data-test-id="isUnitOnPrincipalResidenceProperty-type"
            />
            <BcrosFormSectionReviewItem
              :title="tReview('businessLicense')"
              :content="applicationDetails?.unitDetails.businessLicense || '-'"
              data-test-id="business-license"
              class="break-all"
            />
            <BcrosFormSectionReviewItem
              :title="tReview('hostResidence')"
              :content="applicationDetails?.unitDetails.hostResidence
                ? tApplicationDetails(applicationDetails?.unitDetails.hostResidence) : '-'"
              data-test-id="hostResidence-type"
            />
            <BcrosFormSectionReviewItem
              v-if="applicationDetails?.unitDetails.businessLicenseExpiryDate"
              :title="tReview('businessLicenseExpiryDate')"
              :content="convertDateToLongFormat(applicationDetails?.unitDetails.businessLicenseExpiryDate)"
              data-test-id="business-exp-date"
            />
            <BcrosFormSectionReviewItem
              :title="tReview('numberOfRoomsForRent')"
              :content="String(applicationDetails?.unitDetails.numberOfRoomsForRent) || '-'"
            />
            <BcrosFormSectionReviewItem
              v-if="applicationDetails.unitDetails.blExemptReason"
              title="Business License Exemption"
              :content="applicationDetails.unitDetails.blExemptReason"
            />
            <BcrosFormSectionReviewItem :title="tReview('propertyType')">
              <p data-test-id="property-type">
                {{ applicationDetails?.unitDetails.propertyType
                  ? tPropertyForm(
                    propertyTypeMap[applicationDetails?.unitDetails.propertyType as keyof PropertyTypeMapI]
                  )
                  : '-'
                }}
              </p>
            </BcrosFormSectionReviewItem>
            <div class="grid grid-rows-subgrid d:row-span-2">
              <BcrosFormSectionReviewItem :title="tReview('listing')">
                <template v-if="applicationDetails.listingDetails[0]?.url.length > 0">
                  <a
                    v-for="listing in applicationDetails.listingDetails"
                    :key="listing.url"
                    :href="listing.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mb-1 truncate max-w-[250px]"
                  >
                    {{ listing.url }}
                  </a>
                </template>
                <p v-else>
                  -
                </p>
              </BcrosFormSectionReviewItem>
            </div>
            <BcrosFormSectionReviewItem
              :title="tReview('ownershipType')"
              :content="getOwnershipTypeDisplay(applicationDetails?.unitDetails.ownershipType, tApplicationDetails)"
              data-test-id="ownership-type"
            />
          </div>
        </div>

        <!-- Principal Residence -->
        <div
          v-if="applicationDetails.strRequirements"
          class="mt-10"
          data-test-id="principal-residence"
        >
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('principalResidence') }}
          </h2>
          <div class="bg-white p-8 mobile:px-5 grid d:grid-cols-3 d:grid-rows-2 gap-y-8">
            <BcrosFormSectionReviewItem :title="tApplicationDetails('proof')">
              <p data-test-id="principal-residence-proof">
                {{ tReview(`${applicationDetails.strRequirements.isPrincipalResidenceRequired}`) }}
              </p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              title="Business Licence Required"
            >
              <p>{{ tReview(`${applicationDetails.strRequirements.isBusinessLicenceRequired}`) }}</p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              title="STR Prohibited"
            >
              <p>{{ tReview(`${applicationDetails.strRequirements.isStrProhibited}`) }}</p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              title="STRAA Exempt"
            >
              <p>{{ tReview(`${applicationDetails.strRequirements.isStraaExempt}`) }}</p>
            </BcrosFormSectionReviewItem>

            <BcrosFormSectionReviewItem
              title="Jurisdiction"
            >
              <p>{{ applicationDetails.strRequirements.organizationNm }}</p>
            </BcrosFormSectionReviewItem>

            <BcrosFormSectionReviewItem
              v-if="applicationDetails.unitDetails.prExemptReason"
              title="Exemption Reason"
            >
              <p>{{ tReview(`prExemptReason.${applicationDetails.unitDetails.prExemptReason}`) }}</p>
            </BcrosFormSectionReviewItem>
          </div>
        </div>

        <!-- Documents -->
        <div v-if="documents.length" class="mt-10" data-test-id="documents-section">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('documents') }}
          </h2>
          <div class="bg-white p-8 mobile:px-5">
            <div class="flex flex-row justify-between w-full mobile:flex-col">
              <BcrosFormSectionReviewItem :title="tApplicationDetails('proof')">
                <div v-for="document in documents" :key="document.fileKey">
                  <UButton
                    class="px-0 underline"
                    variant="link"
                    :data-test-id="`document-${document.fileKey}`"
                    @click="downloadDocument(document)"
                  >
                    <img
                      class="h-6"
                      src="/icons/create-account/attach_dark.svg"
                      alt="Attach icon"
                    >
                    <span class="text-base text-left">{{ document.fileName }}</span>
                  </UButton>
                </div>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
        </div>

        <!-- Filing History -->
        <FilingHistory
          :header="tApplicationDetails('filing')"
          :history="applicationHistory"
          class="mt-10"
          data-test-id="filing-history"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApplicationStatusE, ExaminerApplicationStatusE, HostApplicationStatusE } from '#imports'
import {
  getOwnershipTypeDisplay
} from '@/utils/common'
import FilingHistory from '~/components/FilingHistory.vue'
import { useApplications } from '~/composables/useApplications'
import { useBreadcrumb } from '~/composables/useBreadcrumb'
import { useChipFlavour } from '~/composables/useChipFlavour'
import { propertyTypeMap } from '~/utils/propertyTypeMap'

const route = useRoute()
const { t } = useTranslation()
const tApplicationDetails = (translationKey: string) => t(`applicationDetails.${translationKey}`)
const tStatuses = (translationKey: string) => t(`statuses.${translationKey}`)
const tPropertyForm = (translationKey: string) => t(`createAccount.propertyForm.${translationKey}`)
const tReview = (translationKey: string) => t(`createAccount.review.${translationKey}`)
const { isExaminer } = storeToRefs(useBcrosKeycloak())
const { getChipFlavour } = useChipFlavour()

// Modified for unit tests, unable to mock route params in tests
const applicationNumber = route.params.id?.toString() || ''

const {
  getApplication,
  getApplicationHistory,
  getDocument
} = useApplications()

const { setupBreadcrumbData } = useBreadcrumb()

const [application, applicationHistory]: [ApplicationI, FilingHistoryEventI[]] = await Promise.all([
  getApplication(applicationNumber),
  getApplicationHistory(applicationNumber)
])

setupBreadcrumbData(application)

const applicationDetails = application.registration as HostApplicationDetailsI

// Get Supporting Documents from the Application response
const documents: DocumentUploadI[] = applicationDetails.documents || []
const examinerOrHostStatus = computed(() => {
  if (isExaminer.value) {
    return application?.header.examinerStatus
  } else {
    return application?.header.hostStatus
  }
})
const applicationStatus = application?.header.status
const flavour = application ? getChipFlavour(examinerOrHostStatus.value || applicationStatus) : null
const isPaymentDue = computed(() => applicationStatus === ApplicationStatusE.PAYMENT_DUE)

const getApplicationStatusTranslation = (status) => {
  const commonStatusMap = {
    [ApplicationStatusE.PROVISIONAL]: 'provisional',
    [ApplicationStatusE.ADDITIONAL_INFO_REQUESTED]: 'additionalInfoRequested',
    [HostApplicationStatusE.DRAFT]: 'draft',
    [ExaminerApplicationStatusE.DRAFT]: 'draft',
    [HostApplicationStatusE.DECLINED]: 'declined',
    [ExaminerApplicationStatusE.DECLINED]: 'declined',
    [HostApplicationStatusE.PAYMENT_DUE]: 'paymentDue',
    [ExaminerApplicationStatusE.PAYMENT_DUE]: 'paymentDue'
  }
  const roleSpecificStatusMap = {
    [HostApplicationStatusE.PAID]: 'hostStatuses.paid',
    [ExaminerApplicationStatusE.PAID]: 'examinerStatuses.paid',
    [HostApplicationStatusE.AUTO_APPROVED]: 'hostStatuses.autoApproved',
    [ExaminerApplicationStatusE.AUTO_APPROVED]: 'examinerStatuses.autoApproved',
    [HostApplicationStatusE.PROVISIONALLY_APPROVED]: 'hostStatuses.provisionalApproved',
    [ExaminerApplicationStatusE.PROVISIONALLY_APPROVED]: 'examinerStatuses.provisionalApproved',
    [HostApplicationStatusE.PROVISIONAL_REVIEW]: 'hostStatuses.provisionalReview',
    [ExaminerApplicationStatusE.PROVISIONAL_REVIEW]: 'examinerStatuses.provisionalReview',
    [HostApplicationStatusE.FULL_REVIEW_APPROVED]: 'hostStatuses.fullReviewApproved',
    [ExaminerApplicationStatusE.FULL_REVIEW_APPROVED]: 'examinerStatuses.fullReviewApproved',
    [HostApplicationStatusE.FULL_REVIEW]: 'hostStatuses.fullReview',
    [ExaminerApplicationStatusE.FULL_REVIEW]: 'examinerStatuses.fullReview'
  }
  return commonStatusMap[status] || roleSpecificStatusMap[status] || '-'
}

const displayApplicationStatus = () => {
  if (!applicationStatus) {
    return '-'
  }
  const statusTranslation = getApplicationStatusTranslation(examinerOrHostStatus.value || applicationStatus)
  return tStatuses(statusTranslation)
}

const downloadDocument = async (supportingDocument: DocumentUploadI) => {
  const file = await getDocument(applicationNumber, supportingDocument.fileKey)
  const link = document.createElement('a')

  link.href = URL.createObjectURL(file)
  link.download = supportingDocument.fileName
  link.click()

  URL.revokeObjectURL(link.href)
}

</script>
