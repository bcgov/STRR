<template>
  <div data-test-id="form-item" class="flex flex-col flex-1 mobile:mb-[24px]">
    <p class="font-bold">
      {{ title }}
    </p>
    <p v-if="content">
      {{ content }}
    </p>
    <slot />
  </div>
</template>

<script setup lang="ts">
const { title, content } = defineProps<{
  title: string
  content?: string
}>()

</script>
