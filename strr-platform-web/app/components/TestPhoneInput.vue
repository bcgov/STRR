<script setup lang="ts">
import { z } from 'zod'
import { AsYouType, parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js'

const state = reactive({
  countryIso2: 'CA',
  countryCode: '1',
  number: ''
})

const getSchema = () =>
  z.object({
    countryIso2: z.string(),
    countryCode: z.string(),
    number: z
      .string()
      .refine(
        (num) => {
          try {
            const phoneNumber = parsePhoneNumberWithError(num, state.countryIso2 as CountryCode)
            console.info(`is ${phoneNumber.nationalNumber} valid: `, phoneNumber.isValid())
            return phoneNumber.isValid()
          } catch {
            return false
          }
        },
        {
          message: 'Invalid phone number for the selected country'
        }
      )
  })

watch(() => state, (state) => {
  const formatter = new AsYouType(state.countryIso2 as CountryCode)
  state.number = formatter.input(state.number)

  try {
    const phoneNumber = parsePhoneNumberWithError(state.number, state.countryIso2 as CountryCode)
    console.info('parsed: ', phoneNumber)
  } catch (error) {
    // @ts-expect-error
    console.error('Invalid phone number:', error.message)
  }
}, { immediate: true, deep: true })
</script>
<template>
  <UForm
    :state="state"
    :schema="getSchema()"
    class="space-y-6 border border-black bg-white"
    @submit="() => console.log('submitting: ', state)"
  >
    <div class="max-w-bcGovInput flex w-full flex-col gap-3 sm:flex-row">
      <UFormGroup name="countryCode" class="grow sm:max-w-[130px]">
        <ConnectFormPhoneNumberCountryCode
          v-model:country-calling-code="state.countryCode"
          v-model:country-iso2="state.countryIso2"
          :aria-label="$t('label.phone.countryCode')"
          :placeholder="$t('label.phone.countryCode')"
          :is-invalid="undefined"
        />
      </UFormGroup>
      <UFormGroup name="number" class="grow">
        <UInput
          v-model="state.number"
          :aria-label="$t('label.phone.number')"
          :color="state.number ? 'primary' : 'gray'"
          :placeholder="$t('label.phone.number')"
          size="lg"
          type="tel"
        />
      </UFormGroup>
    </div>
    <UButton
      type="submit"
      label="submit"
    />
  </UForm>
</template>
