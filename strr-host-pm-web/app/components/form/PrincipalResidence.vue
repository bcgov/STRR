<script setup lang="ts">
// import type { Form } from '#ui/types'
// import { z } from 'zod'
// import { useDocumentStore } from '~/stores/document'

// const props = defineProps<{ isComplete: boolean }>()

// const { t } = useI18n()
// const { propertySchema, addNewEmptyListing, removeListingAtIndex } = useHostPropertyStore()
// const { property } = storeToRefs(useHostPropertyStore())
// const docStore = useDocumentStore()

// const prFormRef = ref<Form<z.output<typeof propertySchema>>>()

// const strataRefCode = ref<string>('')
// const agreeToDeclaration = ref<boolean>(false)

// const primaryResidenceOption = ref()
// const primaryResidenceRadioOptions = [
//   {
//     value: true,
//     label: 'Yes, the property has a principal residence requirement'
//   },
//   {
//     value: false,
//     label: 'No, principal residence does not apply or the property is exempt'
//   }
// ]

// const exemptionReason = ref<PrExemptionReason | undefined>(undefined)
// const exemptionReasons = [
//   {
//     label: t(`form.pr.exemptReason.${PrExemptionReason.EXEMPT_COMMUNITY}`), value: PrExemptionReason.EXEMPT_COMMUNITY
//   },
//   { label: t(`form.pr.exemptReason.${PrExemptionReason.STRATA_HOTEL}`), value: PrExemptionReason.STRATA_HOTEL },
//   { label: t(`form.pr.exemptReason.${PrExemptionReason.FARM_LAND}`), value: PrExemptionReason.FARM_LAND },
//   { label: t(`form.pr.exemptReason.${PrExemptionReason.OTHER}`), value: PrExemptionReason.OTHER }
// ]

// const otherOptionProvider = ref<PrExemptionOtherProvider | undefined>(undefined)
// const otherOptionProviders = [
//   {
//     label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.TIMESHARE}`),
//     value: PrExemptionOtherProvider.TIMESHARE
//   },
//   {
//     label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.FRACTIONAL_OWNERSHIP}`),
//     value: PrExemptionOtherProvider.FRACTIONAL_OWNERSHIP
//   },
//   {
//     label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.HOME_EXCHANGE}`),
//     value: PrExemptionOtherProvider.HOME_EXCHANGE
//   },
//   {
//     label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.LODGE_OPERATOR}`),
//     value: PrExemptionOtherProvider.LODGE_OPERATOR
//   },
//   {
//     label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.EDUCATIONAL_INSTITUTION}`),
//     value: PrExemptionOtherProvider.EDUCATIONAL_INSTITUTION
//   },
//   {
//     label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.STRATA_GUEST_SUITE}`),
//     value: PrExemptionOtherProvider.STRATA_GUEST_SUITE
//   }
// ]

// onMounted(async () => {
//   // validate form if step marked as complete
//   if (props.isComplete) {
//     await validateForm(prFormRef.value, props.isComplete)
//   }
// })

</script>

<template>
  <div data-testid="property-details">
    TBD
    <!-- <UForm
      ref="propertyFormRef"
      :schema="propertySchema"
      :state="property"
      class="space-y-10"
    >
      <ConnectPageSection>
        <div class="flex flex-col gap-4 p-10">
          <p>Provincial rules limit the operation of short-term rentals in BC to a principal residence or a secondary suite on the same property.</p>

          <UFormGroup name="primaryResidenceOption" :error="false">
            <URadioGroup
              id="primary-residence-radio"
              v-model="primaryResidenceOption"
              legend="The property is in a community where the principal residence applies"
              :options="primaryResidenceRadioOptions"
              :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
              :ui-radio="{ inner: 'space-y-2' }"
            />
          </UFormGroup>

          <UFormGroup
            v-if="primaryResidenceOption === false"
            id="pr-reason"
            v-slot="{ error }"
            name="prReason"
          >
            <USelectMenu
              v-model="exemptionReason"
              size="lg"
              :color="exemptionReason ? 'primary' : 'gray'"
              :placeholder="'Reason'"
              :options="exemptionReasons"
              value-attribute="value"
              :aria-label="'Select Exemption Reason'"
              :aria-required="true"
              :aria-invalid="error !== undefined"
              :ui-menu="{
                label: exemptionReason ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'
              }"
            />
          </UFormGroup>

          <UFormGroup
            v-if="exemptionReason === PrExemptionReason.OTHER"
            id="pr-reason"
            v-slot="{ error }"
            name="prReason"
          >
            <USelectMenu
              v-model="otherOptionProvider"
              size="lg"
              :color="otherOptionProvider ? 'primary' : 'gray'"
              :placeholder="'Reason'"
              :options="otherOptionProviders"
              value-attribute="value"
              :aria-label="'Select Exemption Reason'"
              :aria-required="true"
              :aria-invalid="error !== undefined"
              :ui-menu="{
                label: otherOptionProvider ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'
              }"
            />
          </UFormGroup>

          <ConnectFormFieldGroup
            v-if="exemptionReason === PrExemptionReason.STRATA_HOTEL"
            id="strata-hotel-reference-code"
            v-model="strataRefCode"
            aria-label="Strata Hotel Reference Code"
            name="strataRefCode"
            placeholder="Strata Hotel Reference Code"
            :is-required="true"
            help="This is a unique code for each registered strata hotel. Ask the strata hotel management for this code."
            input-class="w-full"
          />
        </div>
      </ConnectPageSection>

      <ConnectPageSection
        v-if="primaryResidenceOption !== undefined"
        class="bg-white"
        :heading="{ label: 'Documentation Details', labelClass: 'font-bold md:ml-6' }"
      >
        <div class="space-y-10 py-10">
          <ConnectFormSection
            :title="'File Upload'"
            :error="false"
          >
            <div class="space-y-5">
              <span>Upload all required documentation to support your application. Learn More</span>
              <UFormGroup
                help="File must be a PDF. Maximum 10 MB."
                name="documentUpload"
                :ui="{ help: 'mt-2 ml-10' }"
              >
                <DocumentUploadSelect
                  id="supporting-documents"
                  label="Choose Supporting Documents"
                  @change="docStore.addStoredDocument"
                />
              </UFormGroup>
              <DocumentList />

            </div>
          </ConnectFormSection>
          <div class="h-px w-full border-b border-gray-100" />
        </div>
      </ConnectPageSection>

      <ConnectPageSection
        v-if="primaryResidenceOption"
        class="bg-white"
        :heading="{ label: 'Declaration', labelClass: 'font-bold md:ml-6' }"
      >
        <div class="p-6">
          <UFormGroup name="declaration">
            <UCheckbox
              v-model="agreeToDeclaration"
              class="rounded bg-white p-4"
              aria-required="true"
            >
              <template #label>
                <div class="flex cursor-pointer flex-col gap-3">
                  <ConnectI18nBold translation-path="form.pr.declaration.intro" />
                  <ol class="list-alpha list-outside pl-10 marker:pr-10">
                    <li>{{ $t('form.pr.declaration.list.a') }}</li>
                    <li>{{ $t('form.pr.declaration.list.b') }}</li>
                  </ol>
                  <p>{{ $t('form.pr.declaration.agreement') }}</p>
                </div>
              </template>
            </UCheckbox>
          </UFormGroup>
        </div>
      </ConnectPageSection>

      <div class="flex flex-col gap-6">
        <h3 class="text-lg font-semibold">
          {{ $t('strr.label.supportingInfo') }}
        </h3>

        <ConnectPageSection :aria-label="$t('strr.label.supportingInfo')">
          <div class="space-y-10 py-10">
            <p class="px-4 md:px-10">
              {{ $t('strr.text.requireBusLicense') }}
            </p>

            <ConnectFormSection
              :title="$t('strr.label.businessLicense')"
              :error="isComplete && hasFormErrors(propertyFormRef, ['businessLicense'])"
            >
              <ConnectFormFieldGroup
                id="property-business-license"
                v-model="property.businessLicense"
                :aria-label="$t('strr.label.businessLicense')"
                :help="$t('strr.hint.businessLicense')"
                name="businessLicense"
                :placeholder="$t('strr.label.businessLicense')"
              />
            </ConnectFormSection>

            <ConnectFormSection
              v-if="property.businessLicense"
              :title="$t('strr.label.businessLicenseDate')"
              :error="isComplete && hasFormErrors(propertyFormRef, ['businessLicenseExpiryDate'])"
            >
              <ConnectFormDateInput
                name="businessLicenseExpiryDate"
                :initial-date="property.businessLicenseExpiryDate
                  ? dateStringToDate(property.businessLicenseExpiryDate)
                  : undefined"
                :help="t('text.defaultDateFormat')"
                :placeholder="t('strr.label.businessLicenseDate')"
                @selection="property.businessLicenseExpiryDate = $event ? dateToString($event) : ''"
              />
            </ConnectFormSection>
          </div>
        </ConnectPageSection>
      </div>
    </UForm> -->
  </div>
</template>
