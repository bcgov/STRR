<template>
  <div data-test-id="host-information-form" class="relative h-full">
    <UFormGroup name="hostContactType">
      <URadioGroup
        v-model="formState.primaryContact.contactType"
        :legend="t('createAccount.contact.individualOrBusinessQuestion')"
        :options="hostContactTypeOptions"
        :ui="{ legend: 'mb-3 text-md font-bold text-gray-700' }"
        :ui-radio="{
          inner: 'space-y-2',
          label: 'text-md'
        }"
        data-test-id="host-contact-type-radio"
      />
    </UFormGroup>
    <div
      class="d:pr-5 mt-10 bg-white rounded-1"
    >
      <div class="bg-bcGovColor-gray2 d:-mr-5">
        <p class="px-10 py-[15px] font-bold">
          {{ t('createAccount.contact.primary') }}
        </p>
      </div>
      <UForm ref="primaryContactForm" :schema="primaryContactSchema" :state="formState.primaryContact">
        <div
          v-if="!isHostIndividual"
          data-test-id="host-type-business"
        >
          <BcrosFormSectionBusinessDetails
            v-model:business-name="formState.primaryContact.businessLegalName"
            v-model:business-number="formState.primaryContact.businessNumber"
            is-business-name-required
            :errors="primaryContactErrors"
            @reset-field-error="resetFieldError"
            @validate-field="validateField"
          />
          <div class="m:hidden h-[1px] ml-10 mr-5 bg-bcGovGray-300" />
        </div>
        <BcrosFormSectionContactName
          v-model:first-name="formState.primaryContact.firstName"
          v-model:middle-name="formState.primaryContact.middleName"
          v-model:last-name="formState.primaryContact.lastName"
          v-model:preferred-name="formState.primaryContact.preferredName"
          :errors="primaryContactErrors"
          @reset-field-error="resetFieldError"
          @validate-field="validateField"
        />

        <div class="m:hidden h-[1px] ml-10 mr-5 bg-bcGovGray-300" />
        <BcrosFormSectionContactInformationContactInfo
          v-if="isHostIndividual"
          v-model:day="formState.primaryContact.birthDay"
          v-model:month="formState.primaryContact.birthMonth"
          v-model:year="formState.primaryContact.birthYear"
          is-primary
          :errors="primaryContactErrors"
          @reset-field-error="resetFieldError"
          @validate-field="validateField"
        />
        <BcrosFormSectionContactInformationCraInfo
          v-if="isHostIndividual"
          v-model:social-insurance-number="formState.primaryContact.socialInsuranceNumber"
          v-model:business-legal-name="formState.primaryContact.businessLegalName"
          v-model:business-number="formState.primaryContact.businessNumber"
          is-primary
        />
        <BcrosFormSectionContactDetails
          v-model:phone-number="formState.primaryContact.phoneNumber"
          v-model:extension="formState.primaryContact.extension"
          v-model:fax-number="formState.primaryContact.faxNumber"
          v-model:email-address="formState.primaryContact.emailAddress"
          :errors="primaryContactErrors"
          @reset-field-error="resetFieldError"
          @validate-field="validateField"
        />
        <BcrosFormSectionContactInformationMailingAddress
          id="primaryContactAddress"
          v-model:country="formState.primaryContact.country"
          v-model:address="formState.primaryContact.address"
          v-model:address-line-two="formState.primaryContact.addressLineTwo"
          v-model:city="formState.primaryContact.city"
          v-model:province="formState.primaryContact.province"
          v-model:postal-code="formState.primaryContact.postalCode"
          :enable-address-complete="enableAddressComplete"
          default-country-iso2="CA"
        />
      </UForm>
    </div>
    <div v-if="!hasSecondaryContact" class="d:mb-[180px] my-8 m:w-full m:p-1">
      <BcrosButtonsPrimary
        :action="toggleAddSecondary"
        :label="t('createAccount.contact.addSecondaryContact')"
        variant="outline"
        icon="i-mdi-account-plus"
        class-name="m:w-full m:mx-[0px]"
        data-test-id="add-another-contact"
      />
    </div>
    <div v-else>
      <div class="mb-[180px] bg-white rounded-1 mt-8">
        <div class="bg-bcGovColor-gray2 px-10 py-[15px] rounded-t-1 flex flex-row justify-between items-center">
          <p class="font-bold">
            {{ isHostIndividual
              ? t('createAccount.contact.secondaryContactInfo')
              : t('createAccount.contact.backupContactInfo')
            }}
          </p>
          <UButton
            class="p-0 text-base"
            variant="ghost"
            :label="t('createAccount.contact.remove')"
            trailing-icon="i-mdi-remove"
            @click="toggleAddSecondary"
          />
        </div>
        <UForm ref="secondaryContactForm" :schema="secondaryContactSchema" :state="formState.secondaryContact">
          <BcrosFormSectionContactName
            v-model:first-name="formState.secondaryContact.firstName"
            v-model:middle-name="formState.secondaryContact.middleName"
            v-model:last-name="formState.secondaryContact.lastName"
            v-model:preferred-name="formState.secondaryContact.preferredName"
            :contact-info-description="t('createAccount.contact.backupContactInfoDescription')"
            :errors="secondaryContactErrors"
            @reset-field-error="resetFieldErrorSecondary"
            @validate-field="validateFieldSecondary"
          />
          <BcrosFormSectionContactInformationContactInfo
            v-model:day="formState.secondaryContact.birthDay"
            v-model:month="formState.secondaryContact.birthMonth"
            v-model:year="formState.secondaryContact.birthYear"
            :errors="secondaryContactErrors"
            @reset-field-error="resetFieldErrorSecondary"
            @validate-field="validateFieldSecondary"
          />
          <BcrosFormSectionContactInformationCraInfo
            v-model:social-insurance-number="formState.secondaryContact.socialInsuranceNumber"
            v-model:business-number="formState.secondaryContact.businessNumber"
          />
          <BcrosFormSectionContactDetails
            v-model:phone-number="formState.secondaryContact.phoneNumber"
            v-model:extension="formState.secondaryContact.extension"
            v-model:fax-number="formState.secondaryContact.faxNumber"
            v-model:email-address="formState.secondaryContact.emailAddress"
            :errors="secondaryContactErrors"
            @reset-field-error="resetFieldErrorSecondary"
            @validate-field="validateFieldSecondary"
          />
          <BcrosFormSectionContactInformationMailingAddress
            id="secondaryContactAddress"
            v-model:country="formState.secondaryContact.country"
            v-model:address="formState.secondaryContact.address"
            v-model:address-line-two="formState.secondaryContact.addressLineTwo"
            v-model:city="formState.secondaryContact.city"
            v-model:province="formState.secondaryContact.province"
            v-model:postal-code="formState.secondaryContact.postalCode"
            :enable-address-complete="enableAddressComplete"
            default-country-iso2="CA"
            :postal="false"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formState } from '@/stores/strr'
import { HostContactTypeE } from '~/enums/host-contact-type-e'
const { t } = useTranslation()

const {
  hasSecondaryContact,
  toggleAddSecondary,
  isComplete,
  secondFormIsComplete
} = defineProps<{
  hasSecondaryContact: boolean,
  toggleAddSecondary:() => void,
  isComplete: boolean,
  secondFormIsComplete: boolean
}>()

const {
  activeAddressField,
  address: canadaPostAddress,
  enableAddressComplete
} = useCanadaPostAddress()

const { me, currentAccount } = useBcrosAccount()

const primaryContactForm = ref()
const secondaryContactForm = ref()

const primaryContactErrors = reactive<Record<string, string>>({})
const secondaryContactErrors = reactive<Record<string, string>>({})

const hostContactTypeOptions = [
  { value: HostContactTypeE.INDIVIDUAL, label: t('createAccount.contact.individualRadioOption') },
  { value: HostContactTypeE.BUSINESS, label: t('createAccount.contact.businessRadioOption') }
]

const isHostIndividual = computed((): boolean => formState.primaryContact.contactType === HostContactTypeE.INDIVIDUAL)

onMounted(() => {
  if (isComplete) {
    const parsed = primaryContactSchema.safeParse(formState.primaryContact).error?.errors
    parsed?.forEach((error: any) => {
      primaryContactErrors[error.path[0]] = error.message
    })

    if (hasSecondaryContact) {
      const parsed = secondaryContactSchema.safeParse(formState.secondaryContact).error?.errors
      parsed?.forEach((error: any) => {
        secondaryContactErrors[error.path[0]] = error.message
      })
    }
  }

  if (currentAccount && me) {
    const currentAccountInfo = me?.orgs.find(({ id }) => id === currentAccount.id)?.mailingAddress as AddressI[]
    if (currentAccountInfo && currentAccountInfo.length > 0) {
      if (!formState.primaryContact.emailAddress) {
        formState.primaryContact.emailAddress = currentAccountInfo[0].email
      }
      if (!formState.primaryContact.phoneNumber) {
        formState.primaryContact.phoneNumber = currentAccountInfo[0].phone
      }
      if (!formState.primaryContact.extension) {
        formState.primaryContact.extension = currentAccountInfo[0].phoneExtension
      }
      // Check if field already has content before populating so as not to overwrite user changes
      if (!formState.primaryContact.country) { formState.primaryContact.country = currentAccountInfo[0].country }
      if (!formState.primaryContact.city) { formState.primaryContact.city = currentAccountInfo[0].city }
      if (!formState.primaryContact.postalCode) {
        formState.primaryContact.postalCode = currentAccountInfo[0].postalCode
      }
      if (!formState.primaryContact.province) { formState.primaryContact.province = currentAccountInfo[0].region }
      if (!formState.primaryContact.address) { formState.primaryContact.address = currentAccountInfo[0].street }
      if (!formState.primaryContact.addressLineTwo) {
        formState.primaryContact.addressLineTwo = currentAccountInfo[0].streetAdditional
      }
    }
  }
})

const getActiveAddressState = (): ContactInformationI | CreateAccountFormStateI['propertyDetails'] => {
  if (activeAddressField.value === 'primaryContactAddress') {
    return formState.primaryContact
  } else if (activeAddressField.value === 'secondaryContactAddress') {
    return formState.secondaryContact
  } else {
    return formState.propertyDetails
  }
}

// reset errors for Primary Contact
const resetFieldError = (field: keyof typeof primaryContactErrors) => {
  primaryContactErrors[field] = ''
}

// reset errors for Primary Contact
const validateField = (field: keyof typeof primaryContactErrors) => {
  const { error } = primaryContactSchema.safeParse(formState.primaryContact)
  const errorMessage = error?.errors.find(error => error.path.includes(field))?.message
  primaryContactErrors[field] = errorMessage || ''
}

// reset errors for Secondary Contact
const resetFieldErrorSecondary = (field: keyof typeof secondaryContactErrors) => {
  secondaryContactErrors[field] = ''
}

// validate fields for Secondary Contact
const validateFieldSecondary = (field: keyof typeof secondaryContactErrors) => {
  const { error } = secondaryContactSchema.safeParse(formState.secondaryContact)
  const errorMessage = error?.errors.find(error => error.path.includes(field))?.message
  secondaryContactErrors[field] = errorMessage || ''
}

watch(secondaryContactForm, () => {
  if (secondaryContactForm.value && secondFormIsComplete) {
    secondaryContactForm.value.validate({ silent: true })
  }
})

watch(isHostIndividual, () => {
  if (isComplete) {
    const parsed = primaryContactSchema.safeParse(formState.primaryContact).error?.errors
    parsed?.forEach((error: any) => {
      primaryContactErrors[error.path[0]] = error.message
    })
  }
  validateField('businessLegalName')
})

watch(canadaPostAddress, (newAddress) => {
  const activeAddressState = getActiveAddressState()
  if (newAddress) {
    activeAddressState.address = newAddress.address
    activeAddressState.addressLineTwo = newAddress.addressLineTwo
    activeAddressState.country = newAddress.country
    activeAddressState.city = newAddress.city
    activeAddressState.province = newAddress.province
    activeAddressState.postalCode = newAddress.postalCode
  }
})

</script>
