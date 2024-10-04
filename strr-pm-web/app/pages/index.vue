<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: t('page.home.title')
})

definePageMeta({
  order: 0
})

setBreadcrumbs([
  { label: t('page.home.h1') }
])
</script>
<template>
  <div class="mx-auto flex flex-col gap-4 px-2 py-8 sm:px-4 sm:py-10">
    <h1>
      {{ $t('page.home.h1') }}
    </h1>

    <p>
      {{ $t('page.home.intro') }}
    </p>
  </div>
</template>
