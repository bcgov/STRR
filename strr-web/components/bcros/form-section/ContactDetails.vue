<template>
  <div data-test-id="form-section-contact-details">
    <BcrosFormSection :title="t('createAccount.contactForm.contactDetails')">
      <div class="flex flex-row justify-between w-full mb-10 m:flex-col m:mb-4">
        <UFormGroup name="phoneNumber" class="d:pr-4 flex-grow m:mb-4" :error="errors.phoneNumber">
          <UInput
            v-model="phoneNumber"
            type="tel"
            :placeholder="t('createAccount.contactForm.phoneNumber')"
            data-test-id="phone-number"
            @input="emit('resetFieldError', 'phoneNumber')"
            @blur="emit('validateField', 'phoneNumber')"
            @change="emit('validateField', 'phoneNumber')"
          />
        </UFormGroup>
        <UFormGroup name="extension" class="flex-grow" :error="errors.extension">
          <UInput
            v-model="extension"
            :placeholder="t('createAccount.contactForm.extension')"
            data-test-id="extension"
            @input="emit('resetFieldError', 'extension')"
            @blur="emit('validateField', 'extension')"
            @change="emit('validateField', 'extension')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-10 m:mb-4">
        <UFormGroup name="faxNumber" class="flex-grow" :error="errors.faxNumber">
          <UInput
            v-model="faxNumber"
            type="tel"
            :placeholder="t('createAccount.contactForm.faxNumber')"
            data-test-id="fax-number"
            @input="emit('resetFieldError', 'faxNumber')"
            @blur="emit('validateField', 'faxNumber')"
            @change="emit('validateField', 'faxNumber')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-10 m:mb-4">
        <UFormGroup type="email" name="emailAddress" class="flex-grow" :error="errors.emailAddress">
          <UInput
            v-model="emailAddress"
            :placeholder="t('createAccount.contactForm.emailAddress')"
            data-test-id="email-address"
            @input="emit('resetFieldError', 'emailAddress')"
            @blur="emit('validateField', 'emailAddress')"
            @change="emit('validateField', 'emailAddress')"
          />
        </UFormGroup>
      </div>
      <div class="mb-10 m:flex-col m:mb-4">
        <BcrosAlertsMessage :flavour="AlertsFlavourE.INFO">
          <p>
            <b>{{ t('createAccount.contactForm.boldWarning') }}</b>
            {{ t('createAccount.contactForm.warning') }}
          </p>
        </BcrosAlertsMessage>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()

const { errors = {} } = defineProps<{
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  validateField: [field: string]
  resetFieldError: [field: keyof typeof errors]
}>()

const phoneNumber = defineModel<string>('phoneNumber')
const extension = defineModel<string>('extension')
const faxNumber = defineModel<string>('faxNumber')
const emailAddress = defineModel<string>('emailAddress')
</script>
