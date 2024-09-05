<template>
  <div data-test-id="application-details">
    <BcrosBanner
      :hide-buttons="!isExaminer"
      :application-id="applicationId"
      class="mobile:h-auto"
    >
      <div class="flex m:mb-2 m:justify-between">
        <div class="mobile:grid mobile:grid-cols-10 flex desktop:items-center">
          <BcrosTypographyH1
            :text="
              `${applicationDetails?.unitAddress.nickname ?? ''} ${tApplicationDetails('applicationTitle')}
              #${application?.header.id ?? '-'}`
            "
            class-name="mobile:text-6 mobile:col-span-7"
            no-spacing
          />
          <BcrosChip v-if="flavour" :flavour="flavour" class="ml-[16px] mobile:mt-4 mobile:col-span-3">
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
              <p>{{ tApplicationDetails(application?.header.status ?? '-' ) }}</p>
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
            <BcrosFormSectionReviewItem :title="tApplicationDetails('nickname')">
              <p>{{ applicationDetails?.unitAddress.nickname ?? '-' }}</p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem :title="tApplicationDetails('businessLicense')">
              <p>{{ applicationDetails?.unitDetails.businessLicense ?? '-' }}</p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem :title="tApplicationDetails('ownership')">
              <p>{{ applicationDetails?.unitDetails.ownershipType ?? '-' }}</p>
            </BcrosFormSectionReviewItem>
          </div>
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem :title="tApplicationDetails('address')">
              <p>{{ applicationDetails?.unitAddress.address }}</p>
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
            <BcrosFormSectionReviewItem :title="tApplicationDetails('propertyType')">
              <p>
                {{ applicationDetails?.unitDetails.propertyType
                  ? tPropertyForm(
                    propertyTypeMap[applicationDetails?.unitDetails.propertyType as keyof PropertyTypeMapI]
                  )
                  : '-'
                }}
              </p>
            </BcrosFormSectionReviewItem>
            <div class="flex-1" />
          </div>
        </div>
        <div class="mt-10 relative overflow-x-scroll">
          <p class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('primaryContact') }}
          </p>
          <div class="d:hidden">
            <div class="bg-white py-[22px] px-[30px] mobile:px-5">
              <BcrosFormSectionReviewItem :title="tApplicationDetails('name')">
                <p>{{ (applicationDetails ? getContactRows(applicationDetails?.primaryContact): [])[0].name }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('address')">
                <p>{{ (applicationDetails ? getContactRows(applicationDetails?.primaryContact): [])[0].address }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('email')">
                <p>
                  {{
                    (applicationDetails ? getContactRows(applicationDetails?.primaryContact): [])[0]['Email Address']
                  }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('phone')">
                <p>
                  {{
                    (applicationDetails ? getContactRows(applicationDetails?.primaryContact): [])[0]['Phone Number']
                  }}
                </p>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
          <div class="bg-white py-[22px] px-[30px] mobile:px-5 m:hidden overflow-x-scroll w-[150%]">
            <UTable :rows="applicationDetails ? getContactRows(applicationDetails?.primaryContact): []" />
          </div>
        </div>
        <div v-if="applicationDetails && applicationDetails?.secondaryContact" class="mt-10 relative overflow-x-scroll">
          <p class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('secondaryContact') }}
          </p>
          <div class="d:hidden">
            <div class="bg-white py-[22px] px-[30px] mobile:px-5">
              <BcrosFormSectionReviewItem :title="tApplicationDetails('name')">
                <p>{{ (applicationDetails ? getContactRows(applicationDetails?.secondaryContact): [])[0].name }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('address')">
                <p>{{ (applicationDetails ? getContactRows(applicationDetails?.secondaryContact): [])[0].address }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('email')">
                <p>
                  {{
                    (applicationDetails ? getContactRows(applicationDetails?.secondaryContact): [])[0]['Email Address']
                  }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('phone')">
                <p>
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
        <div v-if="documents.length" class="mt-10">
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
          <div class="mt-10">
            <p class="font-bold mb-6 mobile:mx-2 text-xl">
              {{ tApplicationDetails('ltsaInfo') }}
            </p>
            <a
              class="mobile:mx-2"
              :href="`/application-details/${applicationId}/ltsa`"
              target="_blank"
              rel="noopener"
            >
              {{ tApplicationDetails('ltsaDetails') }}
            </a>
          </div>
          <div class="mt-10">
            <p class="font-bold mb-6 mobile:mx-2">
              {{ tApplicationDetails('autoApprovalLogic') }}
            </p>
            <a
              class="mobile:mx-2"
              :href="`/application-details/${applicationId}/auto-approval`"
              target="_blank"
              rel="noopener"
            >
              {{ tApplicationDetails('autoApprovalDetails') }}
            </a>
          </div>
        </template>

        <FilingHistory
          :header="tApplicationDetails('filing')"
          :history="applicationHistory"
          class="mt-10"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FilingHistory from '~/components/FilingHistory.vue'
import { propertyTypeMap } from '~/utils/propertyTypeMap'

const route = useRoute()
const { t } = useTranslation()
const tApplicationDetails = (translationKey: string) => t(`applicationDetails.${translationKey}`)
const tPropertyForm = (translationKey: string) => t(`createAccount.propertyForm.${translationKey}`)
const { isExaminer } = useBcrosKeycloak()
const { getChipFlavour } = useChipFlavour()

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const applicationId = route.params.id.toString()

const {
  getApplication,
  getApplicationHistory,
  getDocument
} = useApplications()

const [application, applicationHistory]: [ApplicationI, FilingHistoryEventI[]] = await Promise.all([
  getApplication(applicationId),
  getApplicationHistory(applicationId)
])

const applicationDetails: ApplicationDetailsI = application.registration

// Get Supporting Documents from the Application response
const documents: DocumentUploadI[] = applicationDetails.documents || []

const flavour = application ? getChipFlavour(application.header.status) : null

const downloadDocument = async (supportingDocument: DocumentUploadI) => {
  const file = await getDocument(applicationId, supportingDocument.fileKey)
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
    ${contactBlock.mailingAddress.addressLineTwo} 
    ${contactBlock.mailingAddress.city} 
    ${contactBlock.mailingAddress.province} 
    ${contactBlock.mailingAddress.postalCode}
  `,
  'Email Address': contactBlock.details.emailAddress,
  'Phone Number':
    `
      ${contactBlock.details.phoneNumber}
      ${contactBlock.details.extension
        ? contactBlock.details.extension
        : ''
      }
    `,
  SIN: contactBlock.socialInsuranceNumber,
  'BN (GST)': contactBlock.businessNumber
}]
</script>
