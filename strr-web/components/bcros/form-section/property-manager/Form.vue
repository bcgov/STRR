<template>
  <div class="relative h-full">
    <div class="desktop:mb-[180px] mobile:mb-[32px] rounded-[4px]">
      <div class="mb-[32px] mx-[8px]">
        <div class="mb-6">
          <URadioGroup
            id="role-property-manager-radio"
            v-model="formState.isPropertyManagerRole"
            data-test-id="property-manager-is-pm"
            :legend="tPropertyManager('roleRadioLegend')"
            :options="roleRadioOptions"
            class="[&_legend]:font-bold [&_legend]:text-lg"
          />
        </div>
        <div>
          <URadioGroup
            v-if="!formState.isPropertyManagerRole"
            id="has-property-manager-radio"
            v-model="formState.hasPropertyManager"
            data-test-id="property-manager-has-pm"
            :legend="tPropertyManager('propertyManagerRadioLegend')"
            :options="havePropertyManagerRadioOptions"
            class="[&_legend]:font-bold [&_legend]:text-lg"
          />
        </div>
      </div>
      <div
        v-if="
          (!formState.isPropertyManagerRole && formState.hasPropertyManager) || formState.isPropertyManagerRole
        "
        data-test-id="property-manager-form"
      >
        <div class="mb-132px bg-white rounded-[4px]">
          <div class="bg-bcGovColor-gray2 rounded-t-[4px]">
            <p class="px-[40px] py-[15px] font-bold">
              {{ t('createAccount.propertyManager.primary') }}
            </p>
          </div>
          <UForm ref="form" :schema="propertyManagerSchema" :state="formState.propertyManager">
            <BcrosFormSectionPropertyManagerBusinessDetails
              v-model:business-name="formState.propertyManager.businessLegalName"
              v-model:business-number="formState.propertyManager.businessNumber"
              :errors="errorRefs"
              @reset-field-error="resetFieldError"
              @validate-field="validateField"
            />
            <BcrosFormSectionPropertyManagerBusinessMailingAddress
              id="propertyManagerBusinessAddress"
              v-model:country="formState.propertyManager.businessMailingAddress.country"
              v-model:address="formState.propertyManager.businessMailingAddress.address"
              v-model:address-line-two="formState.propertyManager.businessMailingAddress.addressLineTwo"
              v-model:city="formState.propertyManager.businessMailingAddress.city"
              v-model:province="formState.propertyManager.businessMailingAddress.province"
              v-model:postal-code="formState.propertyManager.businessMailingAddress.postalCode"
              :enable-address-complete="enableAddressComplete"
              default-country-iso2="CA"
              :errors="errorRefs"
              @reset-field-error="resetFieldError"
              @validate-field="validateField"
            />
            <BcrosFormSectionPropertyManagerContactName
              v-model:preferred-name="formState.propertyManager.contact.preferredName"
              v-model:first-name="formState.propertyManager.contact.firstName"
              v-model:last-name="formState.propertyManager.contact.lastName"
              v-model:middle-name="formState.propertyManager.contact.middleName"
              :errors="errorRefs"
              @reset-field-error="resetFieldError"
              @validate-field="validateField"
            />
            <BcrosFormSectionPropertyManagerContactDetails
              v-model:phone-number="formState.propertyManager.contact.phoneNumber"
              v-model:extension="formState.propertyManager.contact.extension"
              v-model:fax-number="formState.propertyManager.contact.faxNumber"
              v-model:email-address="formState.propertyManager.contact.emailAddress"
              :errors="errorRefs"
              @reset-field-error="resetFieldError"
              @validate-field="validateField"
            />
          </UForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()
const tPropertyManager = (translationKey: string) => t(`createAccount.propertyManager.${translationKey}`)

const { isComplete } = defineProps<{ isComplete: boolean }>()

const roleRadioOptions = [{
  value: false,
  label: tPropertyManager('propertyHostRoleOption')
}, {
  value: true,
  label: tPropertyManager('propertyManagerRoleOption')
}]

const havePropertyManagerRadioOptions = [{
  value: true,
  label: tPropertyManager('yesOption')
}, {
  value: false,
  label: tPropertyManager('noOption')
}]

const {
  activeAddressField,
  address: canadaPostAddress,
  enableAddressComplete
} = useCanadaPostAddress()

const getActiveAddressState = () => {
  if (activeAddressField.value === 'propertyManagerBusinessAddress') {
    return formState.propertyManager.businessMailingAddress
  }
  return null
}

watch(canadaPostAddress, (newAddress) => {
  const activeAddressState = getActiveAddressState()
  if (newAddress && activeAddressState) {
    activeAddressState.address = newAddress.street
    activeAddressState.addressLineTwo = newAddress.streetAdditional
    activeAddressState.country = newAddress.country
    activeAddressState.city = newAddress.city
    activeAddressState.province = newAddress.region
    activeAddressState.postalCode = newAddress.postalCode
  }
})

const errorRefs = reactive({
  address: '',
  city: '',
  province: '',
  postalCode: '',
  emailAddress: '',
  phoneNumber: '',
  firstName: '',
  lastName: '',
  businessLegalName: '',
  businessNumber: '',
  middleName: '',
  preferredName: '',
  extension: '',
  faxNumber: ''
})

const resetFieldError = (field: keyof typeof errorRefs) => {
  errorRefs[field] = ''
}

const validateField = (field: keyof typeof errorRefs) => {
  const parsed = propertyManagerSchema.safeParse(formState.propertyManager).error?.errors
  const error = parsed?.find(error => error.path.includes(field))
  errorRefs[field] = error ? error.message : ''
}

const form = ref()
watch(form, () => {
  if (form.value && isComplete) { form.value.validate({ silent: true }) }
})

watch([() => formState.isPropertyManagerRole, () => formState.hasPropertyManager], () => {
  if (!formState.isPropertyManagerRole && !formState.hasPropertyManager) {
    formState.propertyManager = {
      businessLegalName: '',
      businessNumber: '',
      businessMailingAddress: {
        address: '',
        addressLineTwo: '',
        city: '',
        postalCode: '',
        province: '',
        country: ''
      },
      contact: {
        firstName: '',
        middleName: '',
        lastName: '',
        preferredName: '',
        phoneNumber: '',
        extension: '',
        faxNumber: '',
        emailAddress: ''
      }
    }
  }
  // reset Host Authorization flag if role is not Property manager
  if (!formState.isPropertyManagerRole) {
    formState.hasHostAuthorization = false
  }
})

onMounted(() => {
  if (isComplete) {
    Object.keys(errorRefs).forEach((field) => {
      validateField(field as keyof typeof errorRefs)
    })
  }
})
</script>
<style scoped>
.with-divider {
  @apply desktop:border-b desktop:border-bcGovGray-300 desktop:mx-[25px];
}
</style>
