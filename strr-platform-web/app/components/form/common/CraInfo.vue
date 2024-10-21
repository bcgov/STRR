<script setup lang="ts">
const { t } = useI18n()

const socialInsuranceNumber = defineModel<string>('socialInsuranceNumber')
const businessNumber = defineModel<string>('businessNumber')

const { isPrimary } = defineProps<{ isPrimary: boolean }>()

const sinLabel = computed(() => isPrimary
  ? t('createAccount.contactForm.socialInsuranceNumber')
  : t('createAccount.contactForm.socialInsuranceNumberOptional'))

</script>
<template>
  <div class="space-y-5" data-testid="form-section-cra-info">
    <div class="flex w-full max-w-bcGovInput flex-col sm:flex-row">
      <UFormGroup name="socialInsuranceNumber" class="grow">
        <UInput
          v-model="socialInsuranceNumber"
          :color="socialInsuranceNumber ? 'primary' : 'gray'"
          type="text"
          size="lg"
          :aria-label="sinLabel"
          :placeholder="sinLabel"
        />
      </UFormGroup>
    </div>
    <div class="flex w-full max-w-bcGovInput flex-col sm:flex-row">
      <UFormGroup name="businessNumber" class="grow">
        <UInput
          v-model="businessNumber"
          :color="businessNumber ? 'primary' : 'gray'"
          size="lg"
          type="text"
          :aria-label="t('createAccount.contactForm.businessNumber')"
          :placeholder="t('createAccount.contactForm.businessNumber')"
        />
      </UFormGroup>
    </div>
  </div>
</template>
