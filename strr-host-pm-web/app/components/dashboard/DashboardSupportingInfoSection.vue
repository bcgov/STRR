<script setup lang="ts">
const { t } = useNuxtApp().$i18n

defineProps<{
  loading: boolean
  needsBusinessLicenseDocumentUpload: boolean
}>()
</script>
<template>
  <ConnectDashboardSection
    id="supporting-info-section"
    data-test-id="supporting-info-section"
    :title="$t('strr.label.supportingInfo')"
    :loading="loading"
  >
    <UAlert
      v-if="needsBusinessLicenseDocumentUpload"
      color="yellow"
      icon="i-mdi-alert"
      :close-button="null"
      variant="subtle"
      :ui="{
        inner: 'pt-0',
        icon: {
          base: 'flex-shrink-0 w-5 h-5 self-start'
        }
      }"
    >
      <template #title>
        <span class="text-black">
          <span class="font-bold">{{ t('alert.businessLicense.title') }}</span>
          {{ t('alert.businessLicense.description') }}
        </span>
      </template>
    </UAlert>
    <SummarySupportingInfo
      id="summary-supporting-info"
      class="px-10 py-5"
      data-test-id="summary-supporting-info"
      is-dashboard
    />
  </ConnectDashboardSection>
</template>
