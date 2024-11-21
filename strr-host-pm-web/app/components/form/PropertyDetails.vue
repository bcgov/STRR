<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'

const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const { propertySchema, addNewEmptyListing, removeListingAtIndex } = useHostPropertyStore()
const { property } = storeToRefs(useHostPropertyStore())

const propertyFormRef = ref<Form<z.output<typeof propertySchema>>>()

const rentalTypeOptions = [
  { value: RentalUnitType.ENTIRE_HOME, label: t('strr.text.entireHome') },
  { value: RentalUnitType.SHARED_ACCOMMODATION, label: t('strr.text.sharedAccomodation') }
]

const hostResidenceOptions = [
  { value: true, label: t('word.Yes') },
  { value: false, label: t('word.No') }
]

const hostUnitOptions = [
  { value: ResidenceType.SAME_UNIT, label: t('strr.text.hostSameUnit') },
  { value: ResidenceType.ANOTHER_UNIT, label: t('strr.text.hostDifferentUnit') }
]

const propertyTypes = [
  { name: t('strr.label.accessDwelling'), value: PropertyType.ACCESSORY_DWELLING },
  { name: t('strr.label.bb'), value: PropertyType.BED_AND_BREAKFAST },
  { name: t('strr.label.condoApt'), value: PropertyType.CONDO_OR_APT },
  { name: t('strr.label.floatHome'), value: PropertyType.FLOAT_HOME },
  { name: t('strr.label.multiHousing'), value: PropertyType.MULTI_UNIT_HOUSING },
  { name: t('strr.label.recreational'), value: PropertyType.RECREATIONAL },
  { name: t('strr.label.secondarySuite'), value: PropertyType.SECONDARY_SUITE },
  { name: t('strr.label.singleFamily'), value: PropertyType.SINGLE_FAMILY_HOME },
  { name: t('strr.label.strataHotel'), value: PropertyType.STRATA_HOTEL },
  { name: t('strr.label.townHome'), value: PropertyType.TOWN_HOME }
]
const ownershipTypes = [
  { name: t('strr.label.own'), value: OwnwershipType.OWN },
  { name: t('strr.label.coown'), value: OwnwershipType.CO_OWN },
  { name: t('strr.label.rent'), value: OwnwershipType.RENT }
]

const listingDetailsErrorList = computed(() => {
  const errorList: string[] = []
  const addPath = (_: any, index: number) => {
    errorList.push(`listingDetails.${index}.url`)
  }
  property.value.listingDetails.forEach(addPath)
  return errorList
})

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(propertyFormRef.value, props.isComplete)
  }
})
</script>

<template>
  <div data-testid="property-details">
    <UForm
      ref="propertyFormRef"
      :schema="propertySchema"
      :state="property"
      class="space-y-10"
    >
      <ConnectPageSection
        class="bg-white"
        :heading="{ label: $t('strr.section.title.property'), labelClass: 'font-bold md:ml-6' }"
      >
        <div class="space-y-10 py-10">
          <ConnectFormSection
            :title="$t('strr.section.subTitle.propertyDetails')"
            :error="isComplete && hasFormErrors(propertyFormRef, [
              'numberOfRoomsForRent', 'propertyType', 'ownershipType',
              'parcelIdentifier', 'businessLicense', 'businessLicenseExpiryDate'])"
          >
            <div class="space-y-5">
              <URadioGroup
                id="rental-type-radio-group"
                v-model="property.rentalUnitSpaceType"
                :class="isComplete && property.rentalUnitSpaceType === undefined
                  ? 'border-red-600 border-2 p-2'
                  : 'p-2'"
                :options="rentalTypeOptions"
                :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              >
                <template #legend>
                  <span class="sr-only">{{ $t('validation.required') }}</span>
                  <span>{{ $t('strr.text.rentalType') }}</span>
                </template>
              </URadioGroup>
              <URadioGroup
                id="host-residence-radio-group"
                v-model="property.isUnitOnPrincipalResidenceProperty"
                :class="isComplete && property.isUnitOnPrincipalResidenceProperty === undefined
                  ? 'border-red-600 border-2 p-2'
                  : 'p-2'"
                :options="hostResidenceOptions"
                :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              >
                <template #legend>
                  <span class="sr-only">{{ $t('validation.required') }}</span>
                  <span>{{ $t('strr.text.hostResidence') }}</span>
                </template>
              </URadioGroup>
              <URadioGroup
                v-if="property.isUnitOnPrincipalResidenceProperty"
                id="host-unit-radio-group"
                v-model="property.hostResidence"
                :class="isComplete && property.hostResidence === undefined
                  ? 'border-red-600 border-2 p-2'
                  : 'p-2'"
                :options="hostUnitOptions"
                :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              >
                <template #legend>
                  <span class="sr-only">{{ $t('validation.required') }}</span>
                  <span>{{ $t('strr.text.hostUnit') }}</span>
                </template>
              </URadioGroup>
              <ConnectFormFieldGroup
                id="property-rooms"
                v-model="property.numberOfRoomsForRent"
                :aria-label="$t('strr.label.numberOfRooms')"
                name="numberOfRoomsForRent"
                :placeholder="$t('strr.label.numberOfRooms')"
                :is-required="true"
                type="number"
              />
              <UFormGroup id="property-type" v-slot="{ error }" name="propertyType">
                <USelectMenu
                  v-model="property.propertyType"
                  value-attribute="value"
                  class="max-w-bcGovInput"
                  size="lg"
                  :color="property.propertyType ? 'primary' : 'gray'"
                  :placeholder="$t('strr.label.propertyType')"
                  :options="propertyTypes"
                  option-attribute="name"
                  :aria-label="$t('strr.label.propertyType')"
                  :aria-required="true"
                  :aria-invalid="error !== undefined"
                  :ui-menu="{
                    label: property.propertyType ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'
                  }"
                />
              </UFormGroup>
              <UFormGroup id="property-ownership-type" v-slot="{ error }" name="ownershipType">
                <USelectMenu
                  v-model="property.ownershipType"
                  value-attribute="value"
                  class="max-w-bcGovInput"
                  size="lg"
                  :color="property.ownershipType ? 'primary' : 'gray'"
                  :placeholder="$t('strr.label.ownershipType')"
                  :options="ownershipTypes"
                  option-attribute="name"
                  :aria-label="$t('strr.label.ownershipType')"
                  :aria-required="true"
                  :aria-invalid="error !== undefined"
                  :ui-menu="{
                    label: property.ownershipType ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'
                  }"
                />
              </UFormGroup>
              <ConnectFormFieldGroup
                id="property-parcel-id"
                v-model="property.parcelIdentifier"
                :aria-label="$t('strr.label.parcelIdentifierOpt')"
                :help="$t('strr.hint.parcelIdentifier')"
                name="parcelIdentifier"
                :placeholder="$t('strr.label.parcelIdentifierOpt')"
              />
              <ConnectFormFieldGroup
                id="property-business-license"
                v-model="property.businessLicense"
                :aria-label="$t('strr.label.businessLicenseOpt')"
                :help="$t('strr.hint.businessLicense')"
                name="businessLicense"
                :placeholder="$t('strr.label.businessLicenseOpt')"
              />
              <!-- TODO: date picker -->
              <!-- <ConnectFormFieldGroup
                id="property-parcel-id"
                v-model="property.parcelIdentifier"
                :aria-label="$t('strr.label.parcelIdentifierOpt')"
                :help="$t('strr.hint.parcelIdentifier')"
                name="parcelIdentifier"
                :placeholder="$t('strr.label.parcelIdentifierOpt')"
              /> -->
            </div>
          </ConnectFormSection>
          <div class="h-px w-full border-b border-gray-100" />
          <ConnectFormSection
            :title="$t('strr.section.subTitle.propertyAddress')"
            :error="isComplete && hasFormErrors(propertyFormRef, [
              'address.nickname',
              'address.country',
              'address.street',
              'address.city',
              'address.region',
              'address.postalCode'
            ])"
          >
            <div class="space-y-5">
              <ConnectFormFieldGroup
                id="property-address-nickname"
                v-model="property.address.nickname"
                :aria-label="$t('strr.label.nicknameOpt')"
                :help="$t('strr.hint.nickname')"
                name="address.nickname"
                :placeholder="$t('strr.label.nicknameOpt')"
              />
              <ConnectFormAddress
                id="property-address"
                v-model:country="property.address.country"
                v-model:street-number="property.address.streetNumber"
                v-model:street-name="property.address.streetName"
                v-model:unit-number="property.address.unitNumber"
                v-model:street-additional="property.address.streetAdditional"
                v-model:city="property.address.city"
                v-model:region="property.address.region"
                v-model:postal-code="property.address.postalCode"
                class="max-w-bcGovInput"
                :schema-prefix="'address.'"
                :disabled-fields="['country', 'region']"
                :excluded-fields="['street']"
                :form-ref="propertyFormRef"
              />
            </div>
          </ConnectFormSection>
          <div class="h-px w-full border-b border-gray-100" />
          <!-- TODO: get hasFormErrors dynamically -->
          <ConnectFormSection
            :title="$t('strr.section.subTitle.propertyListings')"
            :error="isComplete && hasFormErrors(propertyFormRef, listingDetailsErrorList)"
          >
            <div class="space-y-5">
              <span>{{ $t('strr.text.listEachWebLink') }}</span>
              <div
                v-for="listing, i in property.listingDetails"
                :key="'listing' + i"
              >
                <div class="space-y-5">
                  <div class="flex flex-col gap-5 sm:flex-row-reverse">
                    <div>
                      <UButton
                        v-if="i !== 0"
                        :label="$t('word.Remove')"
                        class="border border-blue-500 sm:border-0"
                        color="primary"
                        trailing-icon="i-mdi-close"
                        variant="ghost"
                        @click="removeListingAtIndex(i)"
                      />
                    </div>
                    <div class="grow">
                      <ConnectFormFieldGroup
                        :id="'property-listing-link-' + i"
                        v-model="listing.url"
                        :aria-label="$t('strr.label.listingLinkOpt')"
                        :help="$t('strr.hint.listingLink')"
                        :name="`listingDetails.${i}.url`"
                        :placeholder="$t('strr.label.listingLinkOpt')"
                        :is-required="true"
                      />
                    </div>
                  </div>
                  <UButton
                    v-if="i === property.listingDetails.length - 1"
                    :label="$t('strr.label.addListing')"
                    class="px-5 py-3"
                    color="primary"
                    icon="i-mdi-domain-plus"
                    variant="outline"
                    @click="addNewEmptyListing()"
                  />
                </div>
              </div>
            </div>
          </ConnectFormSection>
        </div>
      </ConnectPageSection>
    </UForm>
  </div>
</template>
