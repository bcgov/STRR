<script setup lang="ts">
import type { Form } from '#ui/types'
import {
  ProofOfIdentityDocuments, ProofOfTenancyDocuments, ProofOfPrincipalResidenceDocuments, BusinessLicenceDocuments,
  ProofOfFractionalOwnershipDocuments, StrataDocuments
} from '~/enums/document-upload-type'

const { t } = useI18n()
const config = useRuntimeConfig().public
const reqStore = usePropertyReqStore()
const docStore = useDocumentStore()
const propStore = useHostPropertyStore()
const strrModal = useStrrModals()
const { openSupportingDocumentsHelpModal } = useHostPmModals()
const { isNewPrDocumentsListEnabled, isEnhancedDocumentUploadEnabled } = useHostFeatureFlags()

const { propertyReqs, prRequirements } = storeToRefs(reqStore)
const { unitDetails } = storeToRefs(propStore)

const props = defineProps<{
  docUploadStep: DocumentUploadStep,
  isComplete: boolean
}>()

defineEmits<{
  returnToStart: [void]
}>()

const blFormRef = ref<Form<any>>()
const docFormRef = ref<Form<any>>()

const docUploadHelpId = useId() // id for aria-describedby on doc select
const blExempt = computed(() => reqStore.blRequirements.isBusinessLicenceExempt)
// revalidate uploaded documents when user adding/removing docs if step marked as complete
watch(
  () => docStore.requiredDocs,
  async () => {
    if (props.isComplete) {
      await validateForm(docFormRef.value, props.isComplete)
    }
  },
  { immediate: true, deep: true }
)

const showEnhancedDocumentUpload = computed(() =>
  isEnhancedDocumentUploadEnabled.value && isNewPrDocumentsListEnabled.value
)

// display conditions for document upload types

const isPrRequiredWithoutExemption = computed(() =>
  propertyReqs.value.isPrincipalResidenceRequired &&
  prRequirements.value.prExemptionReason === undefined
)

const showProofOfIdentity = computed(() => isPrRequiredWithoutExemption.value &&
  unitDetails.value.hostType !== undefined)

const showProofOfPr = computed(() =>
  isPrRequiredWithoutExemption.value ||
  prRequirements.value.prExemptionReason === PrExemptionReason.FARM_LAND
)

const showProofOfFractionalOwnership = computed(() =>
  prRequirements.value.prExemptionReason === PrExemptionReason.FRACTIONAL_OWNERSHIP
)

const showBusinessLicence = computed(() =>
  propertyReqs.value.isBusinessLicenceRequired && !blExempt.value
)

const showProofOfTenancy = computed(() =>
  unitDetails.value.hostType === PropertyHostType.LONG_TERM_TENANT &&
  isPrRequiredWithoutExemption.value
)

const showStrataDocs = computed(() =>
  prRequirements.value.prExemptionReason === PrExemptionReason.STRATA_HOTEL
)

// configurations for document upload dropdowns
const documentUploadConfig = computed<DocumentUploadConfig[]>(() => {
  const config: DocumentUploadConfig[] = [
    {
      testId: 'proof-of-identity-upload',
      title: t('label.proofOfIdentity'),
      fieldName: 'identityDocUpload',
      uploadType: ProofOfIdentityDocuments,
      isDisplayed: showProofOfIdentity.value
    },
    {
      testId: 'proof-of-pr-upload',
      title: t('label.proofOfPr'),
      fieldName: 'prDocUpload',
      uploadType: ProofOfPrincipalResidenceDocuments,
      isDisplayed: showProofOfPr.value
    },
    {
      testId: 'proof-of-fractional-ownership-upload',
      title: t('label.proofOfFractionalOwnership'),
      fieldName: 'fractionalOwnerDocUpload',
      uploadType: ProofOfFractionalOwnershipDocuments,
      isDisplayed: showProofOfFractionalOwnership.value
    },
    {
      testId: 'business-licence-upload',
      title: t('label.localGovBL'),
      fieldName: 'blDocUpload',
      uploadType: BusinessLicenceDocuments,
      isDisplayed: showBusinessLicence.value
    },
    {
      testId: 'proof-of-tenancy-upload',
      title: t('label.proofOfTenancy'),
      fieldName: 'tenancyDocUpload',
      uploadType: ProofOfTenancyDocuments,
      isDisplayed: showProofOfTenancy.value
    },
    {
      testId: 'strata-docs-upload',
      title: t('label.supportingStrataDocs'),
      fieldName: 'strataDocUpload',
      uploadType: StrataDocuments,
      isDisplayed: showStrataDocs.value
    }
  ]

  return config.filter(docConfig => docConfig.isDisplayed)
})

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(blFormRef.value, props.isComplete)
    await validateForm(docFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <div class="flex flex-col gap-10">
    <p class="-mt-12">
      <i18n-t keypath="text.addAllReqDocs" scope="global">
        <template #link>
          <UButton
            :label="$t('link.viewRequiredDocs')"
            :to="config.housingLearnMoreUrl"
            :padded="false"
            variant="link"
            target="_blank"
            class="text-base underline"
            trailing-icon="i-mdi-open-in-new"
          />
        </template>
      </i18n-t>
    </p>

    <!-- empty state -->
    <!-- TODO: maybe use different boolean flag ?  -->
    <div v-if="!reqStore.showUnitDetailsForm">
      <p>{{ $t('text.toDetermineDocsReturnToStart') }}</p>
      <UButton
        :label="$t('btn.returnToStep')"
        size="bcGov"
        variant="link"
        :padded="false"
        class="text-base underline"
        @click="$emit('returnToStart')"
      />
    </div>

    <div
      v-else
      class="flex flex-col gap-10"
    >
      <div
        v-if="docStore.requiredDocs.length > 0 || reqStore.overrideApplicationWarning"
        class="flex flex-col gap-10"
      >
        <ConnectPageSection :aria-label="$t('text.uploadReqDocs')">
          <div class="px-4 pt-10 md:px-10">
            <ConnectChecklistValidated
              v-if="!reqStore.overrideApplicationWarning"
              data-testid="required-docs-checklist"
              :is-complete="isComplete"
              :title="$t('text.followingDocsRequired')"
              :items="docStore.requiredDocs"
            />
            <ConnectChecklistBasic
              v-else
              data-testid="potential-docs-checklist"
              :title="$t('text.followingDocsMayBeRequired')"
              :items="docStore.potentialRequiredDocs"
            />
            <UButton
              v-if="isNewPrDocumentsListEnabled"
              :label="$t('modal.supportingDocumentsHelp.triggerBtn')"
              leading-icon="i-mdi-info-outline"
              variant="link"
              class="mt-6 text-base font-bold"
              :padded="false"
              :ui="{ gap: { sm: 'gap-x-1.5' } }"
              data-testid="pr-docs-help-modal"
              @click="openSupportingDocumentsHelpModal"
            />
          </div>
          <UForm
            ref="docFormRef"
            :state="docStore.requiredDocs"
            :validate="showEnhancedDocumentUpload
              ? docStore.validateDocumentDropdowns
              : docStore.validateRequiredDocuments
            "
            :validate-on="['submit']"
            class="pb-10"
          >
            <div
              v-if="showEnhancedDocumentUpload"
              data-testid="enhanced-doc-upload"
            >
              <DocumentUploadType
                v-for="docConfig in documentUploadConfig"
                :key="docConfig.fieldName"
                :data-testid="docConfig.testId"
                :title="docConfig.title"
                :form-field-name="docConfig.fieldName"
                :doc-upload-type="docConfig.uploadType"
                :doc-upload-step="docUploadStep"
                :has-error="isComplete && hasFormErrors(docFormRef, [docConfig.fieldName])"
                class="pt-10"
              />
            </div>
            <div
              v-else
              class="pt-10"
              data-testid="standard-doc-upload"
            >
              <ConnectFormSection
                :title="$t('label.fileUpload')"
                :error="isComplete && hasFormErrors(docFormRef, ['documentUpload'])"
              >
                <div class="max-w-bcGovInput space-y-5">
                  <span aria-hidden="true">{{ $t('text.uploadReqDocs') }}</span>
                  <UFormGroup
                    name="documentUpload"
                    :ui="{ help: 'mt-2 ml-10' }"
                  >
                    <DocumentUploadSelect
                      id="supporting-documents"
                      data-testid="document-upload-select"
                      :label="$t('label.chooseDocs')"
                      :is-invalid="isComplete && hasFormErrors(docFormRef, ['documentUpload'])"
                      :error="isComplete && hasFormErrors(docFormRef, ['documentUpload'])"
                      :is-required="docStore.requiredDocs.length > 0"
                      :help-id="docUploadHelpId"
                      accept="application/pdf,image/jpeg"
                      @change="docStore.addStoredDocument($event, docUploadStep)"
                      @cancel="docStore.selectedDocType = undefined"
                      @error="e => strrModal.openErrorModal(
                        $t(`error.docUpload.${e}.title`), $t(`error.docUpload.${e}.description`), false
                      )"
                      @reset="docStore.selectedDocType = undefined"
                    />

                    <template #help>
                      <span :id="docUploadHelpId">
                        {{ $t('hint.docUpload') }}
                      </span>
                    </template>

                    <template #error="{ error }">
                      <span :id="docUploadHelpId">
                        {{ error }}
                      </span>
                    </template>
                  </UFormGroup>
                  <DocumentList />
                </div>
              </ConnectFormSection>
            </div>
          </UForm>
        </ConnectPageSection>
      </div>

      <UAlert
        v-else
        data-testid="alert-no-docs-required"
        color="yellow"
        :title="$t('text.noDocsReq')"
        icon="i-mdi-check-circle"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          icon: { base: 'text-outcomes-approved' },
          title: 'text-base font-bold',
        }"
      />

      <ConnectPageSection
        v-if="!blExempt"
        data-testid="bl-section-info"
      >
        <UForm
          ref="blFormRef"
          :schema="propStore.blInfoSchema"
          :state="propStore.blInfo"
        >
          <div class="space-y-10 py-10">
            <p class="px-4 md:px-10">
              {{ $t('text.ifYouHaveBl') }}
            </p>
            <ConnectFormSection
              :title="$t('label.localGovBL')"
              :error="isComplete && hasFormErrors(blFormRef, ['businessLicense', 'businessLicenseExpiryDate'])"
            >
              <ConnectFormFieldGroup
                id="property-business-license"
                v-model="propStore.blInfo.businessLicense"
                :aria-label="$t('label.businessLicenseNumberOpt')"
                :help="$t('strr.hint.businessLicense')"
                name="businessLicense"
                :placeholder="$t('label.businessLicenseNumberOpt')"
              />
            </ConnectFormSection>

            <ConnectFormSection :title="'   '">
              <ConnectFormDateInput
                name="businessLicenseExpiryDate"
                :initial-date="propStore.blInfo.businessLicenseExpiryDate
                  ? dateStringToDate(propStore.blInfo.businessLicenseExpiryDate)
                  : undefined"
                :min-date="propStore.minBlDate"
                :max-date="propStore.maxBlDate"
                :help="$t('text.defaultDateFormat')"
                :placeholder="$t('label.businessLicenseExpiryDateOpt')"
                @selection="propStore.blInfo.businessLicenseExpiryDate = $event ? dateToString($event) : ''"
              />
            </ConnectFormSection>
          </div>
        </UForm>
      </ConnectPageSection>
    </div>
  </div>
</template>
