<script setup lang="ts">
import { z } from 'zod'
import type { Form } from '#ui/types'

const rtc = useRuntimeConfig().public
const strataModal = useStrataModals()
const { addNewEmptyBuilding, removeBuildingAtIndex, strataDetailsSchema } = useStrrStrataDetailsStore()
const { strataDetails } = storeToRefs(useStrrStrataDetailsStore())
const { isRegistrationRenewal } = storeToRefs(useStrrStrataStore())
const docStore = useDocumentStore()
const { getDocumentSchema } = docStore

const props = defineProps<{ isComplete: boolean }>()

const strataDetailsFormRef = ref<Form<z.output<typeof strataDetailsSchema>>>()
const documentFormRef = ref<Form<any>>()

/** Checks if a unit listing value has actual content (not just whitespace) */
const hasUnitsValue = (value?: string) => !!value && value.trim().length > 0

/** Determines if primary building unit list error should be displayed */
const shouldShowPrimaryUnitsError = computed(() => (
  isRegistrationRenewal.value &&
  props.isComplete &&
  !hasUnitsValue(strataDetails.value.unitListings.primary)
))

/** Determines if additional building unit list error should be displayed for a given building index */
const shouldShowAdditionalUnitsError = (index: number) => (
  isRegistrationRenewal.value &&
  props.isComplete &&
  !hasUnitsValue(strataDetails.value.unitListings.additional[index])
)

// revalidate form to remove errors if field previously shows error
watch(() => docStore.storedDocuments,
  () => {
    documentFormRef.value?.validate(undefined, { silent: true })
  },
  { deep: true }
)

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(strataDetailsFormRef.value, props.isComplete)
    await validateForm(documentFormRef.value, props.isComplete)
  }
})
</script>

<template>
  <div data-testid="strata-details" class="space-y-10">
    <UForm
      ref="strataDetailsFormRef"
      :schema="strataDetailsSchema"
      :state="strataDetails"
      class="space-y-10"
    >
      <ConnectPageSection
        class="bg-white"
        :heading="{ label: $t('strr.section.title.details'), labelClass: 'font-bold md:ml-6' }"
      >
        <div class="space-y-10 py-10">
          <ConnectFormSection
            :title="$t('strr.section.subTitle.brand')"
            :error="hasFormErrors(strataDetailsFormRef, ['brand.name', 'brand.website'])"
          >
            <div class="space-y-5">
              <ConnectFormFieldGroup
                id="strata-brand-name"
                v-model="strataDetails.brand.name"
                :aria-label="$t('strr.label.brandName')"
                :help="$t('strr.hint.brandName')"
                name="brand.name"
                :placeholder="$t('strr.label.brandName')"
                :is-required="true"
              />
              <ConnectFormFieldGroup
                id="strata-brand-site"
                v-model="strataDetails.brand.website"
                :aria-label="$t('strr.label.brandSite')"
                :help="$t('strr.hint.brandSite')"
                name="brand.website"
                :placeholder="$t('strr.label.brandSite')"
                :is-required="true"
                type="url"
              />
            </div>
          </ConnectFormSection>
          <div class="h-px w-full border-b border-gray-100" />
          <ConnectFormSection
            :title="$t('strr.label.strataHotelCategory')"
            :error="hasFormErrors(strataDetailsFormRef, ['category'])"
          >
            <UFormGroup
              id="strata-details-category"
              data-testid="strata-details-category"
              name="category"
            >
              <URadioGroup
                v-model="strataDetails.category"
                class="p-2"
                :class="isComplete && strataDetails.category === undefined
                  ? 'border-red-600 border-2 pt-4'
                  : 'pt-4'
                "
                :options="[
                  {
                    label: $t(`strataHotelCategory.${StrataHotelCategory.FULL_SERVICE}`),
                    value: StrataHotelCategory.FULL_SERVICE
                  },
                  {
                    label: $t(`strataHotelCategory.${StrataHotelCategory.MULTI_UNIT_NON_PR}`),
                    value: StrataHotelCategory.MULTI_UNIT_NON_PR
                  },
                  {
                    label: $t(`strataHotelCategory.${StrataHotelCategory.POST_DECEMBER_2023}`),
                    value: StrataHotelCategory.POST_DECEMBER_2023
                  }
                ]"
                :ui-radio="{ inner: 'space-y-2' }"
              >
                <template #legend>
                  <span class="sr-only">{{ $t('strr.text.selectStrataHotelCategory.a11y') }}</span>
                  <UButton
                    :label="$t('strr.text.selectStrataHotelCategory.link')"
                    :to="rtc.requiredDocsUrl"
                    target="_blank"
                    trailing-icon="i-mdi-open-in-new"
                    variant="link"
                    class="text-base underline"
                    :padded="false"
                    :ui="{ gap: { sm: 'gap-x-1.5' } }"
                  />
                </template>
              </URadioGroup>
            </UFormGroup>
          </ConnectFormSection>
          <div class="h-px w-full border-b border-gray-100" />
          <ConnectFormSection
            :title="$t('strr.section.subTitle.numberOfUnits')"
            :error="hasFormErrors(strataDetailsFormRef, ['numberOfUnits'])"
          >
            <div class="space-y-5">
              <ConnectFormFieldGroup
                id="strata-details-numberOfUnits"
                v-model="strataDetails.numberOfUnits"
                :aria-label="$t('strr.label.numberOfUnits')"
                :help="$t('strr.hint.numberOfUnits')"
                name="numberOfUnits"
                :placeholder="$t('strr.label.numberOfUnits')"
                :is-required="true"
                :type="'number'"
              />
            </div>
          </ConnectFormSection>
        </div>
      </ConnectPageSection>
      <ConnectPageSection
        class="bg-white"
        :heading="{ label: $t('strr.section.title.buildings'), labelClass: 'font-bold md:ml-6' }"
      >
        <p class="px-4 pt-10 md:px-10">
          {{ $t('strr.text.buildingsSubText') }}
        </p>

        <div class="space-y-10 py-10">
          <ConnectFormSection
            :title="$t('strr.section.subTitle.primaryStrataBuilding')"
            :error="hasFormErrors(strataDetailsFormRef, [
              'location.country',
              'location.street',
              'location.city',
              'location.region',
              'location.postalCode'
            ])"
          >
            <div class="max-w-bcGovInput space-y-10">
              <ConnectFormAddress
                id="strata-primary-address"
                v-model:country="strataDetails.location.country"
                v-model:street="strataDetails.location.street"
                v-model:street-additional="strataDetails.location.streetAdditional"
                v-model:city="strataDetails.location.city"
                v-model:region="strataDetails.location.region"
                v-model:postal-code="strataDetails.location.postalCode"
                :schema-prefix="'location.'"
                :form-ref="strataDetailsFormRef"
                :disabled-fields="['country', 'region']"
                :excluded-fields="['streetName', 'streetNumber', 'unitNumber']"
                :use-location-desc-label="true"
              />
            </div>
          </ConnectFormSection>
          <ConnectFormSection
            v-if="isRegistrationRenewal"
            :title="$t('strr.units.title')"
            :error="shouldShowPrimaryUnitsError"
          >
            <FormStrataUnitList
              v-model="strataDetails.unitListings.primary"
              name="unitListings.primary"
              :is-required="isRegistrationRenewal"
              :show-error="shouldShowPrimaryUnitsError"
              :error-message="$t('strr.units.error')"
            />
          </ConnectFormSection>
          <div v-if="strataDetails.buildings.length === 0" class="ml-[220px] mt-10">
            <UButton
              :label="$t('strr.label.addBuilding')"
              class="px-5 py-3"
              color="primary"
              icon="i-mdi-home-plus"
              variant="outline"
              @click="addNewEmptyBuilding()"
            />
          </div>
          <div v-if="strataDetails.buildings.length" class="h-px w-full border-b border-gray-100" />
          <div
            v-for="building, i in strataDetails.buildings"
            :key="'building' + i"
            class="space-y-10"
          >
            <ConnectFormSection
              :title="`${$t('strr.section.subTitle.strataBuilding')} ${ i + 2 }`"
              :error="hasFormErrors(strataDetailsFormRef, [
                `buildings.${i}.country`,
                `buildings.${i}.street`,
                `buildings.${i}.city`,
                `buildings.${i}.region`,
                `buildings.${i}.postalCode`
              ])"
            >
              <div class="space-y-10">
                <div class="flex flex-col gap-5 sm:flex-row-reverse">
                  <div>
                    <UButton
                      :label="$t('word.Remove')"
                      class="border border-blue-500 sm:border-0"
                      color="primary"
                      trailing-icon="i-mdi-close"
                      variant="ghost"
                      @click="removeBuildingAtIndex(i)"
                    />
                  </div>
                  <div class="max-w-bcGovInput grow">
                    <ConnectFormAddress
                      :id="`strata-building-${i}`"
                      v-model:country="building.country"
                      v-model:street="building.street"
                      v-model:street-additional="building.streetAdditional"
                      v-model:city="building.city"
                      v-model:region="building.region"
                      v-model:postal-code="building.postalCode"
                      :schema-prefix="`buildings.${i}`"
                      :form-ref="strataDetailsFormRef"
                      :disabled-fields="['country', 'region']"
                      :excluded-fields="['streetName', 'streetNumber', 'unitNumber']"
                    />
                  </div>
                </div>
              </div>
            </ConnectFormSection>
            <ConnectFormSection
              v-if="isRegistrationRenewal"
              :title="$t('strr.units.title')"
              :error="shouldShowAdditionalUnitsError(i)"
            >
              <FormStrataUnitList
                v-model="strataDetails.unitListings.additional[i]"
                :name="`unitListings.additional.${i}`"
                :is-required="isRegistrationRenewal"
                :show-error="shouldShowAdditionalUnitsError(i)"
                :error-message="$t('strr.units.error')"
              />
            </ConnectFormSection>
            <div v-if="i === strataDetails.buildings.length - 1" class="ml-[220px] mt-10">
              <UButton
                :label="$t('strr.label.addBuilding')"
                class="px-5 py-3"
                color="primary"
                icon="i-mdi-home-plus"
                variant="outline"
                @click="addNewEmptyBuilding()"
              />
            </div>
          </div>
        </div>
      </ConnectPageSection>
    </UForm>

    <UForm
      ref="documentFormRef"
      :state="docStore.storedDocuments"
      :schema="getDocumentSchema()"
    >
      <ConnectPageSection
        class="bg-white"
        :heading="{ label: $t('label.supportingDocs'), labelClass: 'font-bold md:ml-6' }"
      >
        <div class="space-y-10 py-10">
          <ConnectFormSection
            :title="$t('label.fileUpload')"
            :error="hasFormErrors(documentFormRef, ['documents'])"
          >
            <div class="max-w-bcGovInput">
              <UFormGroup
                name="documents"
                :ui="{
                  help: 'mt-2 ml-10',
                  label: { base: 'pt-0 font-normal' }
                }"
              >
                <DocumentUploadButton
                  id="supporting-documents"
                  :label="$t('label.chooseDocsOpt')"
                  accept="application/pdf,image/jpeg"
                  :is-required="false"
                  :is-invalid="isComplete && hasFormErrors(documentFormRef, ['documents'])"
                  help-id="supporting-documents-help"
                  @change="(e: File[]) => e[0] ? docStore.addStoredDocument(e[0]) : undefined"
                  @error="strataModal.openStrataDocUploadErrorModal"
                />

                <template #label>
                  <i18n-t keypath="text.addAllReqDocs" scope="global">
                    <template #reqDocsLink>
                      <UButton
                        :label="$t('link.reqDocs')"
                        :to="rtc.requiredDocsUrl"
                        :padded="false"
                        variant="link"
                        target="_blank"
                        class="underline"
                        :ui="{
                          icon: { size: { sm: 'h-4 w-4' } },
                          gap: { sm: 'gap-x-1.5' }
                        }"
                      />
                    </template>
                    <template #prReqLink>
                      <UButton
                        :label="$t('link.doesPrApply')"
                        :to="rtc.doesPrApplyUrl"
                        :padded="false"
                        variant="link"
                        target="_blank"
                        class="underline"
                        trailing-icon="i-mdi-open-in-new"
                        :ui="{
                          icon: { size: { sm: 'h-4 w-4' } },
                          gap: { sm: 'gap-x-1.5' }
                        }"
                      />
                    </template>
                  </i18n-t>
                </template>

                <template #help>
                  <span id="supporting-documents-help">
                    {{ $t('hint.docUpload') }}
                  </span>
                </template>

                <template #error="{ error }">
                  <span id="supporting-documents-help">
                    {{ error }}
                  </span>
                </template>
              </UFormGroup>
              <DocumentList class="pt-4" />
            </div>
          </ConnectFormSection>
        </div>
      </ConnectPageSection>
    </UForm>
  </div>
</template>
