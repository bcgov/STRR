<template>
  <div data-test-id="property-manager-contact-details">
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
            @input="emit('resetFieldError', 'phoneNumber')"
            @blur="emit('validateField', 'phoneNumber')"
            @change="emit('validateField', 'phoneNumber')"
          />
        </UFormGroup>
        <UFormGroup name="extension" class="flex-grow">
          <UInput
            v-model="extension"
            :placeholder="t('createAccount.propertyManagerForm.extension')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="faxNumber" class="flex-grow">
          <UInput
            v-model="faxNumber"
            :placeholder="t('createAccount.propertyManagerForm.faxNumber')"
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
