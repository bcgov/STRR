<script setup lang="ts">
defineEmits<{
  cancel: [],
  done: []
}>()
</script>

<template>
  <div class="flex justify-end space-x-5">
    <UButton
      :label="$t('btn.cancel')"
      class="px-5 py-3"
      color="primary"
      variant="outline"
      @click="$emit('cancel')"
    />
    <UButton
      :label="$t('btn.done')"
      class="px-5 py-3"
      color="primary"
      @click="$emit('done')"
    />
  </div>
</template>
