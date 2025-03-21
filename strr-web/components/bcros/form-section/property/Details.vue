<template>
  <div data-test-id="property-details">
    <BcrosFormSection :title="t('createAccount.propertyForm.rentalUnitDetails')">
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="rentalUnitSpaceType" class="d:pr-4 flex-grow">
          <USelect
            v-model="rentalUnitSpaceType"
            :placeholder="t('createAccount.propertyForm.rentalUnitSpaceType')"
            :options="rentalUnitSpaceTypeOptions"
            style="color: #1a202c; /* text-gray-900 */"
            data-test-id="rental-unit-space-type-select"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="isUnitOnPrincipalResidenceProperty" class="d:pr-4 flex-grow">
          <USelect
            v-model="isUnitOnPrincipalResidenceProperty"
            :placeholder="t('createAccount.propertyForm.isUnitOnPrincipalResidenceProperty')"
            :options="principalResidenceOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */"
            data-test-id="rental-unit-principal-residence-select"
          />
        </UFormGroup>
      </div>
      <div
        v-if="isUnitOnPrincipalResidenceProperty"
        :key="isUnitOnPrincipalResidenceProperty ? 'withDropdown' : 'withoutDropdown'"
        class="flex flex-row justify-between w-full mb-[40px] m:mb-4"
      >
        <UFormGroup name="hostResidence" class="d:pr-4 flex-grow" :error="hostResidenceError">
          <USelect
            v-model="hostResidenceComputed"
            :placeholder="t('createAccount.propertyForm.hostResidence')"
            :options="hostResidenceOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */"
            data-test-id="rental-unit-host-residence-select"
            @change="emit('validateHostResidence')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="numberOfRoomsForRent" class="d:pr-4 flex-grow" :error="numberOfRoomsForRentError">
          <div class="mb-2">
            {{ t('createAccount.propertyForm.numberOfRoomsForRent') }}
          </div>
          <div class="flex items-center border border-gray-300 rounded-md max-w-[200px]">
            <button
              class="px-2 py-1 border-r border-gray-300 rounded-l-md"
              :disabled="formState.propertyDetails.numberOfRoomsForRent <= 1"
              data-test-id="decrement-button"
              @click="decrementRooms"
            >
              -
            </button>
            <input
              v-model="formState.propertyDetails.numberOfRoomsForRent"
              type="number"
              class="w-full text-center outline-none border-none"
              :min="1"
              :max="5000"
              step="1"
              data-test-id="number-of-rooms-input"
              @input="emit('validateNumberOfRoomsForRent')"
              @keydown.enter.prevent
            >
            <button
              class="px-2 py-1 border-l border-gray-300 rounded-r-md"
              data-test-id="increment-button"
              @click="incrementRooms"
            >
              +
            </button>
          </div>
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="propertyType" class="d:pr-4 flex-grow">
          <USelect
            v-model="propertyType"
            :placeholder="t('createAccount.propertyForm.propertyType')"
            :options="propertyTypeOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */"
            data-test-id="rental-unit-type-select"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="ownershipType" class="d:pr-4 flex-grow">
          <USelect
            v-model="ownershipType"
            :placeholder="t('createAccount.propertyForm.ownershipType')"
            :options="ownershipTypeOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */"
            data-test-id="rental-unit-ownership-type-select"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="parcelIdentifier" class="d:pr-4 flex-grow">
          <UInput
            v-model="parcelIdentifier"
            aria-label="parcel identifier"
            :placeholder="t('createAccount.propertyForm.parcelIdentifier')"
            data-test-id="rental-unit-pid"
          />
          <template #help>
            <div class="flex">
              {{ t('createAccount.propertyForm.parcelIdentifierHelp') }}
              <BcrosTooltip
                class="ml-1"
                :text="t('createAccount.propertyForm.parcelIdentifierTooltip')"
                :popper="{
                  placement: 'right',
                  arrow: true
                }"
              >
                <UIcon class="text-xl bg-bcGovColor-activeBlue" name="i-mdi-information-outline" />
              </BcrosTooltip>
            </div>
          </template>
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="businessLicense" class="d:pr-4 flex-grow">
          <UInput
            v-model="businessLicense"
            aria-label="business license"
            :placeholder="t('createAccount.propertyForm.businessLicense')"
          />
          <template #help>
            {{ t('createAccount.propertyForm.businessLicenseHelp') }}
          </template>
        </UFormGroup>
      </div>
      <div v-if="businessLicense" class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="businessLicenseExpiryDate" class="d:pr-4 flex-grow">
          <UInput
            v-model="businessLicenseExpiryDate"
            :placeholder="t('createAccount.propertyForm.businessLicenseExpiryDate')"
            type="date"
            :min="new Date().toISOString().split('T')[0]"
            :max="new Date('2999-12-31').toISOString().split('T')[0]"
            :ui="{ base: 'uppercase' }"
          />
          <template #help>
            {{ t('createAccount.propertyForm.businessLicenseExpiryDateHelp') }}
          </template>
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">

const { t } = useTranslation()

const propertyType = defineModel<string>('propertyType')
const ownershipType = defineModel<string>('ownershipType')
const businessLicense = defineModel<string>('businessLicense')
const parcelIdentifier = defineModel<string>('parcelIdentifier')
const businessLicenseExpiryDate = defineModel<string>('businessLicenseExpiryDate')
const rentalUnitSpaceType = defineModel<string>('rentalUnitSpaceType')
const isUnitOnPrincipalResidenceProperty = defineModel<boolean>('isUnitOnPrincipalResidenceProperty')
const hostResidence = defineModel<string | null>('hostResidence')

const {
  hostResidenceError,
  numberOfRoomsForRentError
} = defineProps<{
  hostResidenceError: string,
  numberOfRoomsForRentError: string;
}>()

const emit = defineEmits([
  'validateHostResidence',
  'validateNumberOfRoomsForRent'
])

const principalResidenceOptions = [
  { value: true, label: t('createAccount.propertyForm.yes') },
  { value: false, label: t('createAccount.propertyForm.no') }
]

const rentalUnitSpaceTypeOptions = [
  { value: RentalUnitSpaceTypeE.ENTIRE_HOME, label: t('createAccount.propertyForm.entireHome') },
  { value: RentalUnitSpaceTypeE.SHARED_ACCOMMODATION, label: t('createAccount.propertyForm.sharedAccommodation') }
]

const hostResidenceOptions = computed(() => [
  {
    value: HostResidenceE.SAME_UNIT,
    label: rentalUnitSpaceType.value === RentalUnitSpaceTypeE.ENTIRE_HOME
      ? t('createAccount.propertyForm.sameUnitAltOption')
      : t('createAccount.propertyForm.sameUnitOption')
  },
  { value: HostResidenceE.ANOTHER_UNIT, label: t('createAccount.propertyForm.anotherUnitOption') }
])

const propertyTypeOptions = [
  { value: PropertyTypeE.SINGLE_FAMILY_HOME, label: t('createAccount.propertyForm.singleFamilyHome') },
  { value: PropertyTypeE.SECONDARY_SUITE, label: t('createAccount.propertyForm.secondarySuite') },
  { value: PropertyTypeE.ACCESSORY_DWELLING, label: t('createAccount.propertyForm.accessoryDwelling') },
  { value: PropertyTypeE.TOWN_HOME, label: t('createAccount.propertyForm.townhome') },
  { value: PropertyTypeE.MULTI_UNIT_HOUSING, label: t('createAccount.propertyForm.multiUnitHousing') },
  { value: PropertyTypeE.CONDO_OR_APT, label: t('createAccount.propertyForm.condoApartment') },
  { value: PropertyTypeE.RECREATIONAL, label: t('createAccount.propertyForm.recreationalProperty') },
  { value: PropertyTypeE.BED_AND_BREAKFAST, label: t('createAccount.propertyForm.bedAndBreakfast') },
  { value: PropertyTypeE.STRATA_HOTEL, label: t('createAccount.propertyForm.strataHotel') },
  { value: PropertyTypeE.FLOAT_HOME, label: t('createAccount.propertyForm.floatHome') }
]

const ownershipTypeOptions = [
  { value: OwnershipTypeE.RENT, label: t('createAccount.propertyForm.rent') },
  { value: OwnershipTypeE.OWN, label: t('createAccount.propertyForm.own') },
  { value: OwnershipTypeE.CO_OWN, label: t('createAccount.propertyForm.coOwn') }
]

const decrementRooms = () => {
  if (formState.propertyDetails.numberOfRoomsForRent > 1) {
    formState.propertyDetails.numberOfRoomsForRent--
  }
}

const incrementRooms = () => {
  if (formState.propertyDetails.numberOfRoomsForRent < 5000) {
    formState.propertyDetails.numberOfRoomsForRent++
  }
}

const hostResidenceComputed = computed({
  get: () => formState.propertyDetails.hostResidence ?? '', // Ensure string return
  set: (value: string) => {
    formState.propertyDetails.hostResidence = value || undefined // Set to null if empty
  }
})

watch(businessLicense, (): void => {
  if (!businessLicense.value) {
    // clear exp date when business lic is empty
    formState.propertyDetails.businessLicenseExpiryDate = ''
  }
})

watch(isUnitOnPrincipalResidenceProperty, (newValue) => {
  if (!newValue) {
    hostResidence.value = null
  }
})

</script>

<style scoped>
/* Hide spinner controls for Chrome, Safari, Edge, and Opera */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Hide spinner controls for Firefox */
input[type="number"] {
  -moz-appearance: textfield;
}
</style>
