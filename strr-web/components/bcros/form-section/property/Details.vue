<template>
  <div data-test-id="property-details">
    <BcrosFormSection :title="t('createAccount.propertyForm.rentalUnitDetails')">
      <!-- Parcel Identifier Field -->
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
                :popper="{ placement: 'right', arrow: true }"
              >
                <UIcon class="text-xl bg-bcGovColor-activeBlue" name="i-mdi-information-outline" />
              </BcrosTooltip>
            </div>
          </template>
        </UFormGroup>
      </div>

      <!-- Business License Field -->
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

      <!-- Business License Expiry Date Field -->
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

      <!-- Property Type Dropdown -->
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="propertyType" class="d:pr-[16px] flex-grow" :error="propertyTypeError">
          <USelect
            v-model="propertyType"
            aria-label="property types"
            :placeholder="t('createAccount.propertyForm.propertyType')"
            :options="propertyTypes"
            option-attribute="name"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @blur="emit('validateProperty')"
            @change="emit('validateProperty')"
          />
        </UFormGroup>
      </div>

      <!-- Ownership Type Dropdown -->
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="ownershipType" class="d:pr-[16px] flex-grow" :error="ownershipTypeError">
          <USelect
            v-model="ownershipType"
            aria-label="ownership types"
            :placeholder="t('createAccount.propertyForm.ownershipType')"
            :options="ownershipTypes"
            option-attribute="name"
            class="w-full"
            :error="ownershipTypeError"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @blur="emit('validateOwnership')"
            @change="emit('validateOwnership')"
          />
        </UFormGroup>
      </div>

      <!-- Type of Space Dropdown -->
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="typeOfSpace" class="d:pr-[16px] flex-grow" :error="typeOfSpaceError">
          <USelect
            v-model="typeOfSpace"
            aria-label="type of space"
            :placeholder="t('createAccount.propertyForm.typeOfSpace')"
            :options="typeOfSpaceOptions"
            option-attribute="name"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @blur="emit('validateTypeOfSpace')"
            @change="emit('validateTypeOfSpace')"
          />
        </UFormGroup>
      </div>
      <!-- Is Rental Unit on the Same Property as Principal Residence? Dropdown -->
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="isOnSameProperty" class="d:pr-[16px] flex-grow">
          <USelect
            v-model="isOnSameProperty"
            aria-label="is on same property"
            :placeholder="t('createAccount.propertyForm.isOnSameProperty')"
            :options="isOnSamePropertyOptions"
            option-attribute="name"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            @change="handleIsOnSamePropertyChange"
          />
        </UFormGroup>
      </div>

      <!-- Number of Rooms for Rent (conditionally displayed) -->
      <div v-if="isOnSameProperty === 'Yes'" class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="numberOfRooms" class="d:pr-[16px] flex-grow">
          <div class="flex items-center">
            <span class="mr-[8px]">{{ t('createAccount.propertyForm.numberOfRoomsForRent') }}</span>
            <div class="flex items-center">
              <button @click="decrementRooms" class="px-2 py-1 border border-gray-300 rounded">-</button>
              <span class="px-4">{{ numberOfRooms }}</span>
              <button @click="incrementRooms" class="px-2 py-1 border border-gray-300 rounded">+</button>
            </div>
          </div>
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">

const { t } = useTranslation()

// Define models for each form field
const propertyType = defineModel<string>('propertyType')
const ownershipType = defineModel<string>('ownershipType')
const businessLicense = defineModel<string>('businessLicense')
const parcelIdentifier = defineModel<string>('parcelIdentifier')
const businessLicenseExpiryDate = defineModel<string>('businessLicenseExpiryDate')
const typeOfSpace = defineModel<string>('typeOfSpace')
const isOnSameProperty = defineModel<string>('isOnSameProperty')
const numberOfRooms = ref<number>(1)

// Watch for changes in businessLicense to clear expiry date if necessary
watch(businessLicense, (): void => {
  if (!businessLicense.value) {
    formState.propertyDetails.businessLicenseExpiryDate = ''
  }
})

// Function to handle dropdown change for "isOnSameProperty"
const handleIsOnSamePropertyChange = () => {
  if (isOnSameProperty.value === 'No') {
    numberOfRooms.value = 0
  } else if (isOnSameProperty.value === 'Yes') {
    numberOfRooms.value = 1
  }
}

// Increment and decrement room count
const incrementRooms = () => {
  numberOfRooms.value++
}

const decrementRooms = () => {
  if (numberOfRooms.value > 1) {
    numberOfRooms.value--
  }
}

// Emit events for validation
const emit = defineEmits([
  'validateOwnership',
  'validateProperty',
  'validateBusinessLicenseExpiryDate',
  'validateTypeOfSpace'
])

const {
  propertyTypes,
  ownershipTypes,
  ownershipTypeError,
  propertyTypeError,
  typeOfSpaceOptions,
  typeOfSpaceError,
  isOnSamePropertyOptions
} = defineProps<{
  propertyTypes: string[],
  ownershipTypes: string[],
  ownershipTypeError: string,
  propertyTypeError: string,
  typeOfSpaceOptions: string[],
  typeOfSpaceError: string,
  isOnSamePropertyOptions: string[]
}>()
</script>
