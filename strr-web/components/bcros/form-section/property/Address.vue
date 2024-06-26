<template>
  <div data-cy="form-section-contact-info">
    <BcrosFormSection :title="t('create-account.property-form.rentalUnitAddress')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="nickname" class="pr-[16px] flex-grow">
          <UInput v-model="nickname" aria-label="nickname" :placeholder="t('create-account.property-form.nickname')" />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="useMailing" class="pr-[16px] flex-grow mobile:text-[16px]">
          <UCheckbox
            v-model="useMailing"
            aria-label="use mailing address"
            :label="t('create-account.property-form.useMailing')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="country" class="pr-[16px] flex-grow">
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
        <UFormGroup name="Address" class="pr-[16px] flex-grow">
          <UInput
            :id="id"
            v-model="address"
            :placeholder="t('create-account.contact-form.address')"
            aria-label="address"
            @keypress.once="addressComplete()"
            @click="addressComplete()"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="AddressLineTwo" class="pr-[16px] flex-grow">
          <UInput
            v-model="addressLineTwo"
            aria-label="address line two"
            :placeholder="t('create-account.contact-form.addressLineTwo')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="city" class="pr-[16px] flex-grow mobile:mb-[16px]">
          <UInput v-model="city" aria-label="city" :placeholder="t('create-account.contact-form.city')" />
        </UFormGroup>
        <UFormGroup
          name="province"
          class="pr-[16px] flex-grow mobile:mb-[16px]"
          :error="addressNotInBC ? 'Address must be in BC' :''"
        >
          <UInput
            v-model="province"
            aria-label="province"
            :placeholder="t('create-account.contact-form.province')"
            disabled
          />
        </UFormGroup>
        <UFormGroup name="postalCode" class="pr-[16px] flex-grow mobile:mb-[16px]">
          <UInput
            v-model="postalCode"
            aria-label="postal code"
            :placeholder="t('create-account.contact-form.postalCode')"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
import { CountryItem } from '@/interfaces/address-i'
import countries from '@/utils/countries.json'
const t = useNuxtApp().$i18n.t

const country = defineModel<string>('country')
const address = defineModel<string>('address')
const addressLineTwo = defineModel<string>('addressLineTwo')
const city = defineModel<string>('city')
const province = defineModel<string>('province')
const postalCode = defineModel<string>('postalCode')
const useMailing = defineModel<string>('useMailing')
const nickname = defineModel<string>('nickname')
const countryItems = ref<CountryItem[]>([])

const addressComplete = () => {
  if (typeof country.value === 'string') {
    enableAddressComplete(id, 'CA', false)
  }
}

const {
  id,
  defaultCountryIso2,
  enableAddressComplete,
  addressNotInBC
} = defineProps<{
  id: string,
  defaultCountryIso2: string,
  enableAddressComplete:(id: string, countryIso2: string, countrySelect: boolean) => void,
  addressNotInBC?: boolean
}>()

country.value = defaultCountryIso2

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
