<template>
  <div data-test-id="property-manager-business-address">
    <BcrosFormSection :title="t('createAccount.propertyManagerForm.businessMailingAddress')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="country" class="flex-grow">
          <USelect
            v-model="country"
            :options="countryItems"
            option-attribute="name"
            class="w-full"
            data-test-id="property-manager-country-select"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="address" class="flex-grow" :error="errors.address">
          <UInput
            :id="id"
            v-model="address"
            :placeholder="t('createAccount.propertyManagerForm.address')"
            data-test-id="property-manager-address-input"
            @input="onAddressInput"
            @click="addressComplete()"
            @blur="emit('validateField', 'address')"
            @change="emit('validateField', 'address')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="addressLineTwo" class="flex-grow">
          <UInput
            v-model="addressLineTwo"
            :placeholder="t('createAccount.propertyManagerForm.addressLineTwo')"
            data-test-id="property-manager-address-line-two-input"
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
            :placeholder="t('createAccount.propertyManagerForm.city')"
            data-test-id="property-manager-city-input"
            @input="emit('resetFieldError', 'city')"
            @blur="emit('validateField', 'city')"
            @change="emit('validateField', 'city')"
          />
        </UFormGroup>
        <UFormGroup name="province" :error="errors.province" class="d:pr-[16px] flex-grow mobile:mb-[16px]">
          <USelect
            v-if="['CA', 'US'].includes(country)"
            v-model="province"
            :options="provinceItems"
            option-attribute="name"
            :placeholder="t('createAccount.propertyManagerForm.province')"
            data-test-id="property-manager-province-select"
          />
          <UInput
            v-else
            v-model="province"
            :placeholder="t('createAccount.propertyManagerForm.province')"
            data-test-id="property-manager-province-input"
            @input="emit('resetFieldError', 'province')"
            @blur="emit('validateField', 'province')"
            @change="emit('validateField', 'province')"
          />
        </UFormGroup>
        <UFormGroup name="postalCode" :error="errors.postalCode" class="flex-grow mobile:mb-[16px]">
          <UInput
            v-model="postalCode"
            :placeholder="t('createAccount.propertyManagerForm.postalCode')"
            data-test-id="property-manager-postal-code-input"
            @input="emit('resetFieldError', 'postalCode')"
            @blur="emit('validateField', 'postalCode')"
            @change="emit('validateField', 'postalCode')"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
import { CountryItem, ProvinceItem } from '@/interfaces/address-i'
import countries from '@/utils/countries.json'
import provinces from '@/utils/provinces.json'
const { t } = useTranslation()

const country = defineModel<string>('country')
const address = defineModel<string>('address')
const addressLineTwo = defineModel<string>('addressLineTwo')
const city = defineModel<string>('city')
const province = defineModel<string>('province')
const postalCode = defineModel<string>('postalCode')
const countryItems = computed<CountryItem[]>(() =>
  countries.map(country => ({
    value: country.iso2,
    name: country.en
  }))
)
const provinceItems = computed<ProvinceItem[]>(() => {
  if (['CA', 'US'].includes(country.value)) {
    return provinces
      .filter(province => province.country === country.value)
      .map(province => ({
        value: province.code,
        name: province.en
      }))
  }
  return []
})

const addressComplete = () => {
  if (country.value === 'CA' || country.value === 'US') {
    enableAddressComplete(id, country.value, true)
  }
}

const onAddressInput = () => {
  address.value = ''
  province.value = ''
  city.value = ''
  postalCode.value = ''
  emit('resetFieldError', 'address')
  emit('resetFieldError', 'city')
  emit('resetFieldError', 'province')
  emit('resetFieldError', 'postalCode')
  addressComplete()
}

const emit = defineEmits<{
    setId: [id: string]
    validateField: [field: string]
    resetFieldError: [field: string]
}>()

const {
  id,
  defaultCountryIso2,
  enableAddressComplete,
  errors = {}
} = defineProps<{
    id: string,
    defaultCountryIso2: string,
    enableAddressComplete:(id: string, countryIso2: string, countrySelect: boolean) => void,
    errors: Record<string, string>
}>()

country.value = defaultCountryIso2
</script>
