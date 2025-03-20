<script setup lang="ts">
import { ConnectPageSection } from '#components'

const exStore = useExaminerStore()
const { activeReg } = storeToRefs(exStore)

const { t } = useI18n()

// show all documents except those uploaded during NOC
const applicationDocumentsConfig: SupportingDocumentsConfig = {
  excludeUploadStep: [DocumentUploadStep.NOC]
}

// show documents uploaded during NOC only, with their date badges
const nocDocumentsConfig: SupportingDocumentsConfig = {
  includeUploadStep: [DocumentUploadStep.NOC],
  includeDateBadge: [DocumentUploadStep.NOC]
}

</script>
<template>
  <ConnectPageSection v-if="activeReg?.documents?.length">
    <div class="divide-y px-10 py-6">
      <ApplicationDetailsSection :label="t('strr.label.supportingInfo')">
        <SupportingDocuments
          class="mb-1 flex gap-y-1"
          :config="applicationDocumentsConfig"
        />
        <SupportingDocuments
          class="mb-1 flex gap-y-1"
          :config="nocDocumentsConfig"
        />
      </ApplicationDetailsSection>
    </div>
  </ConnectPageSection>
</template>
