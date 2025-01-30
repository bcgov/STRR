<script setup lang="ts">
import type { Form } from '#ui/types'
const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const reqStore = usePropertyReqStore()
const propStore = useHostPropertyStore()
const { getUnitDetailsSchema } = useHostPropertyStore()

const unitDetailsFormRef = ref<Form<any>>()

const propertyTypes = [
  { name: t(`propertyType.${PropertyType.SINGLE_FAMILY_HOME}`), value: PropertyType.SINGLE_FAMILY_HOME },
  { name: t(`propertyType.${PropertyType.SECONDARY_SUITE}`), value: PropertyType.SECONDARY_SUITE },
  { name: t(`propertyType.${PropertyType.ACCESSORY_DWELLING}`), value: PropertyType.ACCESSORY_DWELLING },
  { name: t(`propertyType.${PropertyType.TOWN_HOME}`), value: PropertyType.TOWN_HOME },
  { name: t(`propertyType.${PropertyType.MULTI_UNIT_HOUSING}`), value: PropertyType.MULTI_UNIT_HOUSING },
  { name: t(`propertyType.${PropertyType.CONDO_OR_APT}`), value: PropertyType.CONDO_OR_APT },
  { name: t(`propertyType.${PropertyType.RECREATIONAL}`), value: PropertyType.RECREATIONAL },
  { name: t(`propertyType.${PropertyType.BED_AND_BREAKFAST}`), value: PropertyType.BED_AND_BREAKFAST },
  { name: t(`propertyType.${PropertyType.STRATA_HOTEL}`), value: PropertyType.STRATA_HOTEL },
  { name: t(`propertyType.${PropertyType.FLOAT_HOME}`), value: PropertyType.FLOAT_HOME }
]
const rentalTypeOptions = [
  { value: RentalUnitType.ENTIRE_HOME, label: t(`rentalUnitType.${RentalUnitType.ENTIRE_HOME}`) },
  { value: RentalUnitType.SHARED_ACCOMMODATION, label: t(`rentalUnitType.${RentalUnitType.SHARED_ACCOMMODATION}`) }
]
const ownershipTypes = [
  { label: t(`ownershipType.${OwnershipType.OWN}`), value: OwnershipType.OWN },
  { label: t(`ownershipType.${OwnershipType.CO_OWN}`), value: OwnershipType.CO_OWN },
  { label: t(`ownershipType.${OwnershipType.RENT}`), value: OwnershipType.RENT },
  { label: t(`ownershipType.${OwnershipType.OTHER}`), value: OwnershipType.OTHER }
]

const rentalUnitSetupTypes = [
  {
    label: t(`rentalUnitSetupType.${RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE}`),
    value: RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE
  },
  {
    label: t(`rentalUnitSetupType.${RentalUnitSetupType.UNIT_ON_PR_PROPERTY}`),
    value: RentalUnitSetupType.UNIT_ON_PR_PROPERTY
  },
  {
    label: t(`rentalUnitSetupType.${RentalUnitSetupType.UNIT_NOT_ON_PR_PROPERTY}`),
    value: RentalUnitSetupType.UNIT_NOT_ON_PR_PROPERTY
  }
]

// revalidate parcelIdentifer when user changes ownsership types
watch(
  () => propStore.unitDetails.ownershipType,
  (newVal) => {
    if (newVal &&
        [OwnershipType.OWN, OwnershipType.CO_OWN].includes(newVal) &&
        propStore.unitDetails.parcelIdentifier !== ''
    ) {
      unitDetailsFormRef.value?.validate('parcelIdentifier', { silent: true })
    }
    if (newVal &&
        [OwnershipType.RENT, OwnershipType.OTHER].includes(newVal) &&
        propStore.unitDetails.parcelIdentifier === ''
    ) {
      unitDetailsFormRef.value?.validate('parcelIdentifier', { silent: true })
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
    data-testid="form-unit-details"
    :schema="getUnitDetailsSchema()"
    :state="propStore.unitDetails"
    class="space-y-10"
  >
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
            v-if="propStore.isUnitNumberRequired"
            class="mt-6 max-w-bcGovInput"
            color="yellow"
            icon="i-mdi-alert"
            :close-button="null"
            variant="subtle"
            :ui="{
              inner: 'pt-0',
              icon: {
                base: 'flex-shrink-0 w-5 h-5 self-start'
              }
            }"
          >
            <template #title>
              <ConnectI18nHelper
                class="text-bcGovGray-700"
                :translation-path="
                  [PropertyType.SECONDARY_SUITE, PropertyType.ACCESSORY_DWELLING]
                    .includes(propStore.unitDetails.propertyType!) ?
                      'alert.propertyTypeReqUnitNumber.maybe' :
                      'alert.propertyTypeReqUnitNumber.always'
                "
                :propertytype="$t(`propertyType.${propStore.unitDetails.propertyType}`)"
              />
            </template>
          </UAlert>
        </ConnectFormSection>

        <!-- type of space section -->
        <ConnectFormSection
          :title="$t('label.typeOfSpace')"
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
            :min="0"
            :max="5000"
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
            :aria-label="(!propStore.unitDetails.ownershipType || propStore.isOwnerOrCoOwner)
              ? $t('strr.label.parcelIdentifier')
              : $t('strr.label.parcelIdentifierOpt')"
            :placeholder="(!propStore.unitDetails.ownershipType || propStore.isOwnerOrCoOwner)
              ? $t('strr.label.parcelIdentifier')
              : $t('strr.label.parcelIdentifierOpt')"
          >
            <template #help>
              <span>
                {{ $t('strr.hint.parcelIdentifier') }}
                <span class="inline-flex align-text-top">
                  <ConnectTooltip :text="$t('tooltip.pid')" :popper="{ placement: 'right' }">
                    <UIcon name="i-mdi-info-outline" class="ml-0.5 size-4 shrink-0 text-blue-500" />
                  </ConnectTooltip>
                </span>
              </span>
            </template>
          </ConnectFormFieldGroup>
        </ConnectFormSection>
      </div>
    </ConnectPageSection>
  </UForm>
</template>
