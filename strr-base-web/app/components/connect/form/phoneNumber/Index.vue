<script setup lang="ts">
const countryIso2 = defineModel<string>('countryIso2')
const countryCode = defineModel<string>('countryCode')
const number = defineModel<string>('number')
const extension = defineModel<string>('extension')

defineProps({ name: { type: String, default: 'phone' } })

const northAmericaMask = '(###) ###-####'
const otherMask = '##############'
const inputMask = computed(() => countryCode.value === '1' ? northAmericaMask : otherMask)
const maskedValue = ref<string>(number.value || '')
watch(number, (val) => {
  maskedValue.value = val || ''
})

const phoneId = useId()

defineExpose({ number })
</script>
<template>
  <div class="max-w-bcGovInput flex w-full flex-col gap-3 sm:flex-row">
    <UFormGroup :name="name + '.countryCode'" class="grow sm:max-w-[130px]">
      <template #default="{ error }">
        <ConnectFormPhoneNumberCountryCode
          v-model:country-calling-code="countryCode"
          v-model:country-iso2="countryIso2"
          :aria-label="$t('label.phone.countryCode')"
          :placeholder="$t('label.phone.countryCode')"
          :is-invalid="error !== undefined"
          data-testid="phone-countryCode"
          :aria-describedby="`${name}.countryCode-${phoneId}`"
        />
      </template>
      <template #error="{ error }">
        <span :id="`${name}.countryCode-${phoneId}`">
          {{ error }}
        </span>
      </template>
    </UFormGroup>
    <UFormGroup :name="name + '.number'" class="grow">
      <template #default="{ error }">
        <UInput
          v-model="maskedValue"
          v-maska:number.unmasked="inputMask"
          :aria-label="$t('label.phone.number')"
          :color="number ? 'primary' : 'gray'"
          :placeholder="$t('label.phone.number')"
          :aria-required="true"
          :aria-invalid="error !== undefined"
          :aria-describedby="`${name}.number-${phoneId}`"
          size="lg"
          type="tel"
          data-testid="phone-number"
        />
      </template>
      <template #error="{ error }">
        <span :id="`${name}.number-${phoneId}`">
          {{ error }}
        </span>
      </template>
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
