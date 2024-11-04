<script setup lang="ts">
defineProps<{ text: string, customClass?: string }>()
</script>
<template>
  <h1 :class="customClass || 'text-[2rem] font-bold'" data-testid="h1">
    {{ text }}
  </h1>
</template>
