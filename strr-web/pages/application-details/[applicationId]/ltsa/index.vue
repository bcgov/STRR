<template>
  <div>
    <div>
      <BcrosBanner hide-buttons>
        <div class="flex items-center m:justify-between">
          <BcrosTypographyH1
            :text="
              `${application?.unitAddress.nickname ?? ''} ${tApplicationDetails('registration')} #${applicationId}
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
    </div>
    <div class="mt-[104px] m:mt-[74px]">
      <div>
        <p class="font-bold mb-[24px] mobile:mx-[8px]">
          {{ tLtsa('ltsaGeneralInfo') }}
        </p>
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
              :title="tLtsa('date')"
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
              :title="tLtsa('parcel')"
            >
              <p>{{ `${tLtsa('parcel')}: ${data[0].record.ownershipGroups[0].jointTenancyIndication}` }}</p>
              <p>{{ `${tLtsa('numerator')}: ${data[0].record.ownershipGroups[0].interestFractionNumerator}` }}</p>
              <p>{{ `${tLtsa('denominator')}: ${data[0].record.ownershipGroups[0].interestFractionDenominator}` }}</p>
            </BcrosFormSectionReviewItem>
          </div>
        </div>
        <div class="mt-[40px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tLtsa('titleOwners') }}
          </p>
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
import { AlertsFlavourE } from '#imports'
import { LtsaDataI } from '~/interfaces/ltsa-data-i'

const route = useRoute()
const t = useNuxtApp().$i18n.t
const tRegistrationStatus = (translationKey: string) => t(`registrationStatus.${translationKey}`)
const tApplicationDetails = (translationKey: string) => t(`applicationDetails.${translationKey}`)
const tLtsa = (translationKey: string) => t(`ltsa.${translationKey}`)

const { applicationId } = route.params

const { getRegistration, getLtsa } = useRegistrations()

const application = await getRegistration(applicationId.toString())

const formatDate = (date: Date) => date.toLocaleDateString('en-US')

const getFlavour = (status: string, invoices: RegistrationI['invoices']):
  { alert: AlertsFlavourE, text: string } | undefined => {
  if (invoices.length === 0) {
    return {
      text: tRegistrationStatus('applied'),
      alert: AlertsFlavourE.APPLIED
    }
  }
  if (invoices[0].payment_status_code === 'COMPLETED') {
    return {
      text: tRegistrationStatus('applied'),
      alert: AlertsFlavourE.APPLIED
    }
  }
  if (status === 'PENDING' && invoices[0].payment_status_code !== 'COMPLETED') {
    return {
      text: tRegistrationStatus('provisional'),
      alert: AlertsFlavourE.WARNING
    }
  }
}

const flavour = application ? getFlavour(application.status, application.invoices) : null

const data: LtsaDataI[] = await getLtsa(applicationId.toString()) || {} as LtsaDataI[]

const ownerRows = data.length > 0
  ? [{
      givenName: data[0].record.ownershipGroups[0].titleOwners[0].givenName,
      lastName: data[0].record.ownershipGroups[0].titleOwners[0].lastNameOrCorpName1,
      address: `
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.addressLine1}
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.addressLine2
      ? `${data[0].record.ownershipGroups[0].titleOwners[0].address.addressLine2} , `
      : ', '}
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.city}
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.country}
    ${data[0].record.ownershipGroups[0].titleOwners[0].address.postalCode}
  `,
      occupation: data[0].record.ownershipGroups[0].titleOwners[0].occupationDescription
    }]
  : []

</script>
