<template>
  <h1 :class="`${noSpacing ? '' : 'pb-[25px]'} ${className} font-bold text-[32px]`" data-test-id="h1">
    {{ text }}
  </h1>
</template>

<script setup lang="ts">
const {
  text,
  className,
  noSpacing = false
} = defineProps<{
  text: string,
  className?: string,
  noSpacing?: boolean
}>()
</script>
