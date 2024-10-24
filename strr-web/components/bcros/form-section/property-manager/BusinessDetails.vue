<template>
  <div data-test-id="form-business-details-info" class="with-divider">
    <BcrosFormSection :title="t('createAccount.propertyManagerForm.businessDetails')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="businessName" class="flex-grow">
          <UInput
            v-model="businessName"
            type="text"
            :placeholder="t('createAccount.propertyManagerForm.businessName')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="businessNumber" class="flex-grow">
          <UInput
            v-model="businessNumber"
            type="text"
            :placeholder="t('createAccount.propertyManagerForm.businessNumber')"
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

</script>
