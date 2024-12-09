<script setup lang="ts">
const { t } = useI18n()
const { blInfo } = storeToRefs(useHostPropertyStore())
const { showUnitDetailsForm } = storeToRefs(usePropertyReqStore())
const { requiredDocs, storedDocuments } = storeToRefs(useDocumentStore())

// step 3 items
const supportingInfo = computed(() => [
  { label: t('strr.label.supportingDocs'), info: storedDocuments.value, slot: 'documents' },
  { label: '', info: '', slot: 'border' },
  { label: t('strr.label.businessLicense'), info: blInfo.value.businessLicense || t('text.notEntered') },
  { label: t('strr.label.businessLicenseDate'), info: blInfo.value.businessLicenseExpiryDate || t('text.notEntered') }
])
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
      <div class="space-y-1">
        <div v-if="!requiredDocs.length && showUnitDetailsForm">
          <div class="flex gap-2">
            <UIcon name="i-mdi-check" class="mt-[2px] size-4 text-green-600" />
            <p>{{ $t('text.noDocsReq') }}</p>
          </div>
        </div>
        <div v-else-if="!storedDocuments.length">
          <p>{{ $t('text.noDocsUploaded') }}</p>
        </div>
        <div v-for="doc in storedDocuments" :key="doc.id" class="flex w-full gap-2">
          <UIcon
            name="i-mdi-paperclip"
            class="size-6 text-blue-500"
          />
          <div class="flex flex-col">
            <span class="text-sm font-bold">{{ $t(`form.pr.docType.${doc.type}`) }}</span>
            <span>{{ doc.name }}</span>
          </div>
        </div>
      </div>
    </template>
  </ConnectInfoTable>
</template>
