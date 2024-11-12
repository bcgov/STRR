<template>
  <div data-test-id="form-section-address">
    <BcrosFormSection :title="t('createAccount.propertyForm.rentalUnitAddress')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup
          name="nickname"
          class="d:pr-[16px] flex-grow"
          :help="t('createAccount.propertyForm.nicknameHelp')"
        >
          <UInput v-model="nickname" aria-label="nickname" :placeholder="t('createAccount.propertyForm.nickname')" />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="country" class="d:pr-[16px] flex-grow">
          <USelect
            v-model="country"
            :options="countryItems"
            option-attribute="name"
            class="w-full"
            aria-label="country"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup
          name="streetNumber"
          class="d:pr-[16px] flex-grow"
          :error="errors.streetNumber"
        >
          <UInput
            :id="streetNumberId"
            v-model="streetNumber"
            :aria-label="t('createAccount.contactForm.streetNumber')"
            :placeholder="t('createAccount.contactForm.streetNumber')"
            @input="
              onAddressInput(false); emit('resetFieldError', [
                'streetNumber', 'streetName', 'city', 'province', 'postalCode'
              ])
            "
            @click="addressComplete(false)"
            @blur="emit('validateStreetNumber')"
            @change="emit('validateStreetNumber')"
          />
        </UFormGroup>
        <UFormGroup
          name="streetName"
          class="d:pr-[16px] flex-grow"
          :error="errors.streetName"
        >
          <UInput
            :id="streetNameId"
            v-model="streetName"
            :aria-label="t('createAccount.contactForm.streetName')"
            :placeholder="t('createAccount.contactForm.streetName')"
            @input="
              onAddressInput(true); emit('resetFieldError', [
                'streetNumber', 'streetName', 'city', 'province', 'postalCode'
              ])
            "
            @click="addressComplete(true)"
            @blur="emit('validateStreetName')"
            @change="emit('validateStreetName')"
          />
        </UFormGroup>
        <UFormGroup
          name="unitNumber"
          class="d:pr-[16px] flex-grow"
          :error="errors.unitNumber"
        >
          <UInput
            v-model="unitNumber"
            :aria-label="t('createAccount.contactForm.unitNumberRequired')"
            :placeholder="unitNumberPlaceholder"
            @input="emit('resetFieldError', ['unitNumber'])"
            @blur="emit('validateUnitNumber')"
            @change="emit('validateUnitNumber')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup
          name="AddressLineTwo"
          class="d:pr-[16px] flex-grow"
          :error="errors.addressLineTwo"
        >
          <UInput
            v-model="addressLineTwo"
            aria-label="address line two"
            :placeholder="t('createAccount.contactForm.addressLineTwo')"
            @blur="emit('validateAddressLineTwo')"
            @change="emit('validateAddressLineTwo')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup
          name="city"
          class="d:pr-[16px] flex-grow mobile:mb-[16px]"
          :error="errors.city"
        >
          <UInput
            v-model="city"
            aria-label="city"
            :placeholder="t('createAccount.contactForm.city')"
            @input="emit('resetFieldError', ['city'])"
            @blur="emit('validateCity')"
            @change="emit('validateCity')"
          />
        </UFormGroup>
        <UFormGroup
          name="province"
          class="d:pr-[16px] flex-grow mobile:mb-[16px]"
          :error="errors.addressNotInBC"
        >
          <UInput
            v-model="province"
            aria-label="province"
            :placeholder="t('createAccount.contactForm.province')"
            disabled
            @input="emit('resetFieldError', ['province'])"
            @blur="emit('validateProvince')"
            @change="emit('validateProvince')"
          />
        </UFormGroup>
        <UFormGroup
          name="postalCode"
          class="d:pr-[16px] flex-grow mobile:mb-[16px]"
          :error="errors.postalCode"
        >
          <UInput
            v-model="postalCode"
            aria-label="postal code"
            :placeholder="t('createAccount.contactForm.postalCode')"
            @input="emit('resetFieldError', ['postalCode'])"
            @blur="emit('validatePostalCode')"
            @change="emit('validatePostalCode')"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
import { CountryItem } from '@/interfaces/address-i'
import { PropertyTypeEnglishTranslationMapE } from '@/enums/property-type-map-e'
import countries from '@/utils/countries.json'
const { t } = useTranslation()
const unitNumberPlaceholder = ref('')

const country = defineModel<string>('country')
const streetNumber = defineModel<string>('streetNumber')
const streetName = defineModel<string>('streetName')
const unitNumber = defineModel<string>('unitNumber')
const addressLineTwo = defineModel<string>('addressLineTwo')
const city = defineModel<string>('city')
const province = defineModel<string>('province')
const postalCode = defineModel<string>('postalCode')
const nickname = defineModel<string>('nickname')
const countryItems = ref<CountryItem[]>([])

const addressComplete = (initiatedFromStreetName: boolean) => {
  if (typeof country.value === 'string') {
    if (initiatedFromStreetName) {
      enableAddressComplete(streetNameId, 'CA', false, 'BC')
    } else {
      enableAddressComplete(streetNumberId, 'CA', false, 'BC')
    }
  }
}

const onAddressInput = (initiatedFromStreetName: boolean) => {
  if (!initiatedFromStreetName) {
    streetName.value = ''
  }
  unitNumber.value = ''
  addressLineTwo.value = ''
  city.value = ''
  postalCode.value = ''
  addressComplete(initiatedFromStreetName)
}

const {
  streetNumberId,
  streetNameId,
  defaultCountryIso2,
  enableAddressComplete,
  errors = {}
} = defineProps<{
  streetNumberId: string,
  streetNameId: string,
  defaultCountryIso2: string,
  enableAddressComplete:(id: string, countryIso2: string, countrySelect: boolean, province?: string) => void,
  errors: Record<string, string>
}>()

const emit = defineEmits([
  'validateStreetNumber',
  'validateStreetName',
  'validateUnitNumber',
  'validateAddressLineTwo',
  'validateCity',
  'validatePostalCode',
  'validateProvince',
  'resetFieldError'
])

country.value = defaultCountryIso2

const getUnitNumberPlaceholder = (propertyType?: string) => {
  if (!propertyType) {
    return t('createAccount.contactForm.unitNumberOptional')
  }
  switch (propertyType) {
    case PropertyTypeEnglishTranslationMapE.SECONDARY_SUITE:
    case PropertyTypeEnglishTranslationMapE.ACCESSORY_DWELLING:
    case PropertyTypeEnglishTranslationMapE.TOWN_HOME:
    case PropertyTypeEnglishTranslationMapE.MULTI_UNIT_HOUSING:
    case PropertyTypeEnglishTranslationMapE.CONDO_OR_APT:
    case PropertyTypeEnglishTranslationMapE.STRATA_HOTEL:
      return t('createAccount.contactForm.unitNumberRequired')
    default:
      return t('createAccount.contactForm.unitNumberOptional')
  }
}

unitNumberPlaceholder.value = getUnitNumberPlaceholder(formState.propertyDetails.propertyType)

watch(() => formState.propertyDetails.propertyType, (newType) => {
  unitNumberPlaceholder.value = getUnitNumberPlaceholder(newType)
})

// Rental addresses for registration can only be in Canada
onMounted(() => {
  countryItems.value = countries
    .filter(country => country.iso2 === 'CA')
    .map(country => ({
      value: country.iso2,
      name: country.en
    }))
})

</script>
