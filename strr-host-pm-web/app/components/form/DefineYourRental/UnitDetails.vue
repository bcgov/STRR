<script setup lang="ts">
import type { Form } from '#ui/types'
const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const reqStore = usePropertyReqStore()
const propStore = useHostPropertyStore()
const { getUnitDetailsSchema } = useHostPropertyStore()

const unitDetailsFormRef = ref<Form<any>>()

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
  { label: t('strr.label.own'), value: OwnershipType.OWN },
  { label: t('strr.label.coown'), value: OwnershipType.CO_OWN },
  { label: t('strr.label.rent'), value: OwnershipType.RENT },
  { label: t('strr.label.other'), value: OwnershipType.OTHER }
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

// revalidate parcelIdentifer whe user changes ownsership types
watch(
  () => propStore.unitDetails.ownershipType,
  () => {
    if (propStore.unitDetails.parcelIdentifier !== '') {
      unitDetailsFormRef.value?.validate('parcelIdentifier')
    }
  }
)

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(unitDetailsFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <UForm
    v-if="reqStore.showUnitDetailsForm"
    ref="unitDetailsFormRef"
    :schema="getUnitDetailsSchema()"
    :state="propStore.unitDetails"
    class="space-y-10"
  >
    <!-- v-if="reqStore.continueApplication" -->
    <ConnectPageSection>
      <div class="space-y-10 py-10">
        <!-- property type section -->
        <ConnectFormSection
          :title="$t('strr.label.propertyType')"
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['propertyType'])"
        >
          <UFormGroup id="property-type" v-slot="{ error }" name="propertyType">
            <USelectMenu
              v-model="propStore.unitDetails.propertyType"
              value-attribute="value"
              class="max-w-bcGovInput"
              size="lg"
              :color="propStore.unitDetails.propertyType ? 'primary' : 'gray'"
              :placeholder="$t('strr.label.propertyType')"
              :options="propertyTypes"
              option-attribute="name"
              :aria-label="$t('strr.label.propertyType')"
              :aria-required="true"
              :aria-invalid="error !== undefined"
              :ui-menu="{
                label: propStore.unitDetails.propertyType ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'
              }"
            />
          </UFormGroup>

          <UAlert
            v-if="propStore.unitDetails.propertyType && [
              PropertyType.SECONDARY_SUITE,
              PropertyType.ACCESSORY_DWELLING,
              PropertyType.TOWN_HOME,
              PropertyType.MULTI_UNIT_HOUSING,
              PropertyType.CONDO_OR_APT,
              PropertyType.STRATA_HOTEL
            ].includes(propStore.unitDetails.propertyType)"
            class="mt-6"
            color="yellow"
            icon="i-mdi-alert"
            :close-button="null"
            variant="subtle"
            :ui="{
              inner: 'pt-0',
            }"
          >
            <template #title>
              <ConnectI18nBold
                class="text-bcGovGray-700"
                translation-path="alert.propertyTypeReqUnitNumber.title"
                :propertytype="$t(`propertyType.${propStore.unitDetails.propertyType}`)"
              />
            </template>
          </UAlert>
        </ConnectFormSection>

        <!-- type of space section -->
        <ConnectFormSection
          title="Type of Space"
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['typeOfSpace'])"
        >
          <UFormGroup name="typeOfSpace">
            <URadioGroup
              id="rental-type-radio-group"
              v-model="propStore.unitDetails.typeOfSpace"
              :legend="$t('text.typeOfSpaceLegend')"
              :class="isComplete && hasFormErrors(unitDetailsFormRef, ['typeOfSpace'])
                ? 'border-red-600 border-2 p-2'
                : 'p-2'"
              :options="rentalTypeOptions"
              :ui="{ legend: 'sr-only' }"
              :ui-radio="{ inner: 'space-y-2' }"
            />
          </UFormGroup>
        </ConnectFormSection>

        <!-- rental unit setup section -->
        <ConnectFormSection
          :title="$t('strr.label.rentalUnitSetup')"
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['rentalUnitSetupType'])"
        >
          <UFormGroup id="rental-unit-setup" name="rentalUnitSetupType">
            <URadioGroup
              id="rental-unit-setup-radio-group"
              v-model="propStore.unitDetails.rentalUnitSetupType"
              :class="isComplete && hasFormErrors(unitDetailsFormRef, ['rentalUnitSetupType'])
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
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['numberOfRoomsForRent'])"
        >
          <ConnectFormFieldGroup
            id="property-rooms"
            v-model="propStore.unitDetails.numberOfRoomsForRent"
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
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['ownershipType'])"
        >
          <UFormGroup id="ownership-type" name="ownershipType">
            <URadioGroup
              id="ownership-type-radio-group"
              v-model="propStore.unitDetails.ownershipType"
              :class="isComplete && hasFormErrors(unitDetailsFormRef, ['ownershipType'])
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
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['parcelIdentifier'])"
        >
          <ConnectFormFieldGroup
            id="property-parcel-id"
            v-model="propStore.unitDetails.parcelIdentifier"
            mask="###-###-###"
            name="parcelIdentifier"
            :help="$t('strr.hint.parcelIdentifier')"
            :aria-label="propStore.isPIDRequired
              ? $t('strr.label.parcelIdentifier')
              : $t('strr.label.parcelIdentifierOpt')"
            :placeholder="propStore.isPIDRequired
              ? $t('strr.label.parcelIdentifier')
              : $t('strr.label.parcelIdentifierOpt')"
          />
        </ConnectFormSection>
      </div>
    </ConnectPageSection>
  </UForm>
</template>
