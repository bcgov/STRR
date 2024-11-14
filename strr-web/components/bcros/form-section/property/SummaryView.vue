<script setup lang="ts">
import { getOwnershipTypeDisplay, getPropertyTypeDisplay } from '@/utils/common'
const { t } = useTranslation()
const tReview = (translationKey: string) => t(`createAccount.review.${translationKey}`)
const tPropertyForm = (translationKey: string) => t(`createAccount.propertyForm.${translationKey}`)

const props = defineProps<{
  headerTag?: string,
  headerClass?: string,
  propertyDetails: PropertyDetailsI
}>()

// default values
const {
  headerTag = 'p',
  headerClass = 'font-bold mb-6 m:mx-2',
  propertyDetails
} = props
console.log(getPropertyTypeDisplay(propertyDetails.propertyType, tPropertyForm))
const propertyAddressDetails = computed((): UnitAddressAPII => {
  return {
    streetName: propertyDetails.streetName,
    streetNumber: propertyDetails.streetNumber,
    unitNumber: propertyDetails.unitNumber,
    addressLineTwo: propertyDetails.addressLineTwo,
    city: propertyDetails.city,
    postalCode: propertyDetails.postalCode,
    province: propertyDetails.province,
    country: propertyDetails.country
  }
})

</script>

<template>
  <div>
    <component :is="headerTag" :class="headerClass">
      {{ tReview('propertyDetails') }}
    </component>
    <div class="bg-white p-8 m:px-2 grid d:grid-cols-3 d:grid-rows-5">
      <BcrosFormSectionReviewItem
        :title="tReview('nickname')"
        :content="propertyDetails.nickname || '-'"
        class="break-all"
      />
      <BcrosFormSectionReviewItem
        :title="tReview('rentalUnitSpaceType')"
        :content="propertyDetails.rentalUnitSpaceType
          ? tReview(propertyDetails.rentalUnitSpaceType) : '-'"
      />
      <BcrosFormSectionReviewItem
        :title="tReview('parcelIdentifier')"
        :content="propertyDetails.parcelIdentifier || '-'"
      />
      <div class="grid grid-rows-subgrid d:row-span-5">
        <BcrosFormSectionReviewItem
          :title="tReview('address')"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <p v-html="displayFullAddressWithStreetAttributes(propertyAddressDetails) || '-'" />
        </BcrosFormSectionReviewItem>
      </div>
      <BcrosFormSectionReviewItem
        :title="tReview('isUnitOnPrincipalResidenceProperty')"
        :content="propertyDetails.isUnitOnPrincipalResidenceProperty !== null
          ? tReview(String(propertyDetails.isUnitOnPrincipalResidenceProperty)) : '-'
        "
      />
      <BcrosFormSectionReviewItem
        :title="tReview('businessLicense')"
        :content="propertyDetails.businessLicense || '-'"
      />
      <BcrosFormSectionReviewItem
        v-if="propertyDetails.isUnitOnPrincipalResidenceProperty"
        :title="tReview('hostResidence')"
        :content="propertyDetails.hostResidence
          ? tReview(propertyDetails.hostResidence) : '-'"
      />
      <BcrosFormSectionReviewItem
        v-if="propertyDetails.businessLicenseExpiryDate"
        :title="tReview('businessLicenseExpiryDate')"
        :content="convertDateToLongFormat(propertyDetails.businessLicenseExpiryDate)"
      />
      <BcrosFormSectionReviewItem
        :title="tReview('numberOfRoomsForRent')"
        :content="String(propertyDetails.numberOfRoomsForRent) || '-'"
      />
      <div class="grid grid-rows-subgrid d:row-span-3">
        <BcrosFormSectionReviewItem :title="tReview('listing')">
          <template v-if="propertyDetails.listingDetails[0]?.url.length > 0">
            <a
              v-for="listing in propertyDetails.listingDetails"
              :key="listing.url"
              :href="listing.url"
              target="_blank"
              class="my-1"
              rel="noopener noreferrer"
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
        :title="tReview('propertyType')"
        :content="getPropertyTypeDisplay(propertyDetails.propertyType, tPropertyForm)"
      />
      <BcrosFormSectionReviewItem
        :title="tReview('ownershipType')"
        :content="getOwnershipTypeDisplay(propertyDetails.ownershipType, tReview)"
      />
    </div>
  </div>
</template>
