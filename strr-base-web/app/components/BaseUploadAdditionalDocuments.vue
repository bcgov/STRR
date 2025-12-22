<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import type { DefineComponent } from 'vue'
import type { Form } from '#ui/types'
const { t } = useNuxtApp().$i18n
const strrModal = useStrrModals()
const docUploadHelpId = useId() // id for aria-describedby on doc select
const docFormRef = ref<Form<any>>()
const showError = ref(false)
const documentList = ref<UiDocument[]>([])

const props = defineProps<{
    component: DefineComponent, // either DocumentUploadSelect (Host) or DocumentUploadButton (Strata)
    appRegNumber: string | number, // application or registration number to upload the doc to
    isStrata?: boolean, // needed to determine which logic to use
    isRegistration?: boolean, // indicate if doc needs to be uploaded to a registration
    selectedDocType: DocumentUploadType | undefined
}>()

const emit = defineEmits<{
    uploadDocument: [uiDoc: UiDocument, appRegNumber: string | number],
    closeUpload: [void],
    resetDocType: [void]
}>()

const addDocumentToList = (doc: File) => {
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
  const index = documentList.value.findIndex(item => uiDoc.id === item.id)
  documentList.value.splice(index, 1)
}

const cancelDocumentsUpload = () => {
  documentList.value = []
  emit('resetDocType')
  emit('closeUpload')
}

const submitDocuments = async () => {
  if (documentList.value.length > 0) {
    for (const doc of documentList.value) {
      await emit('uploadDocument', doc, props.appRegNumber)
    }
    documentList.value = []
    emit('closeUpload')
  } else {
    showError.value = true
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
      <div>
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
                :is-invalid="showError"
                :error="showError"
                :help-id="props.isStrata ? 'supporting-documents-help' : docUploadHelpId"
                @change="handleFileChange($event)"
                @cancel="emit('resetDocType')"
                @error="e => strrModal.openErrorModal(
                  t(`error.docUpload.${e}.title`), t(`error.docUpload.${e}.description`), false)"
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
