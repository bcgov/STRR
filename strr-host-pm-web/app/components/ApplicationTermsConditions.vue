<script setup lang="ts">
const { t } = useNuxtApp().$i18n
</script>

<template>
  <BaseTermsConditions
    :status-label="t('strr.label.applicationStatus')"
    data-test-id="app-terms-conditions"
  />
</template>
