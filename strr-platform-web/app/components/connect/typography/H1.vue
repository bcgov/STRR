<script setup lang="ts">
defineProps<{ text: string }>()
</script>
<template>
  <h1 class="text-[32px] font-bold" data-testid="h1">
    {{ text }}
  </h1>
</template>
