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
        <div class="bg-white py-[22px] px-[30px] mobile:px-5">
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem :title="tApplicationDetails('status')">
              <p data-test-id="application-status-text">
                {{ displayApplicationStatus() }}
              </p>
            </BcrosFormSectionReviewItem>
          </div>
        </div>
      </div>
      <div class="mt-10">
        <!-- Property Details -->
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
            <BcrosFormSectionReviewItem :title="tApplicationDetails('address')">
              <p data-test-id="unit-address">
                {{ applicationDetails?.unitAddress.address }}
              </p>
              <p v-if="applicationDetails?.unitAddress.addressLineTwo">
                {{ applicationDetails?.unitAddress.addressLineTwo }}
              </p>
              <p>
                {{ applicationDetails?.unitAddress.city || '-' }}
                {{ applicationDetails?.unitAddress.province || '-' }}
                {{ applicationDetails?.unitAddress.postalCode || '-' }}
              </p>
              <p>
                {{ applicationDetails?.unitAddress.country
                  ? regionNamesInEnglish.of(applicationDetails?.unitAddress.country)
                  : '-' }}
              </p>
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
          <div class="grid grid-rows-subgrid d:row-span-3">
            <BcrosFormSectionReviewItem :title="tReview('listing')">
              <template v-if="applicationDetails.listingDetails[0]?.url.length > 0">
                <a
                  v-for="listing in applicationDetails.listingDetails"
                  :key="listing.url"
                  :href="listing.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mb-1 break-all w-5/6"
                >
                  {{ listing.url }}
                </a>
              </template>
              <p v-else>
                -
              </p>
            </BcrosFormSectionReviewItem>
          </div>
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
          <BcrosFormSectionReviewItem
            :title="tReview('ownershipType')"
            :content="getOwnershipTypeDisplay(applicationDetails?.unitDetails.ownershipType, tApplicationDetails)"
            data-test-id="ownership-type"
          />
        </div>
        <!-- Principal Residence -->
        <div class="mt-10" data-test-id="principal-residence">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('principalResidence') }}
          </h2>
          <div class="bg-white py-[22px] px-[30px] mobile:px-5">
            <BcrosFormSectionReviewItem :title="tApplicationDetails('proof')">
              <p data-test-id="principal-residence-proof">
                {{
                  applicationDetails.principalResidence.isPrincipalResidence
                    ? tApplicationDetails('principalResidenceApplies')
                    : tApplicationDetails('principalResidenceNotApplies')
                }}
              </p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              v-if="applicationDetails.principalResidence.nonPrincipalOption"
              :title="tApplicationDetails('principalResidenceReason')"
              class="mt-4"
            >
              <p>{{ applicationDetails.principalResidence.nonPrincipalOption }}</p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              v-if="applicationDetails.principalResidence.specifiedServiceProvider &&
                applicationDetails.principalResidence.specifiedServiceProvider !== 'n/a'"
              :title="tApplicationDetails('principalResidenceServiceProvider')"
              class="mt-4"
            >
              <p>{{ applicationDetails.principalResidence.specifiedServiceProvider }}</p>
            </BcrosFormSectionReviewItem>
          </div>
        </div>
        <!-- Property Manager -->
        <BcrosFormSectionPropertyManagerSummaryView
          v-if="applicationDetails.propertyManager"
          :property-manager="applicationDetails.propertyManager"
          header-tag="h2"
          header-class="font-bold mb-6 mobile:mx-2 text-xl"
          data-test-id="property-manager-details"
          class="mt-10"
        />
        <!-- Primary Contact -->
        <div class="mt-10" data-test-id="primary-contact">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('primaryContact') }}
          </h2>
          <div class="d:hidden">
            <div class="bg-white py-[22px] px-[30px] mobile:px-5">
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('name')"
                :content="(applicationDetails ? getContactRows(applicationDetails?.primaryContact) : [])[0].name"
                data-test-id="primary-contact-name"
              />
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('address')"
                :content="(applicationDetails ? getContactRows(applicationDetails?.primaryContact) : [])[0].address"
                data-test-id="primary-contact-address"
              />
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('email')"
                :content="(applicationDetails
                  ? getContactRows(applicationDetails?.primaryContact) : [])[0]['Email Address']"
                data-test-id="primary-contact-email"
              />
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('phone')"
                :content="(applicationDetails
                  ? getContactRows(applicationDetails?.primaryContact) : [])[0]['Phone Number']"
                data-test-id="primary-contact-phone"
              />
            </div>
          </div>
          <div class="overflow-x-scroll">
            <UTable
              :rows="applicationDetails ? getContactRows(applicationDetails?.primaryContact): []"
              class="bg-white py-[22px] px-[30px] mobile:px-5 m:hidden w-[150%]"
            />
          </div>
        </div>
        <!-- Secondary Contact -->
        <div
          v-if="applicationDetails && applicationDetails?.secondaryContact"
          class="mt-10"
          data-test-id="secondary-contact"
        >
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('secondaryContact') }}
          </h2>
          <div class="d:hidden">
            <div class="bg-white py-[22px] px-[30px] mobile:px-5">
              <BcrosFormSectionReviewItem :title="tApplicationDetails('name')">
                <p data-test-id="secondary-contact-name">
                  {{ (applicationDetails ? getContactRows(applicationDetails?.secondaryContact): [])[0].name }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('address')">
                <p data-test-id="secondary-contact-address">
                  {{ (applicationDetails ? getContactRows(applicationDetails?.secondaryContact): [])[0].address }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('email')">
                <p data-test-id="secondary-contact-email">
                  {{
                    (applicationDetails ? getContactRows(applicationDetails?.secondaryContact): [])[0]['Email Address']
                  }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('phone')">
                <p data-test-id="secondary-contact-phone">
                  {{
                    (applicationDetails ? getContactRows(applicationDetails?.secondaryContact): [])[0]['Phone Number']
                  }}
                </p>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
          <div class="bg-white py-[22px] px-[30px] mobile:px-5 m:hidden overflow-x-scroll w-[150%]">
            <UTable :rows="getContactRows(applicationDetails?.secondaryContact)" />
          </div>
        </div>
        <div v-if="documents.length" class="mt-10" data-test-id="documents-section">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('documents') }}
          </h2>
          <div class="bg-white py-[22px] px-[30px] mobile:px-5">
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
        <template v-if="isExaminer">
          <div class="mt-10" data-test-id="ltsa-info-section">
            <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
              {{ tApplicationDetails('ltsaInfo') }}
            </h2>
            <a
              class="mobile:mx-2"
              data-test-id="ltsa-details-link"
              @click="navigateTo(`/application-details/${applicationNumber}/ltsa`)"
            >
              {{ tApplicationDetails('ltsaDetails') }}
            </a>
          </div>
          <div class="mt-10" data-test-id="auto-approval-section">
            <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
              {{ tApplicationDetails('autoApprovalLogic') }}
            </h2>
            <a
              class="mobile:mx-2"
              data-test-id="auto-approval-details-link"
              @click="navigateTo(`/application-details/${applicationNumber}/auto-approval`)"
            >
              {{ tApplicationDetails('autoApprovalDetails') }}
            </a>
          </div>
        </template>

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

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

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

const applicationDetails: HostApplicationDetailsI = application.registration

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

const getContactRows = (contactBlock: ContactI) => [{
  name: `
    ${contactBlock.name.firstName}
    ${contactBlock.name.middleName
      ? ` ${contactBlock.name.middleName} `
      : ' '
    }
     ${contactBlock.name.lastName}
  `,
  address: `
    ${contactBlock.mailingAddress.address}
    ${contactBlock.mailingAddress.addressLineTwo || ''}
    ${contactBlock.mailingAddress.city}
    ${contactBlock.mailingAddress.province}
    ${contactBlock.mailingAddress.postalCode}
  `,
  'Email Address': contactBlock.details.emailAddress,
  'Phone Number': displayPhoneAndExt(contactBlock.details.phoneNumber, contactBlock.details.extension) || '',
  SIN: contactBlock.socialInsuranceNumber,
  'BN (GST)': contactBlock.businessNumber
}]

</script>
