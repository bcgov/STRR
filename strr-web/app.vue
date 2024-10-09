<template>
  <div>
    <LoadingIndicator />
    <Suspense>
      <template #default>
        <NuxtLayout />
      </template>
      <template #fallback>
        <LoadingIndicator is-loading />
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import LoadingIndicator from '~/components/common/LoadingIndicator.vue'
</script>
