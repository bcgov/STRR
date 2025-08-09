<script setup lang="ts">
import isEmpty from 'lodash/isEmpty'

const props = defineProps<{
  config?: SupportingDocumentsConfig
}>()

const { t } = useI18n()
const exStore = useExaminerStore()
const { openDocInNewTab } = exStore
const { activeReg, activeHeader, isApplication } = storeToRefs(exStore)
const { applicationNumber } = activeHeader.value
const { documents } = activeReg.value as { documents: ApiDocument[] }

// filters documents based on the provided configuration
const filterDocumentsByConfig = (config: SupportingDocumentsConfig): ApiDocument[] => {
  const { includeTypes = [], excludeTypes = [], includeUploadStep = [], excludeUploadStep = [] } = config

  return documents.filter((doc: ApiDocument) => {
    const includeType = includeTypes.length ? includeTypes.includes(doc.documentType) : true
    const excludeType = excludeTypes.includes(doc.documentType)
    const includeStep = includeUploadStep.length
      ? includeUploadStep.includes(doc.uploadStep as DocumentUploadStep)
      : true
    const excludeStep = excludeUploadStep.includes(doc.uploadStep as DocumentUploadStep)

    return includeType && !excludeType && includeStep && !excludeStep
  })
}
// optionally filter documents based on config, or return all documents
const filteredDocuments = computed(() => props.config ? filterDocumentsByConfig(props.config) : documents)

const appRegNumber = computed((): string | number =>
  isApplication.value ? applicationNumber : activeReg.value.id
)
</script>

<template>
  <div v-if="!isEmpty(filteredDocuments)">
    <span
      v-for="(document, index) in filteredDocuments"
      :key="document.fileKey"
      class="mr-4 flex whitespace-nowrap"
    >
      <UButton
        class="gap-x-1 p-0"
        variant="link"
        icon="mdi-file-document-outline"
        :data-testid="`open-business-lic-btn-${index}`"
        @click="openDocInNewTab(appRegNumber, document, isApplication ? 'applications' : 'registrations' )"
      >
        {{ t(`documentLabels.${document.documentType}`) }}
      </UButton>
      <UBadge
        v-if="(document.uploadStep && props.config?.includeDateBadge?.includes(document.uploadStep)) ||
          (props.config?.showDateBadgeForAll && (document.uploadDate || document.addedOn))"
        :label="`${ t('strr.label.added')} ` + (document.uploadDate || document.addedOn)"
        size="sm"
        class="ml-2 px-3 py-0 font-bold"
        data-testid="supporting-doc-date-badge"
      />
    </span>
  </div>
</template>
