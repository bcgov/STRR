<script setup lang="ts">
const props = defineProps({
  id: { type: String, required: true },
  isDisabled: { type: Boolean, default: false },
  isRequired: { type: Boolean, default: false },
  isInvalid: { type: Boolean, default: false },
  label: { type: String, default: '' },
  size: { type: String, default: 'lg' },
  helpId: { type: String, default: undefined },
  ariaLabel: { type: String, default: undefined },
  accept: { type: String, default: undefined },
  multiple: { type: Boolean, default: true }
})

const emit = defineEmits<{
  change: [any]
}>()

const { open, onChange } = useFileDialog({
  accept: props.accept,
  multiple: props.multiple,
  directory: false
})

onChange((files) => {
  const file = files?.[0]
  if (file) {
    emit('change', file)
  }
})
</script>
<template>
  <div
    :id
    class="flex w-full items-center gap-2"
  >
    <UIcon
      name="i-mdi-paperclip"
      class="size-6 text-blue-500"
    />
    <button
      class="h-[56px] w-full rounded-t border-b border-gray-500 bg-gray-100 px-4 text-left ring-0
       hover:border-gray-600 hover:bg-gray-200 focus:border-b-2 focus:border-blue-500 focus:outline-none focus:ring-0"
      :aria-required="isRequired"
      :aria-invalid="isInvalid"
      :aria-label="ariaLabel"
      :disabled="isDisabled"
      @click="open()"
    >
      {{ label }}
    </button>
  </div>
</template>
<style>
::-webkit-file-upload-button {
   display: none;
}

::file-selector-button {
  display: none;
}
</style>
