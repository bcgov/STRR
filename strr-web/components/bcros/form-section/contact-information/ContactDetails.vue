<template>
  <div data-test-id="form-section-contact-info">
    <BcrosFormSection :title="t('createAccount.contactForm.contactDetails')">
      <div v-if="!isPrimary" class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="firstName" class="d:pr-[16px] flex-grow mobile:mb-[16px]">
          <UInput v-model="firstName" placeholder="First Name" aria-label="firstName" />
        </UFormGroup>
        <UFormGroup name="middleName" class="d:pr-[16px] flex-grow mobile:mb-[16px]">
          <UInput v-model="middleName" placeholder="Middle Name" aria-label="middleName" />
        </UFormGroup>
        <UFormGroup name="lastName" class="flex-grow mobile:mb-[16px]">
          <UInput
            v-model="lastName"
            placeholder="Last Name"
            aria-label="last name"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="preferredName" class=" flex-grow">
          <UInput
            v-model="preferredName"
            type="name"
            aria-label="preferred name"
            :placeholder="t('createAccount.contactForm.preferredName')"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:flex-col mobile:mb-[16px]">
        <UFormGroup name="phoneNumber" class="desktop:d:pr-[16px] flex-grow mobile:mb-[16px]">
          <UInput
            v-model="phoneNumber"
            type="tel"
            aria-label="phone number"
            :placeholder="t('createAccount.contactForm.phoneNumber')"
          />
        </UFormGroup>
        <UFormGroup name="extension" class="flex-grow">
          <UInput
            v-model="extension"
            :placeholder="t('createAccount.contactForm.extension')"
            aria-label="extension"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup name="faxNumber" class="flex-grow">
          <UInput
            v-model="faxNumber"
            :placeholder="t('createAccount.contactForm.faxNumber')"
            aria-label="fax number"
          />
        </UFormGroup>
      </div>
      <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px]">
        <UFormGroup
          type="email"
          name="emailAddress"
          class="flex-grow"
        >
          <UInput
            v-model="emailAddress"
            :placeholder="t('createAccount.contactForm.emailAddress')"
            aria-label="email address"
          />
        </UFormGroup>
      </div>
      <BcrosAlertsMessage :flavour="AlertsFlavourE.INFO">
        <p>
          <b>{{ t('createAccount.contactForm.boldWarning') }}</b>
          {{ t('createAccount.contactForm.warning') }}
        </p>
      </BcrosAlertsMessage>
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()

const { isPrimary } = defineProps<{
  isPrimary: boolean
}>()

const preferredName = defineModel<string>('preferredName')
const firstName = defineModel<string>('firstName')
const middleName = defineModel<string>('middleName')
const lastName = defineModel<string>('lastName')
const phoneNumber = defineModel<string>('phoneNumber')
const extension = defineModel<string>('extension')
const faxNumber = defineModel<string>('faxNumber')
const emailAddress = defineModel<string>('emailAddress')
</script>
