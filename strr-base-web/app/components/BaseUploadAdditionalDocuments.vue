<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import type { Component } from 'vue'
import type { Form } from '#ui/types'
const { t } = useNuxtApp().$i18n
const strrModal = useStrrModals()
const docUploadHelpId = useId() // id for aria-describedby on doc select
const docFormRef = ref<Form<any>>()
const showError = ref(false)
const documentList = ref<UiDocument[]>([])
const isUploading = ref(false)
let isActive = true
onScopeDispose(() => { isActive = false })

const props = defineProps<{
    component: Component, // either DocumentUploadSelect (Host) or DocumentUploadButton (Strata)
    appRegNumber: string | number, // application or registration number to upload the doc to
    uploadDocument(uiDoc: UiDocument, appRegNumber: string | number): Promise<void>,
    isStrata?: boolean, // needed to determine which logic to use
    isRegistration?: boolean, // indicate if doc needs to be uploaded to a registration
    selectedDocType: DocumentUploadType | undefined
}>()

const emit = defineEmits<{
    uploading: [boolean],
    closeUpload: [void],
    resetDocType: [void]
}>()

const addDocumentToList = (doc: File) => {
  if (isUploading.value) { return }
  const uiDoc: UiDocument = {
    file: doc,
    apiDoc: {} as ApiDocument,
    name: doc.name,
    type: props.isStrata ? DocumentUploadType.STRATA_HOTEL_DOCUMENTATION : props.selectedDocType!,
    id: uuidv4(),
    loading: false,
    uploadStep: props.isRegistration ? DocumentUploadStep.REG_NOC : DocumentUploadStep.NOC,
    uploadDate: new Date().toISOString().split('T')[0]
  }
  documentList.value.push(uiDoc)
  emit('resetDocType')
  showError.value = false
  docFormRef.value?.submit() // submit the form to reset validation
}

const removeDocumentFromList = (uiDoc: UiDocument) => {
  if (isUploading.value) { return }
  const index = documentList.value.findIndex(item => uiDoc.id === item.id)
  documentList.value.splice(index, 1)
}

const cancelDocumentsUpload = () => {
  if (isUploading.value) { return }
  documentList.value = []
  emit('resetDocType')
  emit('closeUpload')
}

const submitDocuments = async () => {
  if (!isActive || isUploading.value) { return }
  if (documentList.value.length === 0) {
    showError.value = true
    return
  }

  isUploading.value = true
  emit('uploading', true)
  try {
    while (documentList.value.length > 0) {
      await props.uploadDocument(documentList.value[0]!, props.appRegNumber)
      if (!isActive) { return }
      documentList.value.shift()
    }
    emit('closeUpload')
  } catch {
    // The upload handler displays the error; retain the remaining files for retry.
  } finally {
    isUploading.value = false
    if (isActive) { emit('uploading', false) }
  }
}

const handleFileChange = (file: File | File[]) => {
  if (props.isStrata && Array.isArray(file)) {
    // if 'component' is Button for strata - array of Files
    addDocumentToList(file[0]!)
  } else {
    // if 'component' is Select (for hosts) - one File
    addDocumentToList(file as File)
  }
}

const handleFileError = (error: 'fileSize' | 'fileType' | { reason: 'fileSize' | 'fileType' }[]) => {
  const reason = typeof error === 'string' ? error : error[0]?.reason
  if (reason) {
    strrModal.openErrorModal(
      t(`error.docUpload.${reason}.title`), t(`error.docUpload.${reason}.description`), false)
  }
}

// validate that at least one document is added to upload list
const validateDocuments = () => {
  return documentList.value.length === 0
    ? [{ path: 'documentUpload', message: t('text.missingDocuments') }]
    : []
}
</script>
<template>
  <div class="-ml-4">
    <UForm
      ref="docFormRef"
      :state="documentList"
      :validate="validateDocuments"
      :validate-on="['submit']"
    >
      <fieldset :disabled="isUploading">
        <ConnectFormSection class="!p-0">
          <div class="max-w-bcGovInput space-y-5">
            <span aria-hidden="true">{{ t('text.uploadReqDocs') }}</span>
            <UFormGroup
              name="documentUpload"
              :ui="{ help: 'mt-2 ml-10' }"
            >
              <component
                :is="component"
                id="upload-additional-documents"
                :label="t('label.chooseDocs')"
                accept="application/pdf,image/jpeg"
                :is-required="props.isStrata"
                :is-disabled="isUploading"
                :is-invalid="showError"
                :error="showError"
                :help-id="props.isStrata ? 'supporting-documents-help' : docUploadHelpId"
                @change="handleFileChange($event)"
                @cancel="emit('resetDocType')"
                @error="handleFileError"
                @reset="emit('resetDocType')"
              />

              <template #help>
                <span :id="docUploadHelpId">
                  {{ t('hint.docUpload') }}
                </span>
              </template>

              <template #error="{ error }">
                <div class="ml-8">
                  {{ error }}
                </div>
              </template>
            </UFormGroup>
            <DocumentListItem
              :documents="documentList"
              @remove="removeDocumentFromList"
            />
          </div>
        </ConnectFormSection>
      </fieldset>
      <div class="mt-10 flex justify-end gap-2">
        <UButton
          :label="t('btn.cancel')"
          class="px-5"
          variant="outline"
          size="md"
          :disabled="isUploading"
          @click="cancelDocumentsUpload()"
        />
        <UButton
          :label="t('btn.submit')"
          class="px-5 font-bold"
          size="md"
          type="submit"
          :loading="isUploading"
          @click="submitDocuments()"
        />
      </div>
    </UForm>
  </div>
</template>
