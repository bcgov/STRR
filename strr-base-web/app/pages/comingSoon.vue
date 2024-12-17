<script setup lang="ts">
const { t } = useI18n()

// page stuff
useHead({
  title: t('strr.title.comingSoon')
})

// definePageMeta({
//   path: '/comingSoon'
// })

setBreadcrumbs([
  {
    label: t('label.bcregDash'),
    to: useRuntimeConfig().public.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
  { label: t('strr.title.dashboard') }
])
</script>
<template>
  <div class="py-14 text-center">
    <ConnectTypographyH1 :text="$t('strr.title.comingSoon')" />
    <p class="pt-3">
      {{ $t('strr.text.comingSoon') }}
    </p>
  </div>
</template>
