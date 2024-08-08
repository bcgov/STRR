<template>
  <div data-cy="property-details">
    <BcrosFormSection :title="t('createAccount.propertyForm.rentalUnitDetails')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="parcelIdentifier" class="d:pr-[16px] flex-grow">
          <UInput
            v-model="parcelIdentifier"
            aria-label="parcel identifier"
            :placeholder="t('createAccount.propertyForm.parcelIdentifier')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="businessLicense" class="d:pr-[16px] flex-grow">
          <UInput
            v-model="businessLicense"
            aria-label="business license"
            :placeholder="t('createAccount.propertyForm.businessLicense')"
          />
        </UFormGroup>
      </div>
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
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="ownershipType" class="d:pr-[16px] flex-grow" :error="ownershipTypeError">
          <USelect
            v-model="ownershipType"
            aria-label="ownership types"
            :placeholder="t('createAccount.propertyForm.ownershipType')"
            :options="ownershipTypes"
            option-attribute="name"
            class="w-full"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            :error="ownershipTypeError"
            @blur="emit('validateOwnership')"
            @change="emit('validateOwnership')"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">

const t = useNuxtApp().$i18n.t

const propertyType = defineModel<string>('propertyType')
const ownershipType = defineModel<string>('ownershipType')
const businessLicense = defineModel<string>('businessLicense')
const parcelIdentifier = defineModel<string>('parcelIdentifier')

const emit = defineEmits(['validateOwnership', 'validateProperty'])

const {
  propertyTypes,
  ownershipTypes,
  ownershipTypeError,
  propertyTypeError
} = defineProps<{
  propertyTypes: string[],
  ownershipTypes: string[],
  ownershipTypeError: string,
  propertyTypeError: string
}>()
</script>
