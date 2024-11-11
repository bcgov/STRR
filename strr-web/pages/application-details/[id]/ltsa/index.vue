<template>
  <div>
    <div>
      <BcrosBanner>
        <div class="flex flex-col m:justify-between">
          <BcrosTypographyH1
            :text="tLtsa('ltsaDetails')"
            class="mobile:text-6 mb-4"
            no-spacing
          />
          <p class="flex-shrink-0">
            {{ headerLabel }}
          </p>
        </div>
      </BcrosBanner>
    </div>
    <div class="mt-[104px] m:mt-[152px]">
      <div>
        <BcrosTypographyH2
          class="mobile:mx-2"
          :text="tLtsa('ltsaGeneralInfo')"
        />
        <div
          v-if="data.length > 0"
          class="bg-white py-[22px] px-[30px] mobile:px-[8px] flex d:flex-row m:flex-col"
        >
          <div class="flex flex-col justify-between w-full mobile:flex-col mr-[40px]">
            <BcrosFormSectionReviewItem
              :title="tLtsa('tax')"
            >
              <p>{{ data[0].record.taxAuthorities[0].authorityName }}</p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              :title="tLtsa('date')"
              class="d:mt-[24px]"
            >
              <p>{{ formatDate(new Date(data[0].record.tombstone.applicationReceivedDate)) }}</p>
            </BcrosFormSectionReviewItem>
          </div>
          <div class="flex flex-col justify-between w-full mobile:flex-col mr-[40px]">
            <BcrosFormSectionReviewItem
              :title="tLtsa('description')"
            >
              <p>
                {{ data[0].record.descriptionsOfLand[0].fullLegalDescription }}
              </p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              :title="tLtsa('pid')"
              class="d:mt-[24px]"
            >
              <p>
                {{ data[0].record.descriptionsOfLand[0].parcelIdentifier }}
              </p>
            </BcrosFormSectionReviewItem>
            <BcrosFormSectionReviewItem
              :title="tLtsa('parcel')"
              class="d:mt-[24px]"
            >
              <p>{{ data[0].record.descriptionsOfLand[0].parcelStatus }}</p>
            </BcrosFormSectionReviewItem>
          </div>
          <div class="flex flex-col justify-between w-full mobile:flex-col">
            <BcrosFormSectionReviewItem
              :title="tLtsa('ownership')"
            >
              <p>{{ `${tLtsa('joint')}: ${data[0].record.ownershipGroups[0].jointTenancyIndication}` }}</p>
              <p>
                {{ `${tLtsa('numerator')}: ${data[0].record.ownershipGroups[0].interestFractionNumerator}` }}
              </p>
              <p>
                {{ `${tLtsa('denominator')}: ${data[0].record.ownershipGroups[0].interestFractionDenominator}` }}
              </p>
            </BcrosFormSectionReviewItem>
          </div>
        </div>
        <div class="mt-[40px]">
          <BcrosTypographyH2
            class="mobile:mx-2"
            :text="tLtsa('titleOwners')"
          />
          <div
            v-if="ownerRows.length > 0"
            class="bg-white py-[22px] px-[30px] mobile:px-[8px]"
          >
            <div class="d:hidden">
              <BcrosFormSectionReviewItem
                :title="tLtsa('given')"
              >
                <p>
                  {{ ownerRows[0].givenName }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tLtsa('last')"
              >
                <p>
                  {{ ownerRows[0].lastName }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tLtsa('address')"
              >
                <p>
                  {{ ownerRows[0].address }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tLtsa('occupation')"
              >
                <p>
                  {{ ownerRows[0].occupation }}
                </p>
              </BcrosFormSectionReviewItem>
            </div>
            <div class="flex flex-row justify-between w-full mobile:flex-col desktop:mb-[24px] m:hidden">
              <UTable :rows="ownerRows" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LtsaDataI } from '~/interfaces/ltsa-data-i'

const route = useRoute()
const { t } = useTranslation()
const tLtsa = (translationKey: string) => t(`ltsa.${translationKey}`)

const applicationNumber = route.params.id.toString()

const { getLtsa, getApplication } = useApplications()
const { setupBreadcrumbData } = useBreadcrumb()

const application = await getApplication(applicationNumber)
const formatDate = (date: Date) => date.toLocaleDateString('en-US')
const data: LtsaDataI[] = await getLtsa(applicationNumber) || {} as LtsaDataI[]
const applicationDetails: HostApplicationDetailsI = application.registration

setupBreadcrumbData(application)

const ownerRows = data.length > 0
  ? [{
      'Given Name': data[0].record.ownershipGroups[0].titleOwners[0].givenName,
      'Last Name': data[0].record.ownershipGroups[0].titleOwners[0].lastNameOrCorpName1,
      Address: `
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.addressLine1}
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.addressLine2
      ? `${data[0].record.ownershipGroups[0].titleOwners[0].address.addressLine2} , `
      : ', '}
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.city}
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.country}
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.postalCode}
  `,
      Occupation: data[0].record.ownershipGroups[0].titleOwners[0].occupationDescription
    }]
  : []

const headerLabel =
  `${
    applicationDetails.unitAddress.nickname
      ? applicationDetails.unitAddress.nickname + ','
      : ''
  }` +
  `${applicationDetails.unitAddress.streetNumber} ` +
  `${applicationDetails.unitAddress.streetName}` +
  `${applicationDetails.unitAddress.unitNumber
    ? `, ${applicationDetails.unitAddress.unitNumber}`
    : ''}` +
  `${
    applicationDetails.unitAddress.addressLineTwo
      ? ' ' + applicationDetails.unitAddress.addressLineTwo
      : ''
  }, ` +
  `${applicationDetails.unitAddress.city} ` +
  `${applicationDetails.unitAddress.province} ` +
  `${applicationDetails.unitAddress.postalCode}` +
  `, Application #${applicationNumber}`

</script>
