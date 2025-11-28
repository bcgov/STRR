<script setup lang="ts">
defineProps<{
  loading: boolean
}>()
</script>
<template>
  <ConnectDashboardSection
    id="short-term-rental-section"
    data-test-id="rental-section"
    :title="$t('strr.label.shortTermRental')"
    :loading="loading"
  >
    <SummaryProperty class="px-10 py-5" data-test-id="summary-property" />
  </ConnectDashboardSection>
</template>
