<template>
  <div data-test-id="property-details">
    <BcrosFormSection :title="t('createAccount.propertyForm.rentalUnitDetails')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup
          name="parcelIdentifier"
          class="d:pr-[16px] flex-grow"
        >
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
      <div
        v-if="businessLicense"
        class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]"
      >
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
            :error="ownershipTypeError"
            @blur="emit('validateOwnership')"
            @change="emit('validateOwnership')"
          />
        </UFormGroup>
      </div>
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
        <UFormGroup name="isUnitOnPrincipalResidenceProperty" class="d:pr-[16px] flex-grow">
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
        :key="isUnitOnPrincipalResidenceProperty ? 'withDropdown' : 'withoutDropdown'"
        class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]"
      >
        <UFormGroup name="hostResidence" class="d:pr-[16px] flex-grow">
          <USelect
            v-model="hostResidence"
            :placeholder="t('createAccount.propertyForm.hostResidence')"
            :options="hostResidenceOptions"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
          />
        </UFormGroup>
      </div>
      <UFormGroup name="numberOfRoomsForRent" class="d:pr-[16px] flex-grow">
        <label class="block mb-2">{{ t('createAccount.propertyForm.numberOfRoomsForRent') }}</label>
        <div class="flex items-center border border-gray-300 rounded-md p-2 max-w-[200px]">
          <button
            class="px-2 py-1 border border-gray-300 rounded-l-md"
            :disabled="formState.propertyDetails.numberOfRoomsForRent <= 1"
            @click="decrementRooms"
          >
            -
          </button>
          <span class="flex-grow text-center">{{ formState.propertyDetails.numberOfRoomsForRent }}</span>
          <button
            class="px-2 py-1 border border-gray-300 rounded-r-md"
            @click="incrementRooms"
          >
            +
          </button>
        </div>
      </UFormGroup>
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

const incrementRooms = () => {
  formState.propertyDetails.numberOfRoomsForRent++
}

const decrementRooms = () => {
  formState.propertyDetails.numberOfRoomsForRent--
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
  'validateIsUnitOnPrincipalResidenceProperty'
])

const {
  propertyTypes,
  ownershipTypes,
  ownershipTypeError,
  propertyTypeError,
  rentalUnitSpaceTypeOptions,
  principalResidenceOptions,
  hostResidenceOptions
} = defineProps<{
  propertyTypes: string[],
  ownershipTypes: string[],
  ownershipTypeError: string,
  propertyTypeError: string,
  rentalUnitSpaceTypeOptions: string[],
  rentalUnitSpaceTypeError: string,
  principalResidenceOptions: { value: boolean, label: string }[],
  hostResidenceOptions: { value: string, label: string }[]
}>()
</script>
