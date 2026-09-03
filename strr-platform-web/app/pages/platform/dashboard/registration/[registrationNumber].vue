<script setup lang="ts">
import PlatformDashboard from '../../dashboard.vue'

definePageMeta({
  layout: 'connect-dashboard',
  middleware: ['auth', 'check-tos', 'require-premium-account']
})
</script>

<template>
  <PlatformDashboard />
</template>
