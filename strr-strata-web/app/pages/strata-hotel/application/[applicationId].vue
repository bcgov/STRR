<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()

definePageMeta({
  middleware: ['auth', 'check-tos', 'require-account']
})

await navigateTo({
  path: localePath('/strata-hotel/application'),
  query: { applicationId: route.params.applicationId as string }
})
</script>

<template>
  <div />
</template>
