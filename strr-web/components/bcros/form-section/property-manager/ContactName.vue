<template>
  <div data-test-id="property-manager-contact-name" class="with-divider">
    <BcrosFormSection :title="t('createAccount.propertyManagerForm.contactName')">
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="firstName" class="d:pr-[16px] flex-grow mobile:mb-[16px]" :error="errors.firstName">
          <UInput
            v-model="firstName"
            :placeholder="t('createAccount.propertyManagerForm.firstName')"
            @input="emit('resetFieldError', 'firstName')"
            @blur="emit('validateField', 'firstName')"
            @change="emit('validateField', 'firstName')"
          />
        </UFormGroup>
        <UFormGroup name="middleName" class="d:pr-[16px] flex-grow mobile:mb-[16px]">
          <UInput
            v-model="middleName"
            :placeholder="t('createAccount.propertyManagerForm.middleName')"
          />
        </UFormGroup>
        <UFormGroup name="lastName" class="flex-grow mobile:mb-[16px]" :error="errors.lastName">
          <UInput
            v-model="lastName"
            :placeholder="t('createAccount.propertyManagerForm.lastName')"
            @input="emit('resetFieldError', 'lastName')"
            @blur="emit('validateField', 'lastName')"
            @change="emit('validateField', 'lastName')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="preferredName" class=" flex-grow">
          <UInput
            v-model="preferredName"
            type="name"
            :placeholder="t('createAccount.propertyManagerForm.preferredName')"
          />
        </UFormGroup>
      </div>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()

const preferredName = defineModel<string>('preferredName')
const firstName = defineModel<string>('firstName')
const middleName = defineModel<string>('middleName')
const lastName = defineModel<string>('lastName')
const emit = defineEmits<{
    validateField: [field: string]
    resetFieldError: [field: string]
}>()

const { errors = {} } = defineProps<{
  errors: Record<string, string>
}>()
</script>
