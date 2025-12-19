<script setup lang="ts">
const { t } = useNuxtApp().$i18n

// page stuff
useHead({
  title: t('strr.title')
})

// definePageMeta({
//   path: '/'
// })

setBreadcrumbs([
  { label: t('strr.title') }
])
</script>
<template>
  <div>
    TBD
  </div>
</template>
