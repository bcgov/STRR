<template>
  <div data-test-id="property-manager-business-details" class="with-divider">
    <BcrosFormSection :title="t('createAccount.propertyManagerForm.businessDetails')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="businessName" class="flex-grow" :error="errors.businessLegalName">
          <UInput
            v-model="businessName"
            type="text"
            :placeholder="t('createAccount.propertyManagerForm.businessName')"
            data-test-id="property-manager-business-name-input"
            @input="emit('resetFieldError', 'businessLegalName')"
            @blur="emit('validateField', 'businessLegalName')"
            @change="emit('validateField', 'businessLegalName')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="businessNumber" class="flex-grow" :error="errors.businessNumber">
          <UInput
            v-model="businessNumber"
            type="text"
            :placeholder="t('createAccount.propertyManagerForm.businessNumber')"
            data-test-id="property-manager-business-number-input"
            @input="emit('resetFieldError', 'businessNumber')"
            @blur="emit('validateField', 'businessNumber')"
            @change="emit('validateField', 'businessNumber')"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()

const businessName = defineModel<string>('businessName')
const businessNumber = defineModel<string>('businessNumber')
const emit = defineEmits<{
    validateField: [field: string]
    resetFieldError: [field: string]
}>()

const { errors = {} } = defineProps<{
  errors: Record<string, string>
}>()
</script>
