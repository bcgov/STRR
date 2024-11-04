<script setup lang="ts">
defineProps<{
  title?: string
  optional?: boolean
  className?: string
  error?: boolean
}>()
</script>
<template>
  <div
    data-testid="form-section"
    class="px-4 md:px-10"
    :class="[className, error ? 'border-l-2 border-red-600' : '']"
  >
    <div class="flex flex-col sm:flex-row">
      <div v-if="title" class="w-[200px]">
        <p class="mb-2 sm:mb-0 sm:font-bold" :class="error ? 'text-red-600' : ''">
          {{ title }}
        </p>
        <p v-if="optional">
          {{ $t('general.optional') }}
        </p>
      </div>
      <div class="w-full sm:pl-5">
        <slot />
      </div>
    </div>
  </div>
</template>
