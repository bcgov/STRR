<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'
import { useDocumentStore } from '~/stores/document'

const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const { propertySchema, addNewEmptyListing, removeListingAtIndex } = useHostPropertyStore()
const { property } = storeToRefs(useHostPropertyStore())
const docStore = useDocumentStore()

const prFormRef = ref<Form<z.output<typeof propertySchema>>>()

const strataRefCode = ref<string>('')
const agreeToDeclaration = ref<boolean>(false)

const primaryResidenceOption = ref()
const primaryResidenceRadioOptions = [
  {
    value: true,
    label: 'Yes, the property has a principal residence requirement'
  },
  {
    value: false,
    label: 'No, principal residence does not apply or the property is exempt'
  }
]

const exemptionReason = ref<PrExemptionReason | undefined>(undefined)
const exemptionReasons = [
  {
    label: t(`form.pr.exemptReason.${PrExemptionReason.EXEMPT_COMMUNITY}`), value: PrExemptionReason.EXEMPT_COMMUNITY
  },
  { label: t(`form.pr.exemptReason.${PrExemptionReason.STRATA_HOTEL}`), value: PrExemptionReason.STRATA_HOTEL },
  { label: t(`form.pr.exemptReason.${PrExemptionReason.FARM_LAND}`), value: PrExemptionReason.FARM_LAND },
  { label: t(`form.pr.exemptReason.${PrExemptionReason.OTHER}`), value: PrExemptionReason.OTHER }
]

const otherOptionProvider = ref<PrExemptionOtherProvider | undefined>(undefined)
const otherOptionProviders = [
  {
    label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.TIMESHARE}`),
    value: PrExemptionOtherProvider.TIMESHARE
  },
  {
    label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.FRACTIONAL_OWNERSHIP}`),
    value: PrExemptionOtherProvider.FRACTIONAL_OWNERSHIP
  },
  {
    label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.HOME_EXCHANGE}`),
    value: PrExemptionOtherProvider.HOME_EXCHANGE
  },
  {
    label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.LODGE_OPERATOR}`),
    value: PrExemptionOtherProvider.LODGE_OPERATOR
  },
  {
    label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.EDUCATIONAL_INSTITUTION}`),
    value: PrExemptionOtherProvider.EDUCATIONAL_INSTITUTION
  },
  {
    label: t(`form.pr.exemptOtherProvider.${PrExemptionOtherProvider.STRATA_GUEST_SUITE}`),
    value: PrExemptionOtherProvider.STRATA_GUEST_SUITE
  }
]

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(prFormRef.value, props.isComplete)
  }
})

</script>

<template>
  <div data-testid="property-details">
    <UForm
      ref="propertyFormRef"
      :schema="propertySchema"
      :state="property"
      class="space-y-10"
    >
      <!-- principal residence requirement section -->
      <ConnectPageSection>
        <div class="flex flex-col gap-4 p-10">
          <p>Provincial rules limit the operation of short-term rentals in BC to a principal residence or a secondary suite on the same property.</p>

          <!-- principal residence requirement -->
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

          <!-- must add reason if not exempt -->
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

          <!-- must add provider if exemption reason is other -->
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

          <!-- must add reference code if exemption reason is strata-hotel -->
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

      <!-- document upload section -->
      <!-- documents required if exempt or not -->
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
                <!-- <DocumentUploadButton
                  id="supporting-documents"
                  label="Choose Supporting Documents"
                  :multiple="false"
                  @change="docStore.addStoredDocument"
                /> -->
                <DocumentUploadSelect
                  id="supporting-documents"
                  label="Choose Supporting Documents"
                  :multiple="false"
                  @change="docStore.addStoredDocument"
                />
              </UFormGroup>
              <DocumentList />
              <!-- <div class="flex flex-col gap-1">
                <div
                  v-for="doc in docStore.storedDocuments"
                  :key="doc.id"
                  class="mb-1 flex items-center justify-between rounded bg-gray-100 p-3"
                  :class="{
                    'opacity-90': doc.loading,
                    'bg-red-100': doc.error
                  }"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon
                        :name="doc.loading
                          ? 'i-heroicons-arrow-path-20-solid'
                          : doc.error
                            ? 'i-mdi-alert'
                            : 'i-mdi-paperclip'
                        "
                        class="size-5"
                        :class="{
                          'animate-spin': doc.loading,
                          'text-red-500': doc.error
                        }"
                      />
                      <span>{{ doc.name }}</span>
                    </div>
                  </div>
                  <UButton
                    :label="'Remove'"
                    variant="link"
                    trailing-icon="i-mdi-close"
                    :disabled="doc.loading"
                    @click="docStore.removeStoredDocument(doc)"
                  />
                </div>
              </div> -->
              <!-- stored docs: {{ docStore.storedDocuments }}
              api docs: {{ docStore.apiDocuments }} -->
              <!-- <span>Upload all required documentation to support your application. Learn More</span> -->
              <!-- :error="hasFormErrors(propertyFormRef, [
              'numberOfRoomsForRent', 'propertyType', 'ownershipType',
              'parcelIdentifier', 'businessLicense', 'businessLicenseExpiryDate'])" -->
              <!-- <div class="flex w-full items-center gap-2">
                <UIcon
                  name="i-mdi-paperclip"
                  class="size-8 text-blue-500"
                />
                <ConnectFormFieldGroup
                  id="supporting-documents"
                  v-model="property.numberOfRoomsForRent"
                  aria-label="Supporting document file upload"
                  name="documentUpload"
                  placeholder="Choose Supporting Documents"
                  :is-required="true"
                  help="File must be a PDF. Maximum 10 MB."
                  type="file"
                  accept=".pdf"
                  input-class="w-full"
                  class="w-full"
                >
                  <template #label>
                    <span class="pt-0 font-normal">
                      Upload all required documentation to support your application.
                    </span>
                  </template>

                  <template #hint>
                    <UButton
                      label="Learn More"
                      trailing-icon="i-mdi-open-in-new"
                      target="_blank"
                      :external="true"
                      variant="link"
                      to="https://www2.gov.bc.ca/gov/content/housing-tenancy/\
                      short-term-rentals/principal-residence-requirement"
                    />
                  </template>
                </ConnectFormFieldGroup>
              </div> -->
            </div>
          </ConnectFormSection>
          <div class="h-px w-full border-b border-gray-100" />
        </div>
      </ConnectPageSection>

      <!-- declaration section -->
      <!-- must agree to declaration if the property has pr requirement -->
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
          <!-- v-model="applicationStore.confirmation.confirmInfoAccuracy"
          :aria-invalid="hasFormErrors(strataConfirmationFormRef, ['confirmInfoAccuracy'])"
          :class="hasFormErrors(strataConfirmationFormRef, ['confirmInfoAccuracy'])
              ? 'outline outline-red-600'
              : ''
            " -->
          </UFormGroup>
        </div>
      </ConnectPageSection>
    </UForm>
  </div>
</template>
