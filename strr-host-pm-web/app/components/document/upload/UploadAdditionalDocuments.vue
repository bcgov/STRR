<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import type { Form } from '#ui/types'
const { t } = useI18n()

const docUploadHelpId = useId() // id for aria-describedby on doc select
const docFormRef = ref<Form<any>>()
const showError = ref(false)
const strrModal = useStrrModals()
const documentList = ref<UiDocument[]>([])
const docStore = useDocumentStore()

const emit = defineEmits<{
  submit: [UiDocument[]],
  cancel: [void]
}>()

const addDocumentToList = (doc: File) => {
  const uiDoc: UiDocument = {
    file: doc,
    apiDoc: {} as ApiDocument,
    name: doc.name,
    type: docStore.selectedDocType!,
    id: uuidv4(),
    loading: false,
    uploadStep: DocumentUploadStep.NOC,
    uploadDate: new Date().toISOString().split('T')[0]
  }

  documentList.value.push(uiDoc)
  docStore.selectedDocType = undefined
  showError.value = false
  docFormRef.value?.submit() // submit the form to reset validation
}

const removeDocumentFromList = (uiDoc: UiDocument) => {
  const index = documentList.value.findIndex(item => uiDoc.id === item.id)
  documentList.value.splice(index, 1)
}

const cancelDocumentsUpload = () => {
  documentList.value = []
  emit('cancel')
}

const submitDocuments = () => {
  if (documentList.value.length > 0) {
    emit('submit', documentList.value)
  } else {
    showError.value = true
    docFormRef.value?.submit() // submit the form to reset validation
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
      <div class="">
        <ConnectFormSection class="!p-0">
          <div class="max-w-bcGovInput space-y-5">
            <span aria-hidden="true">{{ t('text.uploadReqDocs') }}</span>
            <UFormGroup name="documentUpload" :ui="{ help: 'mt-2 ml-10' }">
              <DocumentUploadSelect
                id="additional-documents"
                :label="t('label.chooseDocs')"
                :is-invalid="showError"
                :error="showError"
                :help-id="docUploadHelpId"
                accept="application/pdf"
                @change="addDocumentToList"
                @cancel="docStore.selectedDocType = undefined"
                @error="e => strrModal.openErrorModal(
                  t(`error.docUpload.${e}.title`), t(`error.docUpload.${e}.description`), false
                )"
                @reset="docStore.selectedDocType = undefined"
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
      </div>
      <div class="mt-10 flex justify-end gap-2">
        <UButton
          :label="t('btn.cancel')"
          class="px-5"
          variant="outline"
          size="md"
          @click="cancelDocumentsUpload()"
        />
        <UButton
          :label="t('btn.submit')"
          class="px-5 font-bold"
          size="md"
          type="submit"
          @click="submitDocuments()"
        />
      </div>
    </UForm>
  </div>
</template>
