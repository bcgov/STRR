<script setup lang="ts">
import StrataDashboard from '../[applicationId].vue'

definePageMeta({
  layout: 'connect-dashboard',
  middleware: ['auth', 'check-tos', 'require-account'],
  onAccountChange: async () => {
    const { $router, $i18n } = useNuxtApp()
    await $router.push(`/${$i18n.locale.value}/strata-hotel/dashboard`)
    return true
  }
})
</script>

<template>
  <StrataDashboard />
</template>
