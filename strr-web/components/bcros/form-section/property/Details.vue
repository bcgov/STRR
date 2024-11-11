<template>
  <div data-test-id="property-details">
    <BcrosFormSection :title="t('createAccount.propertyForm.rentalUnitDetails')">
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="rentalUnitSpaceType" class="d:pr-4 flex-grow" :error="rentalUnitSpaceTypeError">
          <USelect
            v-model="rentalUnitSpaceType"
            :placeholder="t('createAccount.propertyForm.rentalUnitSpaceType')"
            :options="rentalUnitSpaceTypeOptions"
            style="color: #1a202c; /* text-gray-900 */"
            @blur="emit('validateRentalUnitSpaceType')"
            @change="emit('validateRentalUnitSpaceType')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup
          name="isUnitOnPrincipalResidenceProperty"
          class="d:pr-4 flex-grow"
          :error="principalResidenceError"
        >
          <USelect
            v-model="isUnitOnPrincipalResidenceProperty"
            :placeholder="t('createAccount.propertyForm.isUnitOnPrincipalResidenceProperty')"
            :options="principalResidenceOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */"
            @blur="emit('validatePrincipalResidenceOptions')"
            @change="emit('validatePrincipalResidenceOptions')"
          />
        </UFormGroup>
      </div>
      <div
        v-if="isUnitOnPrincipalResidenceProperty"
        :key="isUnitOnPrincipalResidenceProperty
          ? 'withDropdown' : 'withoutDropdown'"
        class="flex flex-row justify-between
        w-full mb-[40px] m:mb-4"
      >
        <UFormGroup name="hostResidence" class="d:pr-4 flex-grow" :error="hostResidenceError">
          <USelect
            v-model="hostResidenceComputed"
            :placeholder="t('createAccount.propertyForm.hostResidence')"
            :options="hostResidenceOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */"
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
        <UFormGroup name="propertyType" class="d:pr-4 flex-grow" :error="propertyTypeError">
          <USelect
            v-model="propertyType"
            :placeholder="t('createAccount.propertyForm.propertyType')"
            :options="propertyTypes"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */"
            @blur="emit('validateProperty')"
            @change="emit('validateProperty')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="ownershipType" class="d:pr-4 flex-grow" :error="ownershipTypeError">
          <USelect
            v-model="ownershipType"
            :placeholder="t('createAccount.propertyForm.ownershipType')"
            :options="ownershipTypes"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */"
            @blur="emit('validateOwnership')"
            @change="emit('validateOwnership')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] m:mb-4">
        <UFormGroup name="parcelIdentifier" class="d:pr-4 flex-grow">
          <UInput
            v-model="parcelIdentifier"
            aria-label="parcel identifier"
            :placeholder="t('createAccount.propertyForm.parcelIdentifier')"
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
        <UFormGroup name="businessLicenseExpiryDate" class="d:pr-4 flex-grow" :error="businessLicenseExpiryDateError">
          <UInput
            v-model="businessLicenseExpiryDate"
            :placeholder="t('createAccount.propertyForm.businessLicenseExpiryDate')"
            type="date"
            :min="new Date().toISOString().split('T')[0]"
            :max="new Date('2999-12-31').toISOString().split('T')[0]"
            :ui="{ base: 'uppercase' }"
            @input="emit('resetFieldError', ['businessLicenseExpiryDate'])"
            @blur="emit('validateBusinessLicenseExpiryDate')"
            @change="emit('validateBusinessLicenseExpiryDate')"
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
  propertyTypes,
  ownershipTypes,
  ownershipTypeError,
  propertyTypeError,
  principalResidenceError,
  hostResidenceError,
  numberOfRoomsForRentError,
  businessLicenseExpiryDateError
} = defineProps<{
  propertyTypes: string[],
  ownershipTypes: string[],
  ownershipTypeError: string,
  propertyTypeError: string,
  rentalUnitSpaceTypeError: string,
  principalResidenceError: string,
  hostResidenceError: string,
  numberOfRoomsForRentError: string,
  businessLicenseExpiryDateError: string
}>()

const emit = defineEmits([
  'validateOwnership',
  'validateProperty',
  'validateBusinessLicenseExpiryDate',
  'validateRentalUnitSpaceType',
  'validateIsUnitOnPrincipalResidenceProperty',
  'validatePrincipalResidenceOptions',
  'validateHostResidence',
  'validateNumberOfRoomsForRent',
  'resetFieldError'
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
    formState.propertyDetails.hostResidence = value || null // Set to null if empty
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
