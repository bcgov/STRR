<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'
import { RentalUnitSetupType } from '~/enums/rental-unit-setup-types'

const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const { addNewEmptyListing, removeListingAtIndex } = useHostPropertyStore()
const { property, isUnitNumberRequired, propertySchema } = storeToRefs(useHostPropertyStore())

const propertyFormRef = ref<Form<z.output<typeof propertySchema.value>>>()

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
  { label: t('strr.label.own'), value: OwnwershipType.OWN },
  { label: t('strr.label.coown'), value: OwnwershipType.CO_OWN },
  { label: t('strr.label.rent'), value: OwnwershipType.RENT },
  { label: t('strr.label.other'), value: OwnwershipType.OTHER }
]

const rentalUnitSetupTypes = [
  { label: t('strr.text.wholePr'), value: RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE },
  { label: t('strr.text.roomInPr'), value: RentalUnitSetupType.ROOM_IN_PRINCIPAL_RESIDENCE },
  {
    label: t('strr.text.wholeUnitSameProperty'),
    value: RentalUnitSetupType.WHOLE_UNIT_SAME_PROPERTY
  },
  {
    label: t('strr.text.wholeUnitDiffProperty'),
    value: RentalUnitSetupType.WHOLE_UNIT_DIFFERENT_PROPERTY
  }
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
      <ConnectPageSection>
        <FormDefineYourRentalUnitResiAddress :is-complete="isComplete" />

        <div class="space-y-10 py-10">
          <UDivider :ui="{ border: { base: 'border-gray-100' } }" />

          <fieldset class="flex flex-col gap-6 px-4 md:px-10">
            <legend class="text-lg font-semibold">
              {{ $t('strr.label.prRequirement') }}
            </legend>

            <UFormGroup
              label="This property is in an area subject to the Principal Residence Requirement."
              :ui="{ label: { base: 'font-normal' } }"
            >
              <UCheckbox
                label="This property is exempt from  the Principal Residence Requirement"
              />
            </UFormGroup>
          </fieldset>

          <UDivider :ui="{ border: { base: 'border-gray-100' } }" />

          <!-- property type section -->
          <ConnectFormSection
            :title="$t('strr.label.propertyType')"
            :error="isComplete && hasFormErrors(propertyFormRef, ['propertyType'])"
          >
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
          </ConnectFormSection>

          <!-- ownership type section -->
          <ConnectFormSection
            :title="$t('strr.label.ownershipType')"
            :error="isComplete && hasFormErrors(propertyFormRef, ['ownershipType'])"
          >
            <UFormGroup id="ownership-type" name="ownershipType">
              <URadioGroup
                id="ownership-type-radio-group"
                v-model="property.ownershipType"
                :class="isComplete && property.ownershipType === undefined
                  ? 'border-red-600 border-2 p-2'
                  : 'p-2'"
                :options="ownershipTypes"
                :legend="$t('strr.text.ownershipTypeLegend')"
                :ui="{ legend: 'sr-only' }"
                :ui-radio="{ inner: 'space-y-2' }"
              />
            </UFormGroup>
          </ConnectFormSection>

          <!-- rental unit setup section -->
          <ConnectFormSection
            :title="$t('strr.label.rentalUnitSetup')"
            :error="isComplete && hasFormErrors(propertyFormRef, ['rentalUnitSetupType'])"
          >
            <UFormGroup id="rental-unit-setup" name="rentalUnitSetupType">
              <URadioGroup
                id="rental-unit-setup-radio-group"
                v-model="property.rentalUnitSetupType"
                :class="isComplete && property.rentalUnitSetupType === undefined
                  ? 'border-red-600 border-2 p-2'
                  : 'p-2'"
                :options="rentalUnitSetupTypes"
                :ui="{ legend: 'mb-3 text-default font-normal text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              >
                <template #legend>
                  <div class="flex flex-col gap-2">
                    <span class="sr-only">{{ $t('validation.required') }}</span>
                    <span>{{ $t('strr.text.rentalUnitSetupLegend') }}</span>
                    <span class="font-bold">{{ $t('strr.label.theRentalUnitIs') }}</span>
                  </div>
                </template>
              </URadioGroup>
            </UFormGroup>
          </ConnectFormSection>

          <!-- number of rooms for rent section -->
          <ConnectFormSection
            :title="$t('strr.label.numberOfRooms')"
            :error="isComplete && hasFormErrors(propertyFormRef, ['numberOfRoomsForRent'])"
          >
            <ConnectFormFieldGroup
              id="property-rooms"
              v-model="property.numberOfRoomsForRent"
              :aria-label="$t('strr.label.numberOfRooms')"
              name="numberOfRoomsForRent"
              :placeholder="$t('strr.label.numberOfRooms')"
              :is-required="true"
              type="number"
            />
          </ConnectFormSection>

          <!-- property nickname section -->
          <ConnectFormSection
            :title="$t('strr.label.rentalUnitName')"
          >
            <ConnectFormFieldGroup
              id="property-address-nickname"
              v-model="property.address.nickname"
              :aria-label="$t('strr.label.rentalUnitNameOpt')"
              :help="$t('strr.hint.nickname')"
              name="property.nickname"
              :placeholder="$t('strr.label.rentalUnitNameOpt')"
            />
          </ConnectFormSection>

          <!-- property website listings section -->
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

          <!-- parcel identifier (PID) section -->
          <ConnectFormSection
            :title="$t('strr.label.parcelId')"
            :error="isComplete && hasFormErrors(propertyFormRef, ['parcelIdentifier'])"
          >
            <ConnectFormFieldGroup
              id="property-parcel-id"
              v-model="property.parcelIdentifier"
              mask="###-###-###"
              :aria-label="$t('strr.label.parcelIdentifierOpt')"
              :help="$t('strr.hint.parcelIdentifier')"
              name="parcelIdentifier"
              :placeholder="$t('strr.label.parcelIdentifierOpt')"
            />
          </ConnectFormSection>
        </div>
      </ConnectPageSection>

      <!-- supporting info section -->
      <div class="flex flex-col gap-6">
        <h3 class="text-lg font-semibold">
          {{ $t('strr.label.supportingInfo') }}
        </h3>

        <ConnectPageSection :aria-label="$t('strr.label.supportingInfo')">
          <div class="space-y-10 py-10">
            <p class="px-4 md:px-10">
              {{ $t('strr.text.requireBusLicense') }}
            </p>

            <!-- business license section -->
            <ConnectFormSection
              :title="$t('strr.label.businessLicense')"
              :error="isComplete && hasFormErrors(propertyFormRef, ['businessLicense'])"
            >
              <ConnectFormFieldGroup
                id="property-business-license"
                v-model="property.businessLicense"
                :aria-label="$t('strr.label.businessLicense')"
                :help="$t('strr.hint.businessLicense')"
                name="businessLicense"
                :placeholder="$t('strr.label.businessLicense')"
              />
            </ConnectFormSection>

            <!-- business license expiry section -->
            <ConnectFormSection
              v-if="property.businessLicense"
              :title="$t('strr.label.businessLicenseDate')"
              :error="isComplete && hasFormErrors(propertyFormRef, ['businessLicenseExpiryDate'])"
            >
              <ConnectFormDateInput
                name="businessLicenseExpiryDate"
                :initial-date="property.businessLicenseExpiryDate
                  ? dateStringToDate(property.businessLicenseExpiryDate)
                  : undefined"
                :help="t('text.defaultDateFormat')"
                :placeholder="t('strr.label.businessLicenseDate')"
                @selection="property.businessLicenseExpiryDate = $event ? dateToString($event) : ''"
              />
            </ConnectFormSection>
          </div>
        </ConnectPageSection>
      </div>
    </UForm>
  </div>
</template>
