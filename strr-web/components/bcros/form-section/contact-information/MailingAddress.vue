<template>
  <div data-test-id="form-section-mailing">
    <BcrosFormSection :title="t('createAccount.contactForm.mailingAddress')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="country" class="flex-grow">
          <USelect
            v-model="country"
            aria-label="country"
            :options="countryItems"
            option-attribute="name"
            class="w-full"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="address" class="flex-grow">
          <UInput
            :id="id"
            v-model="address"
            aria-label="address"
            :placeholder="t('createAccount.contactForm.address')"
            @keypress.once="addressComplete()"
            @click="addressComplete()"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="addressLineTwo" class="flex-grow">
          <UInput
            v-model="addressLineTwo"
            :placeholder="t('createAccount.contactForm.addressLineTwo')"
            aria-label="address line two"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="city" class="d:pr-[16px] flex-grow mobile:mb-[16px]">
          <UInput v-model="city" :placeholder="t('createAccount.contactForm.city')" aria-label="city" />
        </UFormGroup>
        <UFormGroup name="province" class="d:pr-[16px] flex-grow mobile:mb-[16px]">
          <UInput v-model="province" :placeholder="t('createAccount.contactForm.province')" aria-label="province" />
        </UFormGroup>
        <UFormGroup name="postalCode" class="flex-grow mobile:mb-[16px]">
          <UInput
            v-model="postalCode"
            :placeholder="t('createAccount.contactForm.postalCode')"
            aria-label="postal code"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
import { CountryItem } from '@/interfaces/address-i'
import countries from '@/utils/countries.json'
const { t } = useTranslation()

const country = defineModel<string>('country')
const address = defineModel<string>('address')
const addressLineTwo = defineModel<string>('addressLineTwo')
const city = defineModel<string>('city')
const province = defineModel<string>('province')
const postalCode = defineModel<string>('postalCode')
const countryItems = ref<CountryItem[]>([])

const addressComplete = () => {
  if (typeof country.value === 'string') {
    enableAddressComplete(id, country.value, true)
  }
}

const {
  id,
  defaultCountryIso2,
  enableAddressComplete
} = defineProps<{
  id: string,
  defaultCountryIso2: string,
  enableAddressComplete:(id: string, countryIso2: string, countrySelect: boolean) => void
}>()

onMounted(() => {
  countryItems.value = countries.map(country => ({
    value: country.iso2,
    name: country.en
  }))
})

defineEmits<{
  setId: [id: string]
}>()

country.value = defaultCountryIso2

</script>
