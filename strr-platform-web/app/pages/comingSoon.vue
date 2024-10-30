<script setup lang="ts">
const { t } = useI18n()

// page stuff
useHead({
  title: t('platform.title.comingSoon')
})

definePageMeta({
  path: '/comingSoon'
})

setBreadcrumbs([
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: t('platform.title.dashboard') }
])
</script>
<template>
  <div class="py-14 text-center">
    <ConnectTypographyH1 :text="$t('platform.title.comingSoon')" />
    <p class="pt-3">
      {{ $t('platform.text.comingSoon') }}
    </p>
  </div>
</template>
