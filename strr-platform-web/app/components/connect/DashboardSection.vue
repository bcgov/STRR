<script setup lang="ts">
defineProps<{ title: string, titleNum?: number, loading: boolean }>()
</script>
<template>
  <div class="space-y-2">
    <slot name="header">
      <div class="flex gap-1">
        <ConnectTypographyH2 custom-class="text-lg font-bold" :text="title" />
        <p v-if="titleNum !== undefined" class="text-lg text-gray-900">
          ({{ titleNum }})
        </p>
      </div>
    </slot>
    <div class="rounded bg-white">
      <slot v-if="loading" name="loading">
        <div class="min-w-[300px] animate-pulse space-y-2 p-5">
          <div class="h-5 w-full rounded bg-gray-200" />
          <div class="h-5 w-full rounded bg-gray-200" />
          <div class="h-5 w-full rounded bg-gray-200" />
        </div>
      </slot>
      <slot v-else name="default" />
    </div>
  </div>
</template>
