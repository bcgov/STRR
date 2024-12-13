<script setup lang="ts">
import { z } from 'zod'
import { AsYouType, parsePhoneNumberWithError, type CountryCode, validatePhoneNumberLength } from 'libphonenumber-js'

const strictNumber = ref()
const strictTemplate = ref()
const state1 = reactive({
  countryIso2: 'CA',
  countryCode: '1',
  number: ''
})

const notStrictNumber = ref()
const notStrictTemplate = ref()
const state2 = reactive({
  countryIso2: 'CA',
  countryCode: '1',
  number: ''
})

const getSchema1 = () =>
  z.object({
    countryIso2: z.string(),
    countryCode: z.string(),
    number: z
      .string()
      .refine(
        (num) => {
          try {
            const phoneNumber = parsePhoneNumberWithError(num, state1.countryIso2 as CountryCode)
            console.info(`is ${phoneNumber.nationalNumber} valid: `, phoneNumber.isValid())
            return phoneNumber.isValid()
          } catch (error) {
            if (error instanceof Error) {
              console.error('Phone number validation error:', error.message)
            } else {
              console.error('Unknown error occurred during phone validation.')
            }
            return false
          }
        },
        {
          message: 'Invalid phone number for the selected country'
        }
      )
  })

const getSchema2 = () =>
  z.object({
    countryIso2: z.string(),
    countryCode: z.string(),
    number: z
      .string()
      .refine(
        (num) => {
          try {
            const phoneNumber = parsePhoneNumberWithError(num, state2.countryIso2 as CountryCode)
            console.info(`is ${phoneNumber.nationalNumber} possible: `, phoneNumber.isPossible())
            return phoneNumber.isPossible()
          } catch (e) {
            console.log(e.message)
            return false
          }
        },
        {
          message: 'Invalid phone number for the selected country'
        }
      )
  })

watch(() => state1, (state) => {
  const formatter = new AsYouType(state.countryIso2 as CountryCode)
  state.number = formatter.input(state.number)
  strictTemplate.value = formatter.getTemplate()

  try {
    const phoneNumber = parsePhoneNumberWithError(state.number, state.countryIso2 as CountryCode)
    strictNumber.value = phoneNumber
    console.info('parsed strict: ', phoneNumber)
  } catch (error) {
    // @ts-expect-error
    console.error('Invalid strict phone number:', error.message)
  }
}, { immediate: true, deep: true })

watch(() => state2, (state) => {
  const formatter = new AsYouType(state.countryIso2 as CountryCode)
  state.number = formatter.input(state.number)
  notStrictTemplate.value = formatter.getTemplate()

  try {
    const phoneNumber = parsePhoneNumberWithError(state.number, state.countryIso2 as CountryCode)
    notStrictNumber.value = phoneNumber
    console.info('parsed non-strict: ', phoneNumber)
  } catch (error) {
    // @ts-expect-error
    console.error('Invalid non-strict phone number:', error.message)
  }
}, { immediate: true, deep: true })
</script>
<template>
  <div class="flex flex-col gap-4">
    <h2>Strict Check</h2>
    <UForm
      :state="state1"
      :schema="getSchema1()"
      class="space-y-6 border border-black bg-white"
      @submit="() => console.log('submitting: ', state1)"
    >
      <div class="max-w-bcGovInput flex w-full flex-col gap-3 sm:flex-row">
        <UFormGroup name="countryCode" class="grow sm:max-w-[130px]">
          <ConnectFormPhoneNumberCountryCode
            v-model:country-calling-code="state1.countryCode"
            v-model:country-iso2="state1.countryIso2"
            :aria-label="$t('label.phone.countryCode')"
            :placeholder="$t('label.phone.countryCode')"
            :is-invalid="undefined"
          />
        </UFormGroup>
        <UFormGroup name="number" class="grow">
          <UInput
            v-model="state1.number"
            :aria-label="$t('label.phone.number')"
            :color="state1.number ? 'primary' : 'gray'"
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

    <div v-if="strictNumber?.number" class="flex flex-col">
      <span>isValid: {{ strictNumber.isValid() }}</span>
      <span>getType: {{ strictNumber.getType() }}</span>
      <span>getURI: {{ strictNumber.getURI() }}</span>
      <span>formatInternational: {{ strictNumber.formatInternational() }}</span>
      <span>formatNational: {{ strictNumber.formatNational() }}</span>
      <span>validatePhoneNumberLength: {{ validatePhoneNumberLength(state1.number, state1.countryIso2 as CountryCode) }}</span>
      <span>template: {{ strictTemplate }}</span>
      <pre>Parsed number: {{ strictNumber }}</pre>
    </div>

    <h2>Less Strict Check</h2>

    <UForm
      :state="state2"
      :schema="getSchema2()"
      class="space-y-6 border border-black bg-white"
      @submit="() => console.log('submitting: ', state2)"
    >
      <div class="max-w-bcGovInput flex w-full flex-col gap-3 sm:flex-row">
        <UFormGroup name="countryCode" class="grow sm:max-w-[130px]">
          <ConnectFormPhoneNumberCountryCode
            v-model:country-calling-code="state2.countryCode"
            v-model:country-iso2="state2.countryIso2"
            :aria-label="$t('label.phone.countryCode')"
            :placeholder="$t('label.phone.countryCode')"
            :is-invalid="undefined"
          />
        </UFormGroup>
        <UFormGroup name="number" class="grow">
          <UInput
            v-model="state2.number"
            :aria-label="$t('label.phone.number')"
            :color="state2.number ? 'primary' : 'gray'"
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

    <div>
      <div v-if="notStrictNumber?.number" class="flex flex-col">
        <span>isPossible: {{ notStrictNumber.isPossible() }}</span>
        <span>getType: {{ notStrictNumber.getType() }}</span>
        <span>getURI: {{ notStrictNumber.getURI() }}</span>
        <span>formatInternational: {{ notStrictNumber.formatInternational() }}</span>
        <span>formatNational: {{ notStrictNumber.formatNational() }}</span>
        <span>validatePhoneNumberLength: {{ validatePhoneNumberLength(state2.number, state2.countryIso2 as CountryCode) }}</span>
        <span>template: {{ strictTemplate }}</span>
        <pre>Parsed number: {{ notStrictNumber }}</pre>
      </div>
    </div>
  </div>
</template>
