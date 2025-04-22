<script setup lang="ts">
import type { Form } from '#ui/types'

const owner = defineModel<HostOwner>('owner', { required: true })
const ownerFormRef = defineModel<Form<any>>('ownerFormRef', { required: true })

defineProps<{
  showBtns?: boolean,
  showErrors: boolean,
  showRoles?: boolean
}>()

defineEmits<{
  cancel: [],
  done: []
}>()

const { kcUser } = useKeycloak()
const ownerStore = useHostOwnerStore()

const isCompParty = ref(owner.value.isCompParty)
const isLoggedInAsBCeid = kcUser.value.loginSource === LoginSource.BCEID

watch(isCompParty, (val) => {
  // set owner isCompParty and update the name with user creds
  owner.value.isCompParty = val
  ownerStore.SetOwnerNameWithUserCreds(owner)
  ownerFormRef.value?.clear('firstName')
})

const { isCraNumberOptional } = storeToRefs(ownerStore)

watch(
  () => isCraNumberOptional.value,
  (val) => {
    if (val) { owner.value.taxNumber = '' }
  }
)

watch(
  () => owner.value.taxNumber,
  (val) => {
    if (val) { isCraNumberOptional.value = false }
  }
)

</script>

<template>
  <div class="space-y-8" data-testid="host-owner-individual">
    <ConnectFormSection
      :title="$t('strr.section.subTitle.completingParty')"
    >
      <div class="space-y-5">
        <p>{{ $t('strr.text.completingPartyInfo') }}</p>
        <UFormGroup name="isCompParty">
          <!-- TODO: move checkbox to base/connect -->
          <UCheckbox
            v-model="isCompParty"
            :disabled="owner.role === OwnerRole.CO_HOST"
            :ui="{ inner: '*:pl-0' }"
            data-testid="completing-party-checkboxx"
          >
            <template #label>
              <p
                :class="{'cursor-not-allowed opacity-50' : owner.role === OwnerRole.CO_HOST}"
                class="pl-3"
              >
                {{ $t('strr.text.completingPartyCheckbox') }}
              </p>
            </template>
          </UCheckbox>
        </UFormGroup>
      </div>
    </ConnectFormSection>
    <ConnectFormSection
      :title="$t('strr.section.subTitle.individualName')"
      :error="showErrors && hasFormErrors(ownerFormRef, ['firstName', 'middleName', 'lastName'])"
    >
      <div class="flex max-w-bcGovInput flex-col gap-3 sm:flex-row">
        <ConnectFormFieldGroup
          id="host-owner-first-name"
          v-model="owner.firstName"
          class="grow"
          :aria-label="$t('label.firstName')"
          name="firstName"
          :placeholder="$t('label.firstName')"
          :is-required="true"
          :is-disabled="isCompParty && !isLoggedInAsBCeid"
        />
        <ConnectFormFieldGroup
          id="host-owner-middle-name"
          v-model="owner.middleName"
          :aria-label="$t('label.middleName')"
          name="middleName"
          :placeholder="$t('label.middleNameOpt')"
          :is-disabled="isCompParty && !isLoggedInAsBCeid"
        />
        <ConnectFormFieldGroup
          id="host-owner-last-name"
          v-model="owner.lastName"
          class="grow"
          :aria-label="$t('label.lastName')"
          name="lastName"
          :placeholder="$t('label.lastName')"
          :is-required="true"
          :is-disabled="isCompParty && !isLoggedInAsBCeid"
        />
      </div>
    </ConnectFormSection>
    <ConnectFormSection
      :title="$t('strr.section.subTitle.individualPreferredName')"
      :error="showErrors && hasFormErrors(ownerFormRef, ['preferredName'])"
    >
      <ConnectFormFieldGroup
        id="host-owner-preferred-name"
        v-model="owner.preferredName"
        name="preferredName"
        :placeholder="$t('label.preferredNameOpt')"
        :help="$t('text.preferredName.hint')"
        data-testid="preferredName"
      />
    </ConnectFormSection>
    <ConnectFormSection
      v-if="showRoles"
      :title="$t('strr.section.subTitle.role')"
      :error="showErrors && hasFormErrors(ownerFormRef, ['role'])"
    >
      <FormAddOwnersInputCommonRole
        v-model="owner.role"
        :is-comp-party="owner.isCompParty"
        :show-error="showErrors"
        :owner-type="owner.ownerType"
      />
    </ConnectFormSection>
    <div v-if="!!owner.role" class="space-y-8">
      <ConnectFormSection
        v-if="owner.ownerType === OwnerType.INDIVIDUAL && owner.role === OwnerRole.HOST"
        :title="$t('strr.section.subTitle.birthdate')"
        :error="showErrors && hasFormErrors(ownerFormRef, ['dateOfBirth'])"
      >
        <ConnectFormDateInput
          name="dateOfBirth"
          :initial-date="owner.dateOfBirth
            ? dateStringToDate(owner.dateOfBirth)
            : undefined"
          :help="$t('text.defaultDateFormat')"
          :placeholder="$t('label.birthdate')"
          :max-date="new Date()"
          @selection="owner.dateOfBirth = $event ? dateToString($event) : ''"
        />
      </ConnectFormSection>
      <ConnectFormSection
        v-if="owner.ownerType === OwnerType.INDIVIDUAL && owner.role === OwnerRole.HOST"
        :title="$t('strr.section.subTitle.craTaxNum')"
        :error="showErrors && hasFormErrors(ownerFormRef, ['taxNumber'])"
      >
        <ConnectFormFieldGroup
          id="host-owner-taxNumber"
          v-model="owner.taxNumber"
          name="taxNumber"
          :placeholder="$t('label.craTaxNumber')"
          :help="$t('strr.hint.craTaxNumber')"
          mask="### ### ###"
        />
        <UFormGroup name="optionalCraTaxNumber">
          <UCheckbox
            v-model="isCraNumberOptional"
            label="This individual does not have a CRA Tax Number"
            class="mt-6"
          />
        </UFormGroup>
      </ConnectFormSection>
      <ConnectFormSection
        v-if="owner.role !== OwnerRole.PROPERTY_MANAGER || owner.ownerType !== OwnerType.BUSINESS"
        :title="owner.role === OwnerRole.HOST
          ? $t('strr.section.subTitle.residentialAddress')
          : $t('strr.section.subTitle.mailingAddress')"
        :error="showErrors && hasFormErrors(ownerFormRef, [
          'mailingAddress.country',
          'mailingAddress.street',
          'mailingAddress.city',
          'mailingAddress.region',
          'mailingAddress.postalCode'
        ])"
      >
        <ConnectFormAddress
          id="host-owner-address"
          v-model:country="owner.mailingAddress.country"
          v-model:street="owner.mailingAddress.street"
          v-model:street-additional="owner.mailingAddress.streetAdditional"
          v-model:city="owner.mailingAddress.city"
          v-model:region="owner.mailingAddress.region"
          v-model:postal-code="owner.mailingAddress.postalCode"
          v-model:location-description="owner.mailingAddress.locationDescription"
          class="max-w-bcGovInput"
          :excluded-fields="['streetName', 'streetNumber', 'unitNumber']"
          :schema-prefix="'mailingAddress.'"
          :form-ref="ownerFormRef"
          hide-street-hint
          :location-desc-label="owner.role === OwnerRole.HOST"
        />
      </ConnectFormSection>
      <ConnectFormSection
        :title="$t('strr.section.subTitle.phoneNumber')"
        :error="showErrors && hasFormErrors(ownerFormRef, ['phone.countryCode', 'phone.number'])"
      >
        <ConnectFormPhoneNumber
          v-model:country-code="owner.phone.countryCode"
          v-model:country-iso2="owner.phone.countryIso2"
          v-model:extension="owner.phone.extension"
          v-model:number="owner.phone.number"
        />
      </ConnectFormSection>
      <ConnectFormSection
        :title="$t('strr.section.subTitle.faxNumber')"
        :error="showErrors && hasFormErrors(ownerFormRef, ['faxNumber'])"
      >
        <ConnectFormFieldGroup
          id="host-owner-fax-number"
          v-model="owner.faxNumber"
          :aria-label="$t('label.faxNumberOpt')"
          name="faxNumber"
          :placeholder="$t('label.faxNumberOpt')"
          :mask="owner.phone.countryCode === '1' ? '(###) ###-####' : '##############'"
        />
      </ConnectFormSection>
      <ConnectFormSection
        :title="$t('strr.section.subTitle.emailAddress')"
        :error="showErrors && hasFormErrors(ownerFormRef, ['emailAddress'])"
      >
        <div class="space-y-5">
          <ConnectFormFieldGroup
            id="host-owner-email"
            v-model="owner.emailAddress"
            :aria-label="$t('label.emailAddress')"
            name="emailAddress"
            :placeholder="$t('label.emailAddress')"
            :is-required="true"
            type="email"
          />
          <EmailAlert />
        </div>
      </ConnectFormSection>
    </div>
    <ConnectFormSection v-if="showBtns" title=" ">
      <FormAddOwnersInputCommonActionBtns
        class="max-w-bcGovInput"
        @cancel="$emit('cancel')"
        @done="$emit('done')"
      />
    </ConnectFormSection>
  </div>
</template>
