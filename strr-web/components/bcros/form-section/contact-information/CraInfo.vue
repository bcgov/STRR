<template>
  <div data-cy="form-section-cra-info">
    <BcrosFormSection :title="t('createAccount.contactForm.cra')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
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
      <div class="flex flex-row justify-between w-full mobile:flex-col">
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
const t = useNuxtApp().$i18n.t

const socialInsuranceNumber = defineModel<string>('socialInsuranceNumber')
const businessNumber = defineModel<string>('businessNumber')

const { isPrimary } = defineProps<{ isPrimary: boolean }>()

</script>
