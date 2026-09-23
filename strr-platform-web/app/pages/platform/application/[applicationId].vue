<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()

definePageMeta({
  middleware: ['auth', 'check-tos', 'require-premium-account']
})

await navigateTo({
  path: localePath('/platform/application'),
  query: {
    ...route.query,
    applicationId: route.params.applicationId as string,
    override: 'true'
  }
})
</script>

<template>
  <div />
</template>
