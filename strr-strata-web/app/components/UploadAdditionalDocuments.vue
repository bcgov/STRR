<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import type { Form } from '#ui/types'
const { t } = useI18n()

const emit = defineEmits<{
  closeUpload: [void]
}>()

const docStore = useDocumentStore()
const { application } = storeToRefs(useStrrStrataStore())
const strataModal = useStrataModals()
const docUploadHelpId = useId() // id for aria-describedby on doc select
const docFormRef = ref<Form<any>>()
const showError = ref(false)
const documentList = ref<UiDocument[]>([])

const addDocumentToList = (doc: File) => {
  const uiDoc: UiDocument = {
    file: doc,
    apiDoc: {} as ApiDocument,
    name: doc.name,
    type: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
    id: uuidv4(),
    loading: false,
    uploadStep: DocumentUploadStep.NOC,
    uploadDate: new Date().toISOString().split('T')[0]
  }

  documentList.value.push(uiDoc)
  showError.value = false
  docFormRef.value?.submit() // submit the form to reset validation
}

const removeDocumentFromList = (uiDoc: UiDocument) => {
  const index = documentList.value.findIndex(item => uiDoc.id === item.id)
  documentList.value.splice(index, 1)
}

const cancelDocumentsUpload = () => {
  documentList.value = []
  showError.value = false
  emit('closeUpload')
}

const submitDocuments = async () => {
  if (documentList.value.length > 0) {
    const applicationNumber = application.value!.header.applicationNumber

    for (const doc of documentList.value) {
      await docStore.addDocumentToApplication(doc, applicationNumber)
    }
    documentList.value = []
    emit('closeUpload')
  } else {
    showError.value = true
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
  <UForm
    ref="docFormRef"
    :state="documentList"
    :validate="validateDocuments"
    :validate-on="['submit']"
    class="mt-4 p-3 md:-ml-5"
  >
    <div>
      <ConnectFormSection class="!p-0">
        <div class="max-w-bcGovInput space-y-5">
          <span aria-hidden="true">{{ $t('text.uploadReqDocs') }}</span>
          <UFormGroup
            name="documentUpload"
            :ui="{ help: 'mt-2 ml-10' }"
          >
            <DocumentUploadButton
              id="upload-documents"
              :label="$t('label.chooseDocsOpt')"
              accept="application/pdf"
              :is-required="false"
              :is-invalid="showError"
              help-id="supporting-documents-help"
              @change="(e: File[]) => e[0] ? addDocumentToList(e[0]) : undefined"
              @error="strataModal.openStrataDocUploadErrorModal"
            />

            <template #help>
              <span :id="docUploadHelpId">
                {{ $t('hint.docUpload') }}
              </span>
            </template>

            <template #error="{error}">
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
</template>
