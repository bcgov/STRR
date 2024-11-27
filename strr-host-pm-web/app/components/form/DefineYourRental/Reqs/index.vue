<script setup lang="ts">
import type { Form } from '#ui/types'
const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const reqStore = usePrReqStore()

const prReqFormRef = ref<Form<any>>()
const prExemptionOptions = [
  {
    value: PrExemptionReason.STRATA_HOTEL,
    label: t('label.eligibleStrataHotel')
  },
  {
    value: PrExemptionReason.FARM_LAND,
    label: t('label.farmLandClass9')
  },
  {
    value: PrExemptionReason.FRACTIONAL_OWNERSHIP,
    label: t('label.fractOwnership')
  }
]

// reset fields/form errors when changing options
watch(
  () => reqStore.prRequirements,
  (newVal) => {
    // reset exemption reason and ref code on isPropertyExempt change
    if (newVal.isPropertyPrExempt === false) {
      reqStore.prRequirements.prExemptionReason = undefined
      reqStore.prRequirements.strataRegNumber = ''
      prReqFormRef.value?.validate(['strataRegNumber', 'prExemptionReason'], { silent: true })
    }

    // reset ref code on prExemptionReason change
    if (newVal.prExemptionReason !== PrExemptionReason.STRATA_HOTEL) {
      reqStore.prRequirements.strataRegNumber = ''
      prReqFormRef.value?.validate(['strataRegNumber'], { silent: true })
    }
  },
  { deep: true }
)

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete && reqStore.addressReqs.isPrincipalResidenceRequired === true) {
    await validateForm(prReqFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <!-- TODO: figure out all different possible combinations of 'addressReqs' and edit the v-ifs accordingly -->
  <div
    class="px-4 py-10 md:px-10"
    :class="{
      'border-t border-gray-100':
        reqStore.addressReqs.organizationNm !== undefined
        || reqStore.addressReqError.type !== undefined
    }"
  >
    <!-- registration not required section (straa exempt) -->
    <div
      v-if="reqStore.addressReqs.isStraaExempt === true"
      class="space-y-10"
    >
      <UAlert
        title="You don’t need to register a short-term rental at this address."
        color="yellow"
        icon="i-mdi-check-circle"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          icon: { base: 'text-outcomes-approved' },
          title: 'text-base font-semibold',
        }"
      />

      <div class="flex justify-end gap-4">
        <UButton
          label="Exit Registration"
          variant="outline"
          size="bcGov"
        />
        <UButton
          label="Register a Different Rental Unit"
          size="bcGov"
        />
      </div>
    </div>

    <!-- str prohibited section -->
    <div
      v-if="reqStore.addressReqs.isStrProhibited === true"
      class="space-y-10"
    >
      <UAlert
        title="Short-term rentals are prohibited for this address."
        color="red"
        icon="i-mdi-alert"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          title: 'text-base font-semibold',
        }"
      >
        <template #description>
          <div class="flex flex-col gap-4 text-base text-bcGovGray-700">
            <p>You can continue to register your short-term rental for review, but your rental MUST MEET the following strict criteria for approval:</p>
            <ul class="list-inside list-disc">
              <li>Criteria 1</li>
              <li>Criteria 2</li>
              <li>Criteria 3</li>
            </ul>
            <p>Note: Currently, Short-Term Rental Application fees are non-refundable.</p>
          </div>
        </template>
      </UAlert>

      <div class="flex justify-end gap-4">
        <UButton
          label="Exit Registration"
          variant="outline"
          size="bcGov"
        />
        <UButton
          label="Continue with Registration"
          size="bcGov"
        />
      </div>
    </div>

    <!-- principal residence exempt (pr not required) section -->
    <div
      v-if="reqStore.addressReqs.isPrincipalResidenceRequired === false"
      class="space-y-10"
    >
      <UAlert
        title="Your property is in a location exempt from the principal residence requirement."
        color="yellow"
        icon="i-mdi-check-circle"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          icon: { base: 'text-outcomes-approved' },
          title: 'text-base font-semibold',
        }"
      />

      <div class="flex flex-col gap-4">
        <span>The following documentation is required for this registration:</span>
        <ul class="ml-4 list-inside list-disc">
          <li>Local business licence number and expiry date</li>
        </ul>
      </div>
    </div>

    <!-- principal residence required section -->
    <div
      v-if="reqStore.addressReqs.isPrincipalResidenceRequired === true"
      class="space-y-10"
    >
      <UForm
        ref="prReqFormRef"
        :state="reqStore.prRequirements"
        :schema="reqStore.prRequirementsSchema"
        class="space-y-10"
      >
        <UAlert
          :title="$t('alert.prRequired.title')"
          color="yellow"
          icon="i-mdi-alert"
          :close-button="null"
          variant="subtle"
          :ui="{
            inner: 'pt-0',
            title: 'text-base font-semibold',
          }"
        />

        <fieldset class="flex flex-col gap-6">
          <legend class="sr-only">
            {{ $t('strr.label.prRequirement') }}
          </legend>

          <UFormGroup name="isPropertyPrExempt">
            <UCheckbox
              v-model="reqStore.prRequirements.isPropertyPrExempt"
              :label="$t('text.thisPropIsExempt')"
            />
          </UFormGroup>

          <ConnectFormSection
            v-if="reqStore.prRequirements.isPropertyPrExempt"
            :title="$t('label.exemptionReason')"
            class="-mx-4 md:-mx-10"
            :error="isComplete && hasFormErrors(prReqFormRef, ['prExemptionReason'])"
          >
            <UFormGroup name="prExemptionReason">
              <URadioGroup
                v-model="reqStore.prRequirements.prExemptionReason"
                :options="prExemptionOptions"
              />
            </UFormGroup>
          </ConnectFormSection>

          <ConnectFormSection
            v-if="reqStore.prRequirements.prExemptionReason === PrExemptionReason.STRATA_HOTEL"
            :title="$t('label.strataRefCode')"
            class="-mx-4 md:-mx-10"
            :error="isComplete && hasFormErrors(prReqFormRef, ['strataRefCode'])"
          >
            <!-- must add the registration number if exemption reason is strata-hotel -->
            <ConnectFormFieldGroup
              id="strata-hotel-registration-number"
              v-model="reqStore.prRequirements.strataRefCode"
              :aria-label="$t('label.strataRefCode')"
              name="strataRefCode"
              :placeholder="$t('label.strataRefCode')"
              :is-required="true"
              :help="$t('hint.strataRefCode')"
            />
          </ConnectFormSection>
        </fieldset>
      </UForm>

      <UDivider />

      <!-- TODO: define list using required docs computed -->
      <div class="flex flex-col gap-4">
        <span>{{ $t('text.followingDocsRequired') }}</span>
        <ul class="ml-4 list-inside list-disc">
          <li>TODO: define rules for how this list is created</li>
        </ul>
      </div>
    </div>

    <!-- error section -->
    <div
      v-if="reqStore.addressReqError.type !== undefined"
      class="space-y-10"
    >
      <UAlert
        title="Address could not be found."
        color="red"
        icon="i-mdi-alert"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          title: 'text-base font-semibold',
        }"
      >
        <template #description>
          <div class="flex flex-col gap-4 text-base text-bcGovGray-700">
            <p>Make sure the address you have entered is correct. If error persists, please contact us.</p>
            <ConnectContactBcros />
          </div>
        </template>
      </UAlert>
    </div>
  </div>
</template>
