<script setup lang="ts">
defineProps({
  id: { type: String, required: true },
  isDisabled: { type: Boolean, default: false },
  isRequired: { type: Boolean, default: false },
  isInvalid: { type: Boolean, default: false },
  label: { type: String, default: '' },
  helpId: { type: String, default: undefined },
  ariaLabel: { type: String, default: undefined },
  accept: { type: String, default: undefined },
  multiple: { type: Boolean, default: false },
  directory: { type: Boolean, default: false }
})

defineEmits<{
  change: [files: FileList | null]
  cancel: [void]
}>()
</script>
<template>
  <div
    :id
    class="flex w-full items-center gap-2"
  >
    <UIcon
      name="i-mdi-paperclip"
      class="size-6 shrink-0 text-blue-500"
    />
    <div
      class="relative h-[56px] w-full rounded-t border-b border-gray-500 bg-gray-100
      focus-within:border-b-2 focus-within:border-blue-500 hover:border-gray-600 hover:bg-gray-200"
      :class="{
        'border-red-600 bg-red-100 focus-within:border-red-600 hover:border-red-600 hover:bg-red-100': isInvalid
      }"
    >
      <label
        for="file-input"
        class="absolute flex size-full items-center px-4 text-left text-bcGovGray-700"
      >
        {{ label }}
      </label>
      <input
        id="file-input"
        type="file"
        class="absolute size-full cursor-pointer opacity-0 ring-0 focus:outline-none focus:ring-0"
        :accept
        :multiple
        :webkitdirectory="directory"
        :aria-required="isRequired"
        :aria-invalid="isInvalid"
        :aria-label="ariaLabel"
        :aria-describedby="helpId"
        :disabled="isDisabled"
        @cancel="$emit('cancel')"
        @change="(e) => $emit('change', (e.target as HTMLInputElement).files)"
      >
    </div>
  </div>
</template>
