<template>
  <h1 :class="`${noSpacing ? '' : 'pb-[25px]'} font-bold text-[32px]`" data-test-id="h1">
    {{ text }}
  </h1>
</template>

<script setup lang="ts">
const {
  text,
  noSpacing = false
} = defineProps<{
  text: string,
  noSpacing?: boolean
}>()
</script>
