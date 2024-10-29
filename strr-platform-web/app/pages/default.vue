<script setup lang="ts">
const { t } = useI18n()

// page stuff
useHead({
  title: t('platform.title')
})

definePageMeta({
  path: '/'
})

setBreadcrumbs([
  { label: t('platform.title') }
])
</script>
<template>
  <div>
    TBD
  </div>
</template>
