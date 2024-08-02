<template>
  <div>
    <BcrosBanner :hide-buttons="!isExaminer">
      <div class="flex items-center m:mb-[8px] m:justify-between">
        <BcrosTypographyH1
          :text="
            `${
              application?.unitAddress.nickname
                ? application?.unitAddress.nickname + ' '
                : ''}${tApplicationDetails('registration')} #${application?.registration_number ?? '-'}
                `
          "
          class-name="mobile:text-[24px]"
          no-spacing
        />
        <BcrosChip v-if="flavour" :flavour="flavour" class="ml-[16px]">
          {{ flavour.text }}
        </BcrosChip>
      </div>
    </BcrosBanner>
    <div class="mt-[104px]">
      <div>
        <p class="font-bold mb-[24px] mobile:mx-[8px]">
          {{ tApplicationDetails('registration-status') }}
        </p>
        <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('status')"
            >
              <p>{{ tApplicationDetails(application?.status ?? '-' ) }}</p>
            </BcrosFormSectionReviewItem>
          </div>
        </div>
      </div>
      <div class="mt-[40px]">
        <p class="font-bold mb-[24px] mobile:mx-[8px]">
          {{ tApplicationDetails('unit-info') }}
        </p>
        <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
          <div class="flex flex-row justify-between w-full mobile:flex-col desktop:mb-[24px]">
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('nickname')"
            >
              <p>{{ application?.unitAddress.nickname.length ? application?.unitAddress.nickname : '-' }}</p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('business-license')"
            >
              <p>{{ application?.unitDetails.businessLicense ?? '-' }}</p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('ownership')"
            >
              <p>{{ application?.unitDetails.ownershipType ?? '-' }}</p>
            </BcrosFormSectionReviewItem>
          </div>
          <div class="flex flex-row justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('address')"
            >
              <p>{{ application?.unitAddress.address }}</p>
              <p v-if="application?.unitAddress.addressLineTwo">
                {{ application?.unitAddress.addressLineTwo }}
              </p>
              <p>
                {{
                  `
                    ${application?.unitAddress.city ?? '-'}
                    ${application?.unitAddress.province ?? '-'}
                    ${application?.unitAddress.postalCode ?? '-'}
                  `
                }}
              </p>
              <p>
                {{
                  `
                  ${application?.unitAddress.country
                    ? regionNamesInEnglish.of(application?.unitAddress.country)
                  : '-'}
                `
                }}
              </p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              :title="tApplicationDetails('property-type')"
            >
              <p>
                {{
                  application?.unitDetails.propertyType
                    ? tPropertyForm(propertyTypeMap[application?.unitDetails.propertyType as keyof PropertyTypeMapI])
                    : '-'
                }}
              </p>
            </BcrosFormSectionReviewItem>
            <div class="flex-1" />
          </div>
        </div>
        <div class="mt-[40px] relative overflow-x-scroll">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tApplicationDetails('primary-contact') }}
          </p>
          <div class="d:hidden">
            <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('name')"
              >
                <p>{{ (application ? getContactRows(application?.primaryContact): [])[0].name }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('address')"
              >
                <p>{{ (application ? getContactRows(application?.primaryContact): [])[0].address }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('email')"
              >
                <p>{{ (application ? getContactRows(application?.primaryContact): [])[0]['Email Address'] }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('phone')"
              >
                <p>{{ (application ? getContactRows(application?.primaryContact): [])[0]['Phone Number'] }}</p>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
          <div class="bg-white py-[22px] px-[30px] mobile:px-[8px] m:hidden overflow-x-scroll w-[150%]">
            <UTable :rows="application ? getContactRows(application?.primaryContact): []" />
          </div>
        </div>
        <div
          v-if="application && application?.secondaryContact"
          class="mt-[40px] relative overflow-x-scroll"
        >
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tApplicationDetails('secondary-contact') }}
          </p>
          <div class="d:hidden">
            <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('name')"
              >
                <p>{{ (application ? getContactRows(application?.secondaryContact): [])[0].name }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('address')"
              >
                <p>{{ (application ? getContactRows(application?.secondaryContact): [])[0].address }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('email')"
              >
                <p>{{ (application ? getContactRows(application?.secondaryContact): [])[0]['Email Address'] }}</p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('phone')"
              >
                <p>{{ (application ? getContactRows(application?.secondaryContact): [])[0]['Phone Number'] }}</p>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
          <div class="bg-white py-[22px] px-[30px] mobile:px-[8px] m:hidden overflow-x-scroll w-[150%]">
            <UTable :rows="getContactRows(application?.secondaryContact)" />
          </div>
        </div>
        <div v-if="documents.length" class="mt-[40px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tApplicationDetails('documents') }}
          </p>
          <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
            <div class="flex flex-row justify-between w-full mobile:flex-col">
              <BcrosFormSectionReviewItem
                :title="tApplicationDetails('proof')"
              >
                <div v-for="(supportingDocument) in documents" :key="supportingDocument.file_name">
                  <a
                    class="flex flex-row items-center cursor-pointer no-underline text-black"
                    role="button"
                    @click.prevent="
                      downloadItem(
                        applicationId.toString(),
                        supportingDocument.document_id.toString(),
                        supportingDocument.file_name
                      )
                    "
                  >
                    <img
                      class="mr-[4px] h-[18px] w-[18px]"
                      src="/icons/create-account/attach_dark.svg"
                      alt="Attach icon"
                    >
                    <p>{{ supportingDocument.file_name }}</p>
                  </a>
                </div>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
        </div>
        <div v-if="isExaminer" class="mt-[40px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tApplicationDetails('ltsa-info') }}
          </p>
          <a
            class="mobile:mx-[8px]"
            @click="() => navigateTo(`/application-details/${applicationId}/ltsa`, { open: { target: '_blank' } })"
          >
            {{ tApplicationDetails('ltsa-details') }}
          </a>
        </div>
        <div v-if="isExaminer" class="mt-[40px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tApplicationDetails('aa-logic') }}
          </p>
          <a
            class="mobile:mx-[8px]"
            @click="
              () =>
                navigateTo(`/application-details/${applicationId}/auto-approval`, { open: { target: '_blank' } })
            "
          >
            {{ tApplicationDetails('aa-details') }}
          </a>
        </div>
        <div class="mt-[40px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tApplicationDetails('filing') }}
          </p>
          <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
            <div class="flex flex-col justify-between w-full">
              <div
                v-for="(event, index) in history.reverse()"
                :key="event.created_date"
                :class="`flex flex-row ${index === history.length - 1 ? '': 'mb-[24px]'}`"
              >
                <div>
                  <p class="text-bcGovColor-midGray mr-[16px]">
                    {{ formatDate(new Date(event.created_date)) }}
                  </p>
                </div>
                <div>
                  <p class="text-bcGovColor-midGray">
                    {{ formatTime(new Date(`${event.created_date}Z`)) }}
                  </p>
                  <p class="font-bold">
                    {{ event.message }}
                  </p>
                  <a
                    v-if="downloadEventTypes.includes(event.event_type)"
                    class="no-underline"
                    @click="() => getDownloadAction(event.event_type, applicationId.toString())"
                  >
                    {{ getDownloadText(event.event_type) }}
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
import { propertyTypeMap } from '~/utils/propertyTypeMap'

const route = useRoute()
const t = useNuxtApp().$i18n.t
const tRegistrationStatus = (translationKey: string) => t(`registration-status.${translationKey}`)
const tApplicationDetails = (translationKey: string) => t(`application-details.${translationKey}`)
const tPropertyForm = (translationKey: string) => t(`create-account.property-form.${translationKey}`)
const { isExaminer } = useBcrosKeycloak()
const { getChipFlavour } = useChipFlavour()

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const { applicationId } = route.params

const downloadEventTypes = ['CERTIFICATE_ISSUED']

const formatDate = (date: Date) => {
  const day = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return day
}

const formatTime = (date: Date): string => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const {
  getRegistration,
  getDocumentsForRegistration,
  getRegistrationHistory,
  getFile,
  getCertificate
} = useRegistrations()

const getDownloadText = (eventType: string) => {
  if (eventType === 'CERTIFICATE_ISSUED') {
    return tRegistrationStatus('download')
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
  link.download = `${tRegistrationStatus('strr-certificate')}.pdf`
  document.body.appendChild(link)
  link.click()
  URL.revokeObjectURL(link.href)
}

const downloadItem = async (id: string, fileId: string, fileName: string) => {
  const file = await getFile(id, fileId)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = fileName
  link.target = '_blank'
  link.click()
  URL.revokeObjectURL(link.href)
}

const application = await getRegistration(applicationId.toString())
const documents = await getDocumentsForRegistration(applicationId.toString())
const history = await getRegistrationHistory(applicationId.toString())

const flavour = application ? getChipFlavour(application.status) : null

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
