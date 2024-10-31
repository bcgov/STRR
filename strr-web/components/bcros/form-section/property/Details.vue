<template>
  <div data-test-id="property-details">
    <BcrosFormSection :title="t('createAccount.propertyForm.rentalUnitDetails')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="rentalUnitSpaceType" class="d:pr-[16px] flex-grow" :error="rentalUnitSpaceTypeError">
          <USelect
            v-model="rentalUnitSpaceType"
            :placeholder="t('createAccount.propertyForm.rentalUnitSpaceType')"
            :options="rentalUnitSpaceTypeOptions"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @blur="emit('validateRentalUnitSpaceType')"
            @change="emit('validateRentalUnitSpaceType')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup
          name="isUnitOnPrincipalResidenceProperty"
          class="d:pr-[16px] flex-grow"
          :error="principalResidenceError"
        >
          <USelect
            v-model="isUnitOnPrincipalResidenceProperty"
            :placeholder="t('createAccount.propertyForm.isUnitOnPrincipalResidenceProperty')"
            :options="principalResidenceOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @blur="emit('validateIsUnitOnPrincipalResidenceProperty')"
            @change="(value) => { isUnitOnPrincipalResidenceProperty = (value === 'true') }"
          />
        </UFormGroup>
      </div>
      <div
        v-if="isUnitOnPrincipalResidenceProperty"
        :key="isUnitOnPrincipalResidenceProperty
          ? 'withDropdown' : 'withoutDropdown'"
        class="flex flex-row justify-between
        w-full mb-[40px] mobile:mb-[16px]"
      >
        <UFormGroup name="hostResidence" class="d:pr-[16px] flex-grow" :error="hostResidenceError">
          <USelect
            v-model="hostResidenceComputed"
            :placeholder="t('createAccount.propertyForm.hostResidence')"
            :options="hostResidenceOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @change="emit('validateHostResidence')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="numberOfRoomsForRent" class="d:pr-[16px] flex-grow" :error="numberOfRoomsForRentError">
          <label class="block mb-2">{{ t('createAccount.propertyForm.numberOfRoomsForRent') }}</label>
          <div class="flex items-center border border-gray-300 rounded-md max-w-[200px]">
            <button
              class="px-2 py-1 border-r border-gray-300 rounded-l-md"
              :disabled="formState.propertyDetails.numberOfRoomsForRent <= 1"
              @click="decrementRooms"
            >
              -
            </button>
            <input
              v-model="formState.propertyDetails.numberOfRoomsForRent"
              type="number"
              class="w-full text-center outline-none border-none"
              :min="1"
              @input="emit('validateNumberOfRoomsForRent')"
              @keydown.enter.prevent
            >
            <button
              class="px-2 py-1 border-l border-gray-300 rounded-r-md"
              @click="incrementRooms"
            >
              +
            </button>
          </div>
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="propertyType" class="d:pr-[16px] flex-grow" :error="propertyTypeError">
          <USelect
            v-model="propertyType"
            :placeholder="t('createAccount.propertyForm.propertyType')"
            :options="propertyTypes"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @blur="emit('validateProperty')"
            @change="emit('validateProperty')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="ownershipType" class="d:pr-[16px] flex-grow" :error="ownershipTypeError">
          <USelect
            v-model="ownershipType"
            :placeholder="t('createAccount.propertyForm.ownershipType')"
            :options="ownershipTypes"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @blur="emit('validateOwnership')"
            @change="emit('validateOwnership')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="parcelIdentifier" class="d:pr-[16px] flex-grow">
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
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="businessLicense" class="d:pr-[16px] flex-grow">
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
      <div v-if="businessLicense" class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="businessLicenseExpiryDate" class="d:pr-[16px] flex-grow">
          <UInput
            v-model="businessLicenseExpiryDate"
            :placeholder="t('createAccount.propertyForm.businessLicenseExpiryDate')"
            type="date"
            :min="new Date().toISOString().split('T')[0]"
            :max="new Date('2999-12-31').toISOString().split('T')[0]"
            :ui="{ base: 'uppercase' }"
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

const decrementRooms = () => {
  if (formState.propertyDetails.numberOfRoomsForRent > 1) {
    formState.propertyDetails.numberOfRoomsForRent--
  }
}

const incrementRooms = () => {
  formState.propertyDetails.numberOfRoomsForRent++
}

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

const emit = defineEmits([
  'validateOwnership',
  'validateProperty',
  'validateBusinessLicenseExpiryDate',
  'validateRentalUnitSpaceType',
  'validateIsUnitOnPrincipalResidenceProperty',
  'validatePrincipalResidenceOptions',
  'validateHostResidence',
  'validateNumberOfRoomsForRent'
])

const hostResidenceComputed = computed({
  get: () => formState.propertyDetails.hostResidence ?? '', // Ensure string return
  set: (value: string) => {
    formState.propertyDetails.hostResidence = value || null // Set to null if empty
  }
})

const {
  propertyTypes,
  ownershipTypes,
  ownershipTypeError,
  propertyTypeError,
  principalResidenceError,
  rentalUnitSpaceTypeOptions,
  principalResidenceOptions,
  hostResidenceOptions,
  hostResidenceError,
  numberOfRoomsForRentError
} = defineProps<{
  propertyTypes: string[],
  ownershipTypes: string[],
  ownershipTypeError: string,
  propertyTypeError: string,
  rentalUnitSpaceTypeOptions: { value: RentalUnitSpaceTypeE, label: string }[],
  rentalUnitSpaceTypeError: string,
  principalResidenceOptions: { value: boolean, label: string }[],
  principalResidenceError: string,
  hostResidenceOptions: { value: HostResidenceE, label: string }[],
  hostResidenceError: string,
  numberOfRoomsForRentError: string;
}>()
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
