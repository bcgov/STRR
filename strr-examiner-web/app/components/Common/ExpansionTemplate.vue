<script setup lang="ts">
defineProps<{ label?: string }>()
const { close } = useStrrExpansion()
</script>
<template>
  <div class="-mx-10 flex rounded bg-white px-10 py-4">
    <div v-if="label" class="w-1/5">
      <strong class="text-base text-gray-900">{{ label }}</strong>
    </div>
    <div class="grow pt-1 text-sm">
      <slot />
    </div>
    <div>
      <UButton :label="$t('btn.close')" variant="link" icon="i-mdi-close" trailing @click="close" />
    </div>
  </div>
</template>
