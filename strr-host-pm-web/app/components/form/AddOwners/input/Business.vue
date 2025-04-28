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

const { activeOwnerEditIndex } = storeToRefs(useHostOwnerStore())
const { isRegistrationRenewal } = storeToRefs(useHostPermitStore())

// used for disabling fields when Renewal Registration and in Edit mode
const isRenewalEditActive = computed((): boolean => (activeOwnerEditIndex.value !== -1) && isRegistrationRenewal?.value)

</script>

<template>
  <div class="space-y-8" data-testid="host-owner-business">
    <UAlert
      v-if="isRenewalEditActive"
      color="yellow"
      class="mx-10 w-auto"
      icon="i-mdi-alert"
      :close-button="null"
      variant="subtle"
      :ui="{
        inner: 'pt-0',
        icon: {
          base: 'flex-shrink-0 w-5 h-5 self-start'
        }
      }"
    >
      <template #title>
        <ConnectI18nHelper translation-path="alert.renewalEditBusiness" />
      </template>
    </UAlert>
    <ConnectFormSection
      :title="$t('strr.section.subTitle.businessName')"
      :error="showErrors && hasFormErrors(ownerFormRef, ['businessLegalName'])"
    >
      <ConnectFormFieldGroup
        id="host-owner-businessLegalName"
        v-model="owner.businessLegalName"
        class="grow"
        :aria-label="$t('label.busNameLegal')"
        name="businessLegalName"
        :placeholder="$t('label.busNameLegal')"
        :is-required="true"
        :is-disabled="isRenewalEditActive"
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
        :is-disabled="isRenewalEditActive"
      />
    </ConnectFormSection>
    <div v-if="!!owner.role" class="space-y-8">
      <ConnectFormSection
        :title="$t('strr.section.subTitle.craBusinessNumber')"
        :error="showErrors && hasFormErrors(ownerFormRef, ['businessNumber'])"
      >
        <ConnectFormFieldGroup
          id="owner-host-businessNumber"
          v-model="owner.businessNumber"
          :aria-label="$t('label.busNumOpt')"
          name="businessNumber"
          :placeholder="$t('label.busNumOpt')"
          :help="$t('strr.hint.businessNumber')"
          mask="#########@@####"
        />
      </ConnectFormSection>
      <ConnectFormSection
        v-if="owner.role === OwnerRole.PROPERTY_MANAGER"
        :title="$t('strr.section.subTitle.mailingAddress')"
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
        />
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
