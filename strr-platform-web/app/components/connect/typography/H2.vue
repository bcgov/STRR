<script setup lang="ts">
defineProps<{ text: string, customClass?: string }>()
</script>
<template>
  <h2 :class="customClass || 'text-[1.5rem] font-bold'" data-testid="h2">
    {{ text }}
  </h2>
</template>
