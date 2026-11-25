<script setup lang="ts">
defineProps<{
  date: string // formatted date from which the renewal can be submitted
}>()
</script>
<template>
  <UAlert
    color="yellow"
    icon="i-mdi-alert"
    :close-button="null"
    variant="subtle"
    :ui="{ inner: 'pt-0' }"
    data-testid="early-renewal-alert"
  >
    <template #description>
      <p>
        <ConnectI18nHelper translation-path="text.earlyRenewal" :date="date" />
      </p>
    </template>
  </UAlert>
</template>
