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
  error: { type: Boolean, default: false }
})

const docStore = useDocumentStore()

const emit = defineEmits<{
  change: [any]
}>()

const { open, onChange } = useFileDialog({
  accept: props.accept,
  multiple: false,
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
    <USelectMenu
      v-model="docStore.selectedDocType"
      size="lg"
      :color="'gray'"
      :options="docStore.docTypeOptions"
      :aria-label="'Choose Supporting Documents'"
      :aria-required="isRequired"
      :aria-invalid="isInvalid"
      value-attribute="value"
      :ui-menu="{
        label: true ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'
      }"
      class="w-full cursor-pointer"
      @change="open()"
    >
      <template #label>
        <span>{{ label }}</span>
      </template>
    </USelectMenu>
  </div>
</template>
