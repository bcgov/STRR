<template>
  <div data-test-id="form-section-cra-info">
    <BcrosFormSection :title="t('createAccount.contactForm.cra')">
      <div class="flex mb-10 m:mb-4">
        <UFormGroup name="socialInsuranceNumber" class="flex-grow">
          <UInput
            v-model="socialInsuranceNumber"
            type="text"
            aria-label="social insurance number"
            :placeholder="
              `${isPrimary
                ? t('createAccount.contactForm.socialInsuranceNumber')
                : t('createAccount.contactForm.socialInsuranceNumberOptional')}`
            "
          />
        </UFormGroup>
      </div>
      <div
        v-if="isPrimary"
        class="mb-10 m:mb-4"
      >
        <UFormGroup name="businessLegalName">
          <UInput
            v-model="businessLegalName"
            type="text"
            aria-label="business legal name"
            :placeholder="t('common.formLabels.businessLegalNameOptional')"
          />
        </UFormGroup>
      </div>
      <div class="flex">
        <UFormGroup name="businessNumber" class="flex-grow">
          <UInput
            v-model="businessNumber"
            type="text"
            aria-label="business number"
            :placeholder="t('createAccount.contactForm.businessNumber')"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()

const socialInsuranceNumber = defineModel<string>('socialInsuranceNumber')
const businessLegalName = defineModel<string>('businessLegalName')
const businessNumber = defineModel<string>('businessNumber')

const { isPrimary } = defineProps<{ isPrimary?: boolean }>()

</script>
