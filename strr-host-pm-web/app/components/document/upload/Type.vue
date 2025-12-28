<script lang="ts" setup>

const { t } = useI18n()
const docStore = useDocumentStore()
const strrModal = useStrrModals()

const props = defineProps<{
  title: string,
  formFieldName: string,
  docUploadType: DocumentUploadTypeEnum // document types for upload for the dropdown
  docUploadStep: DocumentUploadStep,
  hasError: boolean
}>()

const { storedDocuments } = storeToRefs(docStore)

const docUploadHelpId = useId() // id for aria-describedby on doc select

const allowedDocumentTypes = Object.values(props.docUploadType) as DocumentUploadType[]

const uploadedDocuments = computed(() =>
  storedDocuments.value.filter(doc => allowedDocumentTypes.includes(doc.type))) // filter all uploaded docs based on allowed types

const docOptions = computed(() =>
  allowedDocumentTypes.map(type => ({
    label: t(`form.pr.docType.${type}`),
    value: type
  }))
)

</script>

<template>
  <ConnectFormSection
    :title="props.title"
    :error="props.hasError"
  >
    <div class="max-w-bcGovInput space-y-5">
      <UFormGroup
        :name="props.formFieldName"
        :ui="{ help: 'mt-2 ml-10' }"
      >
        <DocumentUploadSelect
          id="supporting-documents-type-select"
          :label="$t('label.chooseDocs')"
          :is-invalid="props.hasError"
          :error="props.hasError"
          :is-required="docStore.requiredDocs.length > 0"
          :help-id="docUploadHelpId"
          :doc-options="docOptions"
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
      <DocumentListItem
        :documents="uploadedDocuments"
        @remove="docStore.removeStoredDocument"
      />
    </div>
  </ConnectFormSection>
</template>
