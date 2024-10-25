<script setup lang="ts">
const countryIso2 = defineModel<string>('countryIso2')
const countryCode = defineModel<string>('countryCode')
const extension = defineModel<string>('extension')

const props = defineProps({
  name: { type: String, default: 'phone' },
  number: { type: String, default: '' }
})

defineEmits(['update:number'])

const northAmericaMask = '(###) ###-####'
const otherMask = '##############'
const inputMask = computed(() => countryCode.value === '1' ? northAmericaMask : otherMask)
const maskedValue = ref<string>(props.number)
const unmaskedValue = ref<string>('')

defineExpose({ unmaskedValue })
</script>
<template>
  <div class="flex w-full max-w-bcGovInput flex-col gap-3 sm:flex-row">
    <UFormGroup :name="name + '.countryCode'" class="grow sm:max-w-[130px]">
      <ConnectFormPhoneNumberCountryCode
        v-model:country-calling-code="countryCode"
        v-model:country-iso2="countryIso2"
        :aria-label="$t('label.phone.countryCode')"
        :placeholder="$t('label.phone.countryCode')"
        data-testid="phone-countryCode"
      />
    </UFormGroup>
    <UFormGroup :name="name + '.number'" class="grow">
      <UInput
        v-model="maskedValue"
        v-maska:unmaskedValue.unmasked="inputMask"
        :aria-label="$t('label.phone.number')"
        :color="number ? 'primary' : 'gray'"
        :placeholder="$t('label.phone.number')"
        size="lg"
        data-testid="phone-number"
        @input="$emit('update:number', unmaskedValue)"
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
