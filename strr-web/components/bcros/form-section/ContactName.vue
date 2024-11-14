<template>
  <div data-test-id="form-section-contact-name">
    <BcrosFormSection :title="t('common.formLabels.contactName')">
      <p
        v-if="contactInfoDescription"
        class="mb-10 text-sm text-bcGovColor-darkGray"
      >
        {{ contactInfoDescription }}
      </p>
      <div class="flex flex-row justify-between w-full mb-10 m:flex-col m:mb-4">
        <UFormGroup
          name="firstName"
          class="d:pr-4 flex-grow m:mb-4"
          :error="errors.firstName"
        >
          <UInput
            v-model="firstName"
            :placeholder="t('createAccount.contactForm.firstName')"
            data-test-id="contact-first-name-input"
            @input="emit('resetFieldError', 'firstName')"
            @blur="emit('validateField', 'firstName')"
            @change="emit('validateField', 'firstName')"
          />
        </UFormGroup>
        <UFormGroup name="middleName" class="d:pr-4 flex-grow m:mb-4" :error="errors.middleName">
          <UInput
            v-model="middleName"
            :placeholder="t('createAccount.contactForm.middleName')"
            data-test-id="contact-middle-name-input"
            @input="emit('resetFieldError', 'middleName')"
            @blur="emit('validateField', 'middleName')"
            @change="emit('validateField', 'middleName')"
          />
        </UFormGroup>
        <UFormGroup name="lastName" class="flex-grow m:mb-4" :error="errors.lastName">
          <UInput
            v-model="lastName"
            :placeholder="t('createAccount.contactForm.lastName')"
            data-test-id="contact-last-name-input"
            @input="emit('resetFieldError', 'lastName')"
            @blur="emit('validateField', 'lastName')"
            @change="emit('validateField', 'lastName')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-10 m:mb-4">
        <UFormGroup name="preferredName" class=" flex-grow" :error="errors.preferredName">
          <UInput
            v-model="preferredName"
            type="name"
            :placeholder="t('createAccount.contactForm.preferredName')"
            data-test-id="property-manager-preferred-name-input"
            @input="emit('resetFieldError', 'preferredName')"
            @blur="emit('validateField', 'preferredName')"
            @change="emit('validateField', 'preferredName')"
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

const { errors = {} } = defineProps<{
  contactInfoDescription?: string,
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  validateField: [field: string]
  resetFieldError: [field: keyof typeof errors]
}>()

</script>
