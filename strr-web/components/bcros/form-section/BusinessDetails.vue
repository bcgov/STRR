<template>
  <div data-test-id="form-section-business-details">
    <BcrosFormSection :title="t('common.formLabels.businessDetails')">
      <div class="flex flex-row justify-between w-full mb-10 m:flex-col m:mb-4">
        <UFormGroup name="businessName" class="flex-grow" :error="errors.businessLegalName">
          <UInput
            v-model="businessName"
            type="text"
            :placeholder="isBusinessNameRequired
              ? t('common.formLabels.businessLegalName')
              : t('common.formLabels.businessLegalNameOptional')"
            data-test-id="business-legal-name-input"
            @input="emit('resetFieldError', ['businessLegalName'])"
            @blur="emit('validateField', 'businessLegalName')"
            @change="emit('validateField', 'businessLegalName')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-10 m:flex-col m:mb-4">
        <UFormGroup name="businessNumber" class="flex-grow" :error="errors.businessNumber">
          <UInput
            v-model="businessNumber"
            type="text"
            :placeholder="t('common.formLabels.craBusinessNumberOptional')"
            data-test-id="cra-business-number-input"
            @input="emit('resetFieldError', ['businessNumber'])"
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

const { isBusinessNameRequired = false, errors = {} } = defineProps<{
  isBusinessNameRequired?: boolean,
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  validateField: [field: string]
  resetFieldError: [field: Array<keyof typeof errors>]
}>()
</script>
