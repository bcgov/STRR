<script setup lang="ts">
import type { Form } from '#ui/types'

const config = useRuntimeConfig().public
const reqStore = usePropertyReqStore()
const docStore = useDocumentStore()
const propStore = useHostPropertyStore()

const props = defineProps<{ isComplete: boolean }>()

defineEmits<{
  returnToStart: [void]
}>()

const blFormRef = ref<Form<any>>()
const docFormRef = ref<Form<any>>()

const docUploadHelpId = useId() // id for aria-describedby on doc select

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
            :label="$t('link.learnMore')"
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
        <ConnectChecklistValidated
          v-if="!reqStore.overrideApplicationWarning"
          :is-complete="isComplete"
          :title="$t('text.followingDocsRequired')"
          :items="docStore.requiredDocs"
        />
        <ConnectChecklistBasic
          v-else
          :title="$t('text.followingDocsMayBeRequired')"
          :items="docStore.potentialRequiredDocs"
        />

        <ConnectPageSection :aria-label="$t('text.uploadReqDocs')">
          <UForm
            ref="docFormRef"
            :state="docStore.requiredDocs"
            :validate="docStore.validateRequiredDocuments"
            :validate-on="['submit']"
          >
            <div class="py-10">
              <ConnectFormSection
                :title="$t('label.fileUpload')"
                :error="isComplete && hasFormErrors(docFormRef, ['documentUpload'])"
              >
                <div class="space-y-5">
                  <span aria-hidden="true">{{ $t('text.uploadReqDocs') }}</span>
                  <UFormGroup
                    name="documentUpload"
                    :ui="{ help: 'mt-2 ml-10' }"
                  >
                    <DocumentUploadSelect
                      id="supporting-documents"
                      :label="$t('label.chooseDocs')"
                      :is-invalid="isComplete && hasFormErrors(docFormRef, ['documentUpload'])"
                      :error="isComplete && hasFormErrors(docFormRef, ['documentUpload'])"
                      :is-required="docStore.requiredDocs.length > 0"
                      :help-id="docUploadHelpId"
                      accept=".pdf"
                      @change="docStore.addStoredDocument"
                      @cancel="docStore.selectedDocType = undefined"
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

      <!-- TODO: add aria label to page section ?? -->
      <ConnectPageSection>
        <UForm
          ref="blFormRef"
          :schema="propStore.blInfoSchema"
          :state="propStore.blInfo"
        >
          <div class="space-y-10 py-10">
            <p
              v-if="docStore.requiredDocs.length === 0"
              class="px-4 md:px-10"
            >
              <!-- TODO: get text or remove -->
              Lorem ipsum why would I want this provide this?
              <!-- {{ $t('strr.text.requireBusLicense') }} -->
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
