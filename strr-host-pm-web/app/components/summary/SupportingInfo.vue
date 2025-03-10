<script setup lang="ts">
import Select from '../document/upload/Select.vue'

const { t } = useI18n()
const { blInfo } = storeToRefs(useHostPropertyStore())
const { overrideApplicationWarning, showUnitDetailsForm, blRequirements } = storeToRefs(usePropertyReqStore())
const { requiredDocs, storedDocuments } = storeToRefs(useDocumentStore())

const isFileUploadOpen = ref(false)

const docStore = useDocumentStore()
const { application } = storeToRefs(useHostPermitStore())

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
            v-if="!requiredDocs.length && !overrideApplicationWarning && showUnitDetailsForm"
          >
            <div class="flex gap-2">
              <UIcon name="i-mdi-check" class="mt-[2px] size-4 text-green-600" />
              <p>{{ $t('text.noDocsReq') }}</p>
            </div>
          </div>
          <div v-else-if="!storedDocuments.length">
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
                  v-if="doc.uploadStep === DocumentUploadStep.NOC"
                  :label="`${ t('strr.label.added')} ` + doc.uploadDate"
                  size="sm"
                  class="ml-1 px-3 py-0 font-bold"
                /></span>
              <span>{{ doc.name }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="application?.header.status === ApplicationStatus.NOC_PENDING"
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
        :application-number="application!.header.applicationNumber"
        :selected-doc-type="docStore.selectedDocType"
        @upload-document="docStore.addDocumentToApplication"
        @reset-doc-type="docStore.selectedDocType = undefined"
        @close-upload="isFileUploadOpen = false"
      />
    </template>
    <template #info-license />
    <template #info-license-date />
  </ConnectInfoTable>
</template>
