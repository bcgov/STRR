<script setup lang="ts">
defineProps<{ text: string }>()
</script>
<template>
  <h2 :class="`font-bold text-[24px]`" data-testid="h2">
    {{ text }}
  </h2>
</template>
