<script setup lang="ts">
import type { NuxtError } from '#app'

const { t } = useI18n()
const localePath = useLocalePath()

const props = defineProps({
  error: { type: Object as () => NuxtError, default: undefined }
})

// TODO: update with other error codes?
const errorKey: string | number = props.error?.statusCode === 404 ? 404 : 'unknown'

// cant use definePageMeta in error.vue
useRoute().meta.hideBreadcrumbs = true

useHead({
  title: errorKey === 404 ? t('page.error.404.title') : t('page.error.unknown.title')
})

</script>

<template>
  <NuxtLayout name="default">
    <div class="m-auto flex flex-col items-center gap-4">
      <h1>
        {{ $t(`page.error.${errorKey}.h1`) }}
      </h1>
      <p>{{ $t(`page.error.${errorKey}.content`) }}</p>
      <UButton
        :label="$t('btn.goHome')"
        icon="i-mdi-home"
        size="bcGov"
        :to="localePath('/')"
      />
    </div>
  </NuxtLayout>
</template>
