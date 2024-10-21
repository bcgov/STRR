<template>
  <div data-test-id="application-details">
    <BcrosBanner
      :application="application"
      class="mobile:h-auto"
    >
      <div class="flex m:mb-2 m:justify-between" data-test-id="application-header">
        <div class="mobile:grid mobile:grid-cols-10 flex desktop:items-center">
          <BcrosTypographyH1
            :text="
              `${applicationDetails?.unitAddress.nickname ?? ''} ${tApplicationDetails('applicationTitle')}
              #${application?.header.applicationNumber ?? '-'}`
            "
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
    <div class="mt-[104px] mobile:pt-[70px]">
      <div data-test-id="application-status">
        <p class="font-bold mb-6 mobile:mx-2 text-xl">
          {{ tApplicationDetails('applicationStatus') }}
        </p>
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
        <p class="font-bold mb-6 mobile:mx-2 text-xl">
          {{ tApplicationDetails('unitInfo') }}
        </p>
        <div class="bg-white py-[22px] px-[30px] mobile:px-5" data-test-id="rental-unit-info">
          <div class="flex flex-row justify-between w-full mobile:flex-col desktop:mb-6">
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('nickname')"
              :content="applicationDetails?.unitAddress.nickname || '-'"
              data-test-id="unit-nickname"
            />
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('ownership')"
              :content="getOwnershipTypeDisplay(applicationDetails?.unitDetails.ownershipType, tApplicationDetails)"
              data-test-id="ownership-type"
            />
            <BcrosFormSectionReviewItem :title="tApplicationDetails('propertyType')">
              <p data-test-id="property-type">
                {{ applicationDetails?.unitDetails.propertyType
                  ? tPropertyForm(
                    propertyTypeMap[applicationDetails?.unitDetails.propertyType as keyof PropertyTypeMapI]
                  )
                  : '-'
                }}
              </p>
            </BcrosFormSectionReviewItem>
          </div>
          <div class="flex flex-row justify-between w-full mobile:flex-col">
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
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('businessLicense')"
              :content="applicationDetails?.unitDetails.businessLicense || '-'"
              data-test-id="business-license"
            />
            <div class="flex-1 d:max-w-[33.33%]">
              <template v-if="applicationDetails?.listingDetails && applicationDetails.listingDetails.length > 0">
                <BcrosFormSectionReviewItem
                  :title="tApplicationDetails('listingLink')"
                >
                  <a
                    :href="applicationDetails?.listingDetails[0].url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-ellipsis overflow-hidden break-words"
                    data-test-id="platform-url-1"
                  >
                    {{ applicationDetails?.listingDetails[0].url }}
                  </a>
                </BcrosFormSectionReviewItem>
              </template>
            </div>
          </div>
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <div class="flex-1" />
            <BcrosFormSectionReviewItem
              v-if="applicationDetails?.unitDetails.businessLicenseExpiryDate"
              :title="tApplicationDetails('businessLicenseExpiryDate')"
              :content="convertDateToLongFormat(applicationDetails?.unitDetails.businessLicenseExpiryDate)"
              data-test-id="business-exp-date"
            />
            <div v-else class="flex-1" />
            <div class="flex-1 d:max-w-[33.33%]">
              <template v-if="applicationDetails?.listingDetails && applicationDetails.listingDetails.length > 1">
                <div class="flex flex-col">
                  <div
                    v-for="(listingDetail, index) in applicationDetails.listingDetails.slice(1)"
                    :key="index"
                    :class="{ 'desktop:mt-6 mobile:mt-2': index > 1 }"
                  >
                    <BcrosFormSectionReviewItem
                      :title="tApplicationDetails('listingLink') + (` ${index + 2}`)"
                    >
                      <a
                        :href="listingDetail.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-ellipsis overflow-hidden break-words"
                        :data-test-id="`platform-url-${index + 2}`"
                      >
                        {{ listingDetail.url }}
                      </a>
                    </BcrosFormSectionReviewItem>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="mt-10 relative overflow-x-scroll" data-test-id="primary-contact">
          <p class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('primaryContact') }}
          </p>
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
          <div class="bg-white py-[22px] px-[30px] mobile:px-5 m:hidden overflow-x-scroll w-[150%]">
            <UTable :rows="applicationDetails ? getContactRows(applicationDetails?.primaryContact): []" />
          </div>
        </div>
        <div
          v-if="applicationDetails && applicationDetails?.secondaryContact"
          class="mt-10 relative overflow-x-scroll"
          data-test-id="secondary-contact"
        >
          <p class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('secondaryContact') }}
          </p>
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
        <div class="mt-10 relative overflow-x-scroll" data-test-id="principal-residence">
          <p class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('principalResidence') }}
          </p>
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
        <div v-if="documents.length" class="mt-10" data-test-id="documents-section">
          <p class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('documents') }}
          </p>
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
            <p class="font-bold mb-6 mobile:mx-2 text-xl">
              {{ tApplicationDetails('ltsaInfo') }}
            </p>
            <a
              class="mobile:mx-2"
              :href="`/application-details/${applicationNumber}/ltsa`"
              target="_blank"
              rel="noopener"
              data-test-id="ltsa-details-link"
            >
              {{ tApplicationDetails('ltsaDetails') }}
            </a>
          </div>
          <div class="mt-10" data-test-id="auto-approval-section">
            <p class="font-bold mb-6 mobile:mx-2">
              {{ tApplicationDetails('autoApprovalLogic') }}
            </p>
            <a
              class="mobile:mx-2"
              :href="`/application-details/${applicationNumber}/auto-approval`"
              target="_blank"
              rel="noopener"
              data-test-id="auto-approval-details-link"
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
import FilingHistory from '~/components/FilingHistory.vue'
import { useApplications } from '~/composables/useApplications'
import { useBreadcrumb } from '~/composables/useBreadcrumb'
import { useChipFlavour } from '~/composables/useChipFlavour'
import { propertyTypeMap } from '~/utils/propertyTypeMap'
import { getOwnershipTypeDisplay } from '@/utils/common'
import { ApplicationStatusE, HostApplicationStatusE, ExaminerApplicationStatusE } from '#imports'

const route = useRoute()
const { t } = useTranslation()
const tApplicationDetails = (translationKey: string) => t(`applicationDetails.${translationKey}`)
const tStatuses = (translationKey: string) => t(`statuses.${translationKey}`)
const tPropertyForm = (translationKey: string) => t(`createAccount.propertyForm.${translationKey}`)
const { isExaminer } = useBcrosKeycloak()
const { getChipFlavour } = useChipFlavour()

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const applicationNumber = route.params.id.toString()

const {
  getApplication,
  getApplicationHistory,
  getDocument
} = useApplications()

const {
  setupBreadcrumbData
} = useBreadcrumb()

const [application, applicationHistory]: [ApplicationI, FilingHistoryEventI[]] = await Promise.all([
  getApplication(applicationNumber),
  getApplicationHistory(applicationNumber)
])

setupBreadcrumbData(application)

const applicationDetails: ApplicationDetailsI = application.registration

// Get Supporting Documents from the Application response
const documents: DocumentUploadI[] = applicationDetails.documents || []
const examinerOrHostStatus = computed(() => {
  if (isExaminer) {
    return application?.header.examinerStatus
  } else {
    return application?.header.hostStatus
  }
})
const applicationStatus = application?.header.status
const flavour = application ? getChipFlavour(examinerOrHostStatus.value || applicationStatus) : null

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
  'Phone Number':
    `
      ${contactBlock.details.phoneNumber}
      ${contactBlock.details.extension || ''}
    `,
  SIN: contactBlock.socialInsuranceNumber,
  'BN (GST)': contactBlock.businessNumber
}]
</script>
