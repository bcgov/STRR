<script setup lang="ts">
import PlatformDashboard from '../../dashboard.vue'

definePageMeta({
  layout: 'connect-dashboard',
  middleware: ['auth', 'check-tos', 'require-premium-account'],
  onAccountChange: (oldAccount: Account, newAccount: Account) => manageAccountChangeDashboard(oldAccount, newAccount)
})
</script>

<template>
  <PlatformDashboard />
</template>
