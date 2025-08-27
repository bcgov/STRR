<script setup lang="ts">
import DocumentUploadSelect from '~/components/document/upload/Select.vue'

const { t } = useI18n()
const exStore = useExaminerStore()
const docStore = useExaminerDocumentStore()
const { activeReg, isApplication, activeHeader } = storeToRefs(exStore)

const { isBlUploadOpen, isPrUploadOpen } = storeToRefs(docStore)
const showDocumentUpload = computed(() => isBlUploadOpen.value || isPrUploadOpen.value)

const handleUploadDocument = async (uiDoc: UiDocument, appRegNumber: string | number) => {
  if (!isApplication.value) {
    await docStore.addDocumentToRegistration(uiDoc, appRegNumber as number)
  }
  docStore.closeUpload()
}
</script>

<template>
  <div v-if="showDocumentUpload" class="app-inner-container">
    <div class="mb-8 rounded bg-white py-6">
      <div class="mb-4 grid grid-cols-12 items-start gap-4 px-10">
        <div class="col-span-2">
          <span class="text-lg font-bold">{{ t('strr.label.fileUpload') }}</span>
        </div>
        <div class="col-span-9">
          <div data-upload-full-width>
            <BaseUploadAdditionalDocuments
              :component="DocumentUploadSelect"
              :app-reg-number="isApplication ? activeHeader.applicationNumber : activeReg.id"
              :selected-doc-type="docStore.selectedDocType"
              :is-registration="!isApplication"
              @upload-document="handleUploadDocument"
              @reset-doc-type="docStore.selectedDocType = undefined"
              @close-upload="docStore.closeUpload()"
            />
          </div>
        </div>
        <div class="col-span-1 flex justify-end">
          <UButton
            :label="t('btn.cancel')"
            variant="ghost"
            size="sm"
            icon="i-mdi-close"
            @click="docStore.closeUpload()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
[data-upload-full-width] :deep(.max-w-bcGovInput) {
  max-width: 100% !important;
}
</style>
