<script setup lang="ts">
import { ConnectPageSection } from '#components'

const exStore = useExaminerStore()
const { activeReg, isApplication, hasRegistrationNumber } = storeToRefs(exStore)

const { t } = useNuxtApp().$i18n
const { isSnapshotRoute } = useExaminerRoute()

const docStore = useExaminerDocumentStore()
const { isPrUploadOpen } = storeToRefs(docStore)

// show all documents except those uploaded during NOC
const applicationDocumentsConfig: SupportingDocumentsConfig = {
  excludeUploadStep: [DocumentUploadStep.NOC]
}

// show documents uploaded during NOC only, with their date badges
const nocDocumentsConfig: SupportingDocumentsConfig = {
  includeUploadStep: [DocumentUploadStep.NOC],
  includeDateBadge: [DocumentUploadStep.NOC]
}

// show all documents for registrations with date badges
const registrationDocumentsConfig: SupportingDocumentsConfig = {
  excludeUploadStep: [DocumentUploadStep.NOC],
  showDateBadgeForAll: true
}

const canAddDocument = computed(() => {
  const snapshot = isSnapshotRoute?.value ?? false
  const isApp = isApplication?.value ?? false
  const hasReg = hasRegistrationNumber?.value ?? false
  const regStatus = activeReg?.value?.status

  return !snapshot &&
    ((isApp && !hasReg) ||
      (!isApp &&
        (regStatus === RegistrationStatus.ACTIVE ||
          regStatus === RegistrationStatus.SUSPENDED)))
})
</script>
<template>
  <ConnectPageSection v-if="activeReg?.documents?.length || canAddDocument">
    <div class="divide-y px-10 py-6">
      <div class="grid grid-cols-12 items-start gap-4">
        <div
          :class="canAddDocument ? 'col-span-11' : 'col-span-12'"
          class="divide-y"
        >
          <ApplicationDetailsSection
            :label="t('strr.label.supportingInfo')"
            data-testid="supporting-info-section"
          >
            <div
              v-if="activeReg?.documents?.length"
              data-testid="supporting-info-documents"
            >
              <SupportingDocuments
                class="mb-1 flex flex-col gap-y-2"
                data-testid="initial-app-documents"
                :config="isApplication ? applicationDocumentsConfig : registrationDocumentsConfig"
              />
              <SupportingDocuments
                class="flex flex-col gap-y-2"
                data-testid="noc-documents"
                :config="nocDocumentsConfig"
              />
            </div>
          </ApplicationDetailsSection>
        </div>
        <div
          v-if="canAddDocument"
          class="col-span-1 flex justify-end"
        >
          <UButton
            label="Add Document"
            variant="outline"
            size="sm"
            data-testid="add-pr-doc-btn"
            :disabled="isPrUploadOpen"
            @click="docStore.openPrUpload()"
          />
        </div>
      </div>
    </div>
  </ConnectPageSection>
</template>
