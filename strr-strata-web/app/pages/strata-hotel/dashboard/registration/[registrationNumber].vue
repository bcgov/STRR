<script setup lang="ts">
import StrataDashboard from '../[applicationId].vue'

definePageMeta({
  layout: 'connect-dashboard',
  middleware: ['auth', 'check-tos', 'require-account']
})
</script>

<template>
  <StrataDashboard />
</template>
