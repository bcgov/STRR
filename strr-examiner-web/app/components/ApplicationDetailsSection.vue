<script setup lang="ts">

const props = defineProps<{ label: string, subLabel?: string }>()

</script>

<template>
  <div class="flex py-4 text-sm">
    <div class="block min-w-[25px]">
      <slot name="icon" />
    </div>
    <div class="flex w-1/5 flex-none flex-col items-start justify-start">
      <span class="text-sm font-bold">{{ props.label }}</span>
      <span class="text-sm">{{ props.subLabel }}</span>
    </div>
    <div class="flex-auto">
      <slot />
    </div>
  </div>
</template>

<style scoped></style>
