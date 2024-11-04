<template>
  <div data-test-id="reg-details">
    <BcrosBanner>
      <div data-test-id="reg-details-header" class="flex items-center m:mb-2 m:justify-between">
        <BcrosTypographyH1
          :text="
            `${application?.unitAddress.nickname ?? ''} ${tApplicationDetails('registration')}
              #${application?.registration_number ?? '-'}`
          "
          class="mobile:text-6"
          no-spacing
        />
        <BcrosChip v-if="flavour" :flavour="flavour" class="ml-4">
          {{ flavour.text }}
        </BcrosChip>
      </div>
    </BcrosBanner>
    <div class="mt-[104px]">
      <div data-test-id="registration-status">
        <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
          {{ tApplicationDetails('registrationStatus') }}
        </h2>
        <div class="bg-white py-[22px] px-[30px] mobile:px-2">
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem :title="tApplicationDetails('status')">
              <p>{{ displayRegistrationStatus() }}</p>
            </BcrosFormSectionReviewItem>
          </div>
        </div>
      </div>
      <div class="mt-10">
        <!-- Rental Unit Info -->
        <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
          {{ tApplicationDetails('unitInfo') }}
        </h2>
        <div class="bg-white py-[22px] px-[30px] mobile:px-2">
          <div class="flex flex-row justify-between w-full mobile:flex-col desktop:mb-6">
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('nickname')"
              :content="application?.unitAddress.nickname || '-'"
              class="break-all"
            />
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('ownership')"
              :content="getOwnershipTypeDisplay(application?.unitDetails.ownershipType, tApplicationDetails)"
            />
            <BcrosFormSectionReviewItem :title="tApplicationDetails('propertyType')">
              <p>
                {{ application?.unitDetails.propertyType
                  ? tPropertyForm(propertyTypeMap[application?.unitDetails.propertyType as keyof PropertyTypeMapI])
                  : '-'
                }}
              </p>
            </BcrosFormSectionReviewItem>
          </div>
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('rentalUnitSpaceType')"
              :content="tApplicationDetails(application?.unitDetails.rentalUnitSpaceType) || '-'"
            />
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('isUnitOnPrincipalResidenceProperty')"
              :content="tApplicationDetails(application?.unitDetails.isUnitOnPrincipalResidenceProperty?
                'true':'false') || '-'"
            />
            <BcrosFormSectionReviewItem
              v-if="application?.unitDetails.isUnitOnPrincipalResidenceProperty"
              :title="tApplicationDetails('hostResidence')"
              :content="application?.unitDetails.hostResidence || '-'"
            />
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('numberOfRoomsForRent')"
              :content="application?.unitDetails.numberOfRoomsForRent.toString() || '-'"
            />
          </div>
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem :title="tApplicationDetails('address')">
              <p>{{ application?.unitAddress.address }}</p>
              <p v-if="application?.unitAddress.addressLineTwo">
                {{ application?.unitAddress.addressLineTwo }}
              </p>
              <p>
                {{ application?.unitAddress.city || '-' }}
                {{ application?.unitAddress.province || '-' }}
                {{ application?.unitAddress.postalCode || '-' }}
              </p>
              <p>
                {{ application?.unitAddress.country ? regionNamesInEnglish.of(application?.unitAddress.country) : '-' }}
              </p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('businessLicense')"
              :content="application?.unitDetails.businessLicense || '-'"
              class="break-all"
            />
            <BcrosFormSectionReviewItem
              v-if="application?.unitDetails.businessLicenseExpiryDate"
              :title="tApplicationDetails('businessLicenseExpiryDate')"
              :content="convertDateToLongFormat(application?.unitDetails.businessLicenseExpiryDate)"
              data-test-id="business-exp-date"
            />
            <div v-else class="flex-1" />
          </div>
        </div>
        <!-- Property Manager -->
        <BcrosFormSectionPropertyManagerSummaryView
          v-if="application.propertyManager"
          :property-manager="application.propertyManager"
          header-tag="h2"
          header-class="font-bold mb-6 mobile:mx-2 text-xl"
          data-test-id="property-manager-details"
          class="mt-10"
        />
        <!-- Primary Contact Info -->
        <div class="mt-10">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('primaryContact') }}
          </h2>
          <div class="d:hidden">
            <div class="bg-white py-[22px] px-[30px] mobile:px-2">
              <BcrosFormSectionReviewItem :title="tApplicationDetails('name')">
                <p>{{ (application ? getContactRows(application?.primaryContact): [])[0].name }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('address')">
                <p>{{ (application ? getContactRows(application?.primaryContact): [])[0].address }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('email')">
                <p>{{ (application ? getContactRows(application?.primaryContact): [])[0]['Email Address'] }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('phone')">
                <p>{{ (application ? getContactRows(application?.primaryContact): [])[0]['Phone Number'] }}</p>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
          <div class="overflow-x-scroll">
            <UTable
              :rows="application ? getContactRows(application?.primaryContact): []"
              class="bg-white py-[22px] px-[30px] mobile:px-5 m:hidden w-[150%]"
            />
          </div>
        </div>
        <!-- Secondary Contact Info -->
        <div v-if="application && application?.secondaryContact" class="mt-10">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('secondaryContact') }}
          </h2>
          <div class="d:hidden">
            <div class="bg-white py-[22px] px-[30px] mobile:px-2">
              <BcrosFormSectionReviewItem :title="tApplicationDetails('name')">
                <p>{{ (application ? getContactRows(application?.secondaryContact): [])[0].name }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('address')">
                <p>{{ (application ? getContactRows(application?.secondaryContact): [])[0].address }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('email')">
                <p>{{ (application ? getContactRows(application?.secondaryContact): [])[0]['Email Address'] }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem :title="tApplicationDetails('phone')">
                <p>{{ (application ? getContactRows(application?.secondaryContact): [])[0]['Phone Number'] }}</p>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
          <div class="bg-white py-[22px] px-[30px] mobile:px-2 m:hidden overflow-x-scroll w-[150%]">
            <UTable :rows="getContactRows(application?.secondaryContact)" />
          </div>
        </div>
        <!-- Documents -->
        <div v-if="documents.length" class="mt-10">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('documents') }}
          </h2>
          <div class="bg-white py-[22px] px-[30px] mobile:px-2">
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
            <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
              {{ tApplicationDetails('ltsaInfo') }}
            </h2>
            <a
              class="mobile:mx-2"
              :href="`/application-details/${registrationId}/ltsa`"
              target="_blank"
              rel="noopener"
            >
              {{ tApplicationDetails('ltsaDetails') }}
            </a>
          </div>
          <div class="mt-10">
            <h2 class="font-bold mb-6 mobile:mx-2">
              {{ tApplicationDetails('autoApprovalLogic') }}
            </h2>
            <a
              class="mobile:mx-2"
              :href="`/application-details/${registrationId}/auto-approval`"
              target="_blank"
              rel="noopener"
            >
              {{ tApplicationDetails('autoApprovalDetails') }}
            </a>
          </div>
        </template>
        <!-- Filing History -->
        <div class="mt-10">
          <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
            {{ tApplicationDetails('filing') }}
          </h2>

          <div class="bg-white py-[22px] px-[30px] mobile:px-2">
            <div class="flex flex-col justify-between w-full">
              <div
                v-for="(event, index) in history.reverse()"
                :key="event.createdDate"
                :class="`flex flex-row ${index === history.length - 1 ? '': 'mb-6'}`"
              >
                <div>
                  <p class="text-bcGovColor-midGray mr-4">
                    {{ formatLongDate(new Date(event.createdDate)) }}
                  </p>
                </div>
                <div>
                  <p class="text-bcGovColor-midGray">
                    {{ formatTimeString(new Date(`${event.createdDate}Z`)) }}
                  </p>
                  <p class="font-bold">
                    {{ event.message }}
                  </p>
                  <a
                    v-if="downloadEventTypes.includes(event.eventType)"
                    class="no-underline"
                    @click="() => getDownloadAction(event.eventType, registrationId)"
                  >
                    {{ getDownloadText(event.eventType) }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RegistrationStatusE } from '#imports'
import { formatLongDate, formatTimeString } from '~/utils/format-helper'
import { propertyTypeMap } from '~/utils/propertyTypeMap'

const route = useRoute()
const t = useNuxtApp().$i18n.t
const tRegistrationStatus = (translationKey: string) => t(`registrationStatus.${translationKey}`)
const tApplicationDetails = (translationKey: string) => t(`applicationDetails.${translationKey}`)
const tStatuses = (translationKey: string) => t(`statuses.${translationKey}`)
const tPropertyForm = (translationKey: string) => t(`createAccount.propertyForm.${translationKey}`)
const { isExaminer } = useBcrosKeycloak()
const { getChipFlavour } = useChipFlavour()

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const registrationId = route.params.id.toString()

const {
  setRegistrationNumber,
  setApplicationNickname
} = useStrrStore()

const downloadEventTypes = ['CERTIFICATE_ISSUED']

const {
  getRegistration,
  getRegistrationHistory,
  getDocument,
  getCertificate
} = useRegistrations()

const getDownloadText = (eventType: string) => {
  if (eventType === 'CERTIFICATE_ISSUED') {
    return tRegistrationStatus('downloadCertificate')
  }
}

const getDownloadAction = (eventType: string, id: string) => {
  if (eventType === 'CERTIFICATE_ISSUED') {
    downloadCertificate(id)
  }
}

const downloadCertificate = async (id: string) => {
  const file = await getCertificate(id)
  const link = document.createElement('a')
  const blob = new Blob([file], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  link.href = url
  link.target = '_blank'
  link.download = `${tRegistrationStatus('strrCertificate')}.pdf`
  document.body.appendChild(link)
  link.click()
  URL.revokeObjectURL(link.href)
}

const downloadDocument = async (supportingDocument: DocumentUploadI) => {
  const file = await getDocument(registrationId, supportingDocument.fileKey)
  const link = document.createElement('a')

  link.href = URL.createObjectURL(file)
  link.download = supportingDocument.fileName
  link.click()

  URL.revokeObjectURL(link.href)
}

const [application, history]: [RegistrationI, FilingHistoryEventI[]] = await Promise.all([
  getRegistration(registrationId),
  getRegistrationHistory(registrationId)
])

setApplicationNickname(application.unitAddress.nickname)
setRegistrationNumber(application.registration_number || '')

// Get Supporting Documents from the Application response
const documents: DocumentUploadI[] = application.documents || []

const flavour = application ? getChipFlavour(application.status) : null

const displayRegistrationStatus = () => {
  const commonStatusMap = {
    [RegistrationStatusE.ACTIVE]: 'active',
    [RegistrationStatusE.SUSPENDED]: 'suspended',
    [RegistrationStatusE.EXPIRED]: 'expired',
    [RegistrationStatusE.CANCELLED]: 'cancelled'
  }
  if (!application?.status) {
    return '-'
  }
  const statusTranslation = (application?.status && application.status in commonStatusMap)
    ? commonStatusMap[application.status as keyof typeof commonStatusMap]
    : '-'
  return tStatuses(statusTranslation)
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
  'Phone Number': displayPhoneAndExt(contactBlock.details.phoneNumber, contactBlock.details.extension) || '',
  SIN: contactBlock.socialInsuranceNumber,
  'BN (GST)': contactBlock.businessNumber
}]
</script>
