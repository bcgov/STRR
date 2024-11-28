<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'
import { RentalUnitSetupType } from '~/enums/rental-unit-setup-types'

const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const { addNewEmptyListing, removeListingAtIndex } = useHostPropertyStore()
const { property, isUnitNumberRequired, propertySchema } = storeToRefs(useHostPropertyStore())
const reqStore = usePropertyReqStore()

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
const rentalTypeOptions = [
  { value: RentalUnitType.ENTIRE_HOME, label: t('strr.text.entireHome') },
  { value: RentalUnitType.SHARED_ACCOMMODATION, label: t('strr.text.sharedAccomodation') }
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

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(propertyFormRef.value, props.isComplete)
  }
})
</script>

<template>
  <div data-testid="step-define-your-rental">
    <UForm
      ref="propertyFormRef"
      :schema="propertySchema"
      :state="property"
      class="space-y-10"
    >
      <ConnectPageSection>
        <FormDefineYourRentalPropertyAddress :is-complete="isComplete" />

        <FormDefineYourRentalReqs
          :is-complete="isComplete"
        />
      </ConnectPageSection>

      <ConnectPageSection
        v-if="reqStore.continueApplication"
      >
        <div class="space-y-10 py-10">
          <!-- property nickname section -->
          <ConnectFormSection
            :title="$t('label.propertyNickname')"
          >
            <ConnectFormFieldGroup
              id="property-address-nickname"
              v-model="property.address.nickname"
              :aria-label="$t('label.propertyNicknameOpt')"
              :help="$t('strr.hint.nickname')"
              name="property.nickname"
              :placeholder="$t('label.propertyNicknameOpt')"
            />
          </ConnectFormSection>

          <div class="h-px w-full border-b border-gray-100" />

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

          <!-- type of space section -->
          <ConnectFormSection
            title="Type of Space"
            :error="isComplete && hasFormErrors(propertyFormRef, ['propertyType'])"
          >
            <UFormGroup>
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
                :legend="$t('text.rentalUnitSetupLegend')"
                :ui="{ legend: 'sr-only' }"
                :ui-radio="{ inner: 'space-y-2' }"
              />
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

          <div class="h-px w-full border-b border-gray-100" />

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
    </UForm>
  </div>
</template>
