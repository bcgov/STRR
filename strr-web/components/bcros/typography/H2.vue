<template>
  <h2 :class="`${className} font-bold text-[24px] py-[25px]`" :data-cy="dataCy">
    {{ t(text) }}
  </h2>
</template>

<script setup lang="ts">
const t = useNuxtApp().$i18n.t
const { text, className, dataCy } = defineProps<{ text: string, className: string, dataCy?: string }>()
</script>
