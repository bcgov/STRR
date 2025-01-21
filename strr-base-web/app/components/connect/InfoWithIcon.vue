<script setup lang="ts">
defineProps<{
  icon: string,
  iconClass?: string,
  content?: string,
  contentClass?: string,
  wrapperClass?: string
}>()
</script>
<template>
  <div :class="wrapperClass || 'flex space-x-2'">
    <UIcon :name="icon" :class="iconClass || 'size-5 shrink-0'" />
    <div :class="contentClass || 'space-y-3'">
      <slot>
        <p>{{ content || '' }}</p>
      </slot>
    </div>
  </div>
</template>
