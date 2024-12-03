<script setup lang="ts">
import type { Form } from '#ui/types'

const reqStore = usePropertyReqStore()
const docStore = useDocumentStore()
const propStore = useHostPropertyStore()

const props = defineProps<{ isComplete: boolean }>()

const blFormRef = ref<Form<any>>()
const docFormRef = ref<Form<any>>()

function validateDocuments () {
  if (!docStore.requiredDocs.every(doc => doc.isValid === true)) {
    return [{ path: 'documentUpload', message: 'Missing required documents. Please see above for details.' }]
  } else {
    return []
  }
}

// revalidate uploaded documents when user adding docs if step marked as complete
watch(
  () => docStore.requiredDocs,
  () => {
    if (props.isComplete) {
      docFormRef.value?.validate(undefined, { silent: true })
    }
  },
  { immediate: true, deep: true }
)

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(blFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <div class="flex flex-col gap-10">
    <p>
      To determine the types of documentation you’ll need, please complete Step 1 of the application first.
      Return to the step to finish it
    </p>
    <div>
      <p class="font-bold">
        <!-- {{ $t('strr.text.applicationMustInclude') }} -->
        The following documentation is required for this registration:
      </p>
      <ul class="mt-5 list-outside list-disc space-y-3 pl-10">
        <li
          v-for="doc, i in docStore.requiredDocs"
          :key="i"
          :class="doc.isValid || (!doc.isValid && isComplete)
            ? 'flex items-center gap-1 list-none -ml-6'
            : ''"
        >
          <UIcon v-if="doc.isValid" name="i-mdi-check" class="size-5 text-green-600" />
          <UIcon v-else-if="!doc.isValid && isComplete" name="i-mdi-close" class="mt-[2px] size-5 text-red-600" />
          <span>{{ doc.label }}</span>
        </li>
      </ul>
    </div>

    <UForm
      ref="docFormRef"
      :state="docStore.requiredDocs"
      :validate="validateDocuments"
      :validate-on="['submit']"
    >
      <ConnectPageSection>
        <div class="py-10">
          <ConnectFormSection
            title="File Upload"
            :error="isComplete && hasFormErrors(docFormRef, ['documentUpload'])"
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
        </div>
      </ConnectPageSection>
    </UForm>

    <UForm
      ref="blFormRef"
      :schema="propStore.blInfoSchema"
      :state="propStore.blInfo"
    >
      <ConnectPageSection :aria-label="$t('strr.label.supportingInfo')">
        <div class="space-y-10 py-10">
          <p class="px-4 md:px-10">
            {{ $t('strr.text.requireBusLicense') }}
          </p>

          <ConnectFormSection
            title="Local Government Business Licence"
            :error="isComplete && hasFormErrors(blFormRef, ['businessLicense', 'businessLicenseExpiryDate'])"
          >
            <ConnectFormFieldGroup
              id="property-business-license"
              v-model="propStore.blInfo.businessLicense"
              :aria-label="$t('strr.label.businessLicense')"
              :help="$t('strr.hint.businessLicense')"
              name="businessLicense"
              :placeholder="$t('strr.label.businessLicense')"
            />
          </ConnectFormSection>

          <ConnectFormSection
            :title="'   '"
          >
            <ConnectFormDateInput
              name="businessLicenseExpiryDate"
              :initial-date="propStore.blInfo.businessLicenseExpiryDate
                ? dateStringToDate(propStore.blInfo.businessLicenseExpiryDate)
                : undefined"
              :min-date="propStore.minBlDate"
              :max-date="propStore.maxBlDate"
              :help="$t('text.defaultDateFormat')"
              :placeholder="$t('strr.label.businessLicenseDate')"
              @selection="propStore.blInfo.businessLicenseExpiryDate = $event ? dateToString($event) : ''"
            />
          </ConnectFormSection>
        </div>
      </ConnectPageSection>
    </UForm>
  </div>
</template>
