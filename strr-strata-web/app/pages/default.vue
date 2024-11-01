<script setup lang="ts">
const { t } = useI18n()

// page stuff
useHead({
  title: t('strr.title.default')
})

definePageMeta({
  path: '/'
})

setBreadcrumbs([
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: t('strr.title.default') }
])
</script>
<template>
  <div>
    TBD
  </div>
</template>
