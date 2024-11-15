<script setup lang="ts">
defineProps<{ title?: string, titleClass?: string, content?: string, contentClass?: string }>()
</script>
<template>
  <div class="flex w-full flex-col overflow-hidden sm:max-w-[300px] sm:pr-4">
    <strong v-if="title" :class="titleClass || 'text-[smaller] font-bold italic tracking-wider'">
      {{ title }}
    </strong>
    <div :class="contentClass || 'line-clamp-6 break-words'">
      <slot>
        <p v-if="content" data-testid="content">
          {{ content }}
        </p>
      </slot>
    </div>
  </div>
</template>
