<script setup lang="ts">
import { vMaska } from 'maska/vue'

const countryIso2 = defineModel<string>('countryIso2')
const countryCode = defineModel<string>('countryCode')
const number = defineModel<string>('number')
const extension = defineModel<string>('extension')

defineProps({
  name: { type: String, default: 'phone' }
})

const northAmericaMask = '(###) ###-####'
const otherMask = '##############'

const inputMask = computed(() => countryCode.value === '1' ? northAmericaMask : otherMask)

</script>

<template>
  <div class="flex w-full max-w-bcGovInput flex-col gap-3 sm:flex-row">
    <UFormGroup :name="name + '.countryCode'" class="grow sm:max-w-[130px]">
      <ConnectPhoneNumberCountryCode
        v-model:country-calling-code="countryCode"
        v-model:country-iso2="countryIso2"
        :aria-label="$t('label.phone.countryCode')"
        :placeholder="$t('label.phone.countryCode')"
        data-testid="phone-countryCode"
      />
    </UFormGroup>
    <UFormGroup :name="name + '.number'" class="grow">
      <UInput
        v-model="number"
        v-maska="inputMask"
        :aria-label="$t('label.phone.number')"
        :color="number ? 'primary' : 'gray'"
        :placeholder="$t('label.phone.number')"
        size="lg"
        data-testid="phone-number"
      />
    </UFormGroup>
    <UFormGroup :name="name + '.extension'" class="grow sm:max-w-[170px]">
      <UInput
        v-model="extension"
        class="max-w-bcGovInput"
        :aria-label="$t('label.phone.extension')"
        :placeholder="$t('label.phone.extension')"
        size="lg"
        data-testid="phone-extension"
      />
    </UFormGroup>
  </div>
</template>
