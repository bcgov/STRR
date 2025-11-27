<script setup lang="ts">
import Select from '../document/upload/Select.vue'

const props = withDefaults(defineProps<{
  isDashboard?: boolean
}>(), {
  isDashboard: false
})

const { t } = useI18n()
const { blInfo } = storeToRefs(useHostPropertyStore())
const { overrideApplicationWarning, showUnitDetailsForm, blRequirements } = storeToRefs(usePropertyReqStore())
const { requiredDocs, storedDocuments } = storeToRefs(useDocumentStore())

const isFileUploadOpen = ref(false)

const docStore = useDocumentStore()
const { application, registration, needsBusinessLicenseDocumentUpload } = storeToRefs(useHostPermitStore())

const isRegistration = computed((): boolean => !!application.value?.header.registrationStartDate)
const hasRegistrationNoc = computed(() => registration.value?.nocStatus === RegistrationNocStatus.NOC_PENDING)
// used to display Add New Document button
const isNocPending = computed(() =>
  application.value?.header.status === ApplicationStatus.NOC_PENDING ||
  application.value?.header.status === ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING ||
  registration.value?.nocStatus === RegistrationNocStatus.NOC_PENDING
)

// Show upload button if NOC is pending OR business license is required
const showUploadButton = computed(() => isNocPending.value || needsBusinessLicenseDocumentUpload.value)

// step 3 items
const supportingInfo = computed(() => {
  const items = [
    {
      label: t('strr.label.supportingDocs'),
      info: storedDocuments.value,
      slot: 'documents'
    },
    ...(isFileUploadOpen.value ? [{ label: 'File Upload', info: '', slot: 'upload' }] : []),
    { label: '', info: '', slot: 'border' }
  ]
  if (!blRequirements.value.isBusinessLicenceExempt) {
    items.push(
      {
        label: t('strr.label.businessLicense'),
        info: blInfo.value.businessLicense || t('text.notEntered'),
        slot: 'license'
      },
      {
        label: t('strr.label.businessLicenseDate'),
        info: blInfo.value.businessLicenseExpiryDate || t('text.notEntered'),
        slot: 'license-date'
      }
    )
  }
  return items
})

const handleUploadDocument = async (uiDoc: UiDocument, appRegNumber: string | number) => {
  if (isRegistration.value && (hasRegistrationNoc.value || needsBusinessLicenseDocumentUpload.value)) {
    await docStore.addDocumentToRegistration(uiDoc, appRegNumber as number)
  } else {
    await docStore.addDocumentToApplication(uiDoc, appRegNumber as string)
  }
}

</script>
<template>
  <ConnectInfoTable :items="supportingInfo">
    <template #label-border>
      <div class="h-px w-full border-b border-gray-100" />
    </template>
    <template #info-border>
      <div class="-ml-4 h-px w-full border-b border-gray-100" />
    </template>
    <template #info-documents>
      <div class="justify-between gap-2 sm:flex">
        <div
          id="stored-documents-list"
          class="space-y-1"
        >
          <div
            v-if="!props.isDashboard && !requiredDocs.length && !overrideApplicationWarning && showUnitDetailsForm"
          >
            <div class="flex gap-2">
              <UIcon name="i-mdi-check" class="mt-[2px] size-4 text-green-600" />
              <p>{{ $t('text.noDocsReq') }}</p>
            </div>
          </div>
          <div v-else-if="!storedDocuments.length && !props.isDashboard">
            <p>{{ $t('text.noDocsUploaded') }}</p>
          </div>
          <div
            v-for="doc in storedDocuments"
            :key="doc.id"
            class="flex w-full gap-2"
          >
            <UIcon
              name="i-mdi-paperclip"
              class="size-6 text-blue-500"
            />
            <div
              class="flex flex-col"
              data-test-id="stored-document"
            >
              <span class="text-sm font-bold">{{ t(`form.pr.docType.${doc.type}`) }}
                <UBadge
                  v-if="[DocumentUploadStep.NOC, DocumentUploadStep.REG_NOC].includes(doc.uploadStep)"
                  :label="`${ t('strr.label.added')} ` + doc.uploadDate"
                  size="sm"
                  class="ml-1 px-3 py-0 font-bold"
                /></span>
              <span>{{ doc.name }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="showUploadButton"
          class="mt-4 md:mt-0"
        >
          <UButton
            :label="t('btn.addNewDocuments')"
            icon="mdi-plus"
            data-test-id="add-noc-doc-btn"
            :disabled="isFileUploadOpen === true"
            @click="isFileUploadOpen = true"
          />
        </div>
      </div>
    </template>
    <template
      v-if="isFileUploadOpen"
      #info-upload
    >
      <BaseUploadAdditionalDocuments
        :component="Select"
        :app-reg-number="
          isRegistration && (hasRegistrationNoc || needsBusinessLicenseDocumentUpload)
            ? (registration?.id ?? application?.header.registrationId)
            : application?.header.applicationNumber
        "
        :selected-doc-type="docStore.selectedDocType"
        :is-registration="isRegistration"
        @upload-document="handleUploadDocument"
        @reset-doc-type="docStore.selectedDocType = undefined"
        @close-upload="isFileUploadOpen = false"
      />
    </template>
    <template #info-license />
    <template #info-license-date />
  </ConnectInfoTable>
</template>
