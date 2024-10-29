<script setup lang="ts">
import type { HostContactInformation } from '#imports'

const { t } = useI18n()

const { isComplete } = defineProps<{ isComplete: boolean }>()

const { getContactSchema, getNewContact } = useStrrHostContact()
const { primaryContact, secondaryContact } = storeToRefs(useStrrHostContact())

const {
  activeAddressField,
  address: canadaPostAddress,
  enableAddressComplete
} = useCanadaPostAddress()

const activeAddressState = computed<Ref<HostContactInformation | undefined>>(
  () => activeAddressField.value === 'primaryContactAddress'
    ? primaryContact
    : secondaryContact
)

const activeAddressForm = computed(
  () => activeAddressField.value === 'primaryContactAddress' ? form.value : secondForm.value)

watch(canadaPostAddress, (newAddress) => {
  activeAddressForm.value.clear('address.city')
  activeAddressForm.value.clear('address.region')
  activeAddressForm.value.clear('address.postalCode')
  if (newAddress && activeAddressState.value.value) {
    activeAddressState.value.value.address.street = newAddress.street
    activeAddressState.value.value.address.streetAdditional = newAddress.streetAdditional
    activeAddressState.value.value.address.country = newAddress.country
    activeAddressState.value.value.address.city = newAddress.city
    activeAddressState.value.value.address.region = newAddress.region
    activeAddressState.value.value.address.postalCode = newAddress.postalCode
    // activeAddressState.address.locationDescription = newAddress.locationDescription
  }
})

const form = ref()
const secondForm = ref()

watch(form, () => {
  if (form.value && isComplete) { form.value.validate() }
})
watch(secondForm, () => {
  if (
    secondaryContact.value &&
    secondForm.value &&
    isComplete
  ) {
    secondForm.value.validate()
  }
})
</script>

<template>
  <div data-testid="contact-information" class="space-y-10">
    <ConnectPageSection
      class="bg-white"
      :heading="{ label: t('createAccount.contact.subtitle'), labelClass: 'font-bold md:ml-6' }"
    >
      <UForm
        ref="form"
        :schema="getContactSchema(true)"
        :state="primaryContact"
        class="space-y-10 pb-10"
      >
        <ConnectFormSection :title="t('createAccount.contactForm.dateOfBirth')">
          <ConnectFormDateInput
            name="dateOfBirth"
            :initial-date="primaryContact.dateOfBirth
              ? dateStringToDate(primaryContact.dateOfBirth)
              : undefined"
            :max-date="new Date()"
            placeholder="YYYY-MM-DD"
            @selection="primaryContact.dateOfBirth = dateToString($event, 'YYYY-MM-DD')"
          />
        </ConnectFormSection>
        <ConnectFormSection :title="t('createAccount.contactForm.cra')">
          <FormCommonCraInfo
            v-model:social-insurance-number="primaryContact.socialInsuranceNumber"
            v-model:business-number="primaryContact.businessNumber"
            :is-primary="true"
          />
        </ConnectFormSection>
        <FormCommonContact
          v-model:full-name="primaryContact.fullName"
          v-model:preferred-name="primaryContact.preferredName"
          v-model:phone="primaryContact.phone"
          v-model:emailAddress="primaryContact.emailAddress"
          v-model:fax-number="primaryContact.faxNumber"
          id-prefix="host-primary-contact"
          :prepopulate-name="false"
          email-warning
        />
        <ConnectFormSection :title="t('createAccount.contactForm.mailingAddress')">
          <div class="max-w-bcGovInput">
            <ConnectFormAddress
              id="primaryContactAddress"
              v-model:country="primaryContact.address.country"
              v-model:street="primaryContact.address.street"
              v-model:street-additional="primaryContact.address.streetAdditional"
              v-model:city="primaryContact.address.city"
              v-model:region="primaryContact.address.region"
              v-model:postal-code="primaryContact.address.postalCode"
              v-model:location-description="primaryContact.address.locationDescription"
              :schema-prefix="'address.'"
              :enable-address-complete="enableAddressComplete"
            />
          </div>
        </ConnectFormSection>
      </UForm>
    </ConnectPageSection>
    <div v-if="!secondaryContact">
      <UButton
        :label="t('createAccount.contact.addSecondaryContact')"
        class="px-5 py-3"
        color="primary"
        icon="i-mdi-plus"
        variant="outline"
        @click="secondaryContact = getNewContact()"
      />
    </div>
    <ConnectPageSection
      v-else
      class="bg-white"
      :heading="{ label: t('createAccount.contact.secondaryContactInfo'), labelClass: 'font-bold md:ml-6' }"
    >
      <template #header>
        <div class="flex">
          <h2 class="ml-6 grow font-bold">
            {{ t('createAccount.contact.secondaryContactInfo') }}
          </h2>
          <UButton
            :label="t('createAccount.contact.remove')"
            class="px-5"
            color="red"
            trailing-icon="i-mdi-close"
            variant="outline"
            @click="secondaryContact = undefined"
          />
        </div>
      </template>
      <UForm
        ref="secondForm"
        :schema="getContactSchema(false)"
        :state="secondaryContact"
        class="space-y-10 pb-10"
      >
        <ConnectFormSection :title="t('createAccount.contactForm.dateOfBirth')">
          <ConnectFormDateInput
            name="dateOfBirth"
            :max-date="new Date()"
            placeholder="YYYY-MM-DD"
            @selection="secondaryContact.dateOfBirth = dateToString($event, 'YYYY-MM-DD')"
          />
        </ConnectFormSection>
        <ConnectFormSection :title="t('createAccount.contactForm.cra')">
          <FormCommonCraInfo
            v-model:social-insurance-number="secondaryContact.socialInsuranceNumber"
            v-model:business-number="secondaryContact.businessNumber"
            :is-primary="false"
          />
        </ConnectFormSection>
        <FormCommonContact
          v-model:full-name="secondaryContact.fullName"
          v-model:preferred-name="secondaryContact.preferredName"
          v-model:phone="secondaryContact.phone"
          v-model:emailAddress="secondaryContact.emailAddress"
          v-model:fax-number="secondaryContact.faxNumber"
          id-prefix="host-secondary-contact"
          :prepopulate-name="false"
        />
        <ConnectFormSection :title="t('createAccount.contactForm.mailingAddress')">
          <div class="max-w-bcGovInput">
            <ConnectFormAddress
              id="secondaryContactAddress"
              v-model:country="secondaryContact.address.country"
              v-model:street="secondaryContact.address.street"
              v-model:street-additional="secondaryContact.address.streetAdditional"
              v-model:city="secondaryContact.address.city"
              v-model:region="secondaryContact.address.region"
              v-model:postal-code="secondaryContact.address.postalCode"
              v-model:location-description="secondaryContact.address.locationDescription"
              :schema-prefix="'address.'"
              :enable-address-complete="enableAddressComplete"
            />
          </div>
        </ConnectFormSection>
      </UForm>
    </ConnectPageSection>
  </div>
</template>
