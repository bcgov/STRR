<!-- using this to cleanup the Review component template,
should add an 'actions' prop to the ConnectPageSection component to avoid this -->
<script setup lang="ts">
defineProps<{
  title: string
  icon: string
}>()

defineEmits<{
  edit: [void]
}>()
</script>
<template>
  <div class="flex items-center px-4">
    <div class="inline-flex grow items-center gap-2">
      <UIcon
        :name="icon"
        class="size-6 shrink-0 text-bcGovColor-activeBlue"
      />
      <h2>
        {{ title }}
      </h2>
    </div>
    <UButton
      :label="$t('word.Edit')"
      icon="i-mdi-edit"
      variant="link"
      :padded="false"
      @click="$emit('edit')"
    />
  </div>
</template>
