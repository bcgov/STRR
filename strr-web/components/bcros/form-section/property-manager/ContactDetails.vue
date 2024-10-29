<template>
  <div data-test-id="property-manager-contact-details" class="desktop:mx-[25px]">
    <BcrosFormSection :title="t('createAccount.propertyManagerForm.contactDetails')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup
          name="phoneNumber"
          class="desktop:d:pr-[16px] flex-grow mobile:mb-[16px]"
          :error="errors.phoneNumber"
        >
          <UInput
            v-model="phoneNumber"
            type="tel"
            :placeholder="t('createAccount.propertyManagerForm.phoneNumber')"
            data-test-id="property-manager-phone-number"
            @input="emit('resetFieldError', 'phoneNumber')"
            @blur="emit('validateField', 'phoneNumber')"
            @change="emit('validateField', 'phoneNumber')"
          />
        </UFormGroup>
        <UFormGroup name="extension" class="flex-grow" :error="errors.extension">
          <UInput
            v-model="extension"
            :placeholder="t('createAccount.propertyManagerForm.extension')"
            data-test-id="property-manager-extension"
            @input="emit('resetFieldError', 'extension')"
            @blur="emit('validateField', 'extension')"
            @change="emit('validateField', 'extension')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="faxNumber" class="flex-grow" :error="errors.faxNumber">
          <UInput
            v-model="faxNumber"
            type="tel"
            :placeholder="t('createAccount.propertyManagerForm.faxNumber')"
            data-test-id="property-manager-fax-number"
            @input="emit('resetFieldError', 'faxNumber')"
            @blur="emit('validateField', 'faxNumber')"
            @change="emit('validateField', 'faxNumber')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup
          type="email"
          name="emailAddress"
          class="flex-grow"
          :error="errors.emailAddress"
        >
          <UInput
            v-model="emailAddress"
            :placeholder="t('createAccount.propertyManagerForm.emailAddress')"
            data-test-id="property-manager-email-address"
            @input="emit('resetFieldError', 'emailAddress')"
            @blur="emit('validateField', 'emailAddress')"
            @change="emit('validateField', 'emailAddress')"
          />
        </UFormGroup>
      </div>
      <div class="mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <BcrosAlertsMessage :flavour="AlertsFlavourE.INFO">
          <p>
            <b>{{ t('createAccount.propertyManagerForm.boldWarning') }}</b>
            {{ t('createAccount.propertyManagerForm.warning') }}
          </p>
        </BcrosAlertsMessage>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()

const emit = defineEmits<{
    validateField: [field: string]
    resetFieldError: [field: string]
}>()

const { errors = {} } = defineProps<{
  errors: Record<string, string>
}>()

const phoneNumber = defineModel<string>('phoneNumber')
const extension = defineModel<string>('extension')
const faxNumber = defineModel<string>('faxNumber')
const emailAddress = defineModel<string>('emailAddress')
</script>
