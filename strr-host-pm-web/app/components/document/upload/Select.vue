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
  accept: { type: String, default: undefined }, // e.g., 'application/pdf, image/png'
  error: { type: Boolean, default: false },
  maxFileSize: { type: Number, default: 10 * 1024 * 1024 } // 10mb
})

const docStore = useDocumentStore()

const emit = defineEmits<{
  change: [File]
  cancel: [void]
  error: ['fileSize' | 'fileType']
  reset: [void]
}>()

const { open, onChange, onCancel, reset } = useFileDialog({
  accept: props.accept,
  multiple: false,
  directory: false
})

onCancel(() => {
  emit('cancel')
})

onChange((files) => {
  const file = files?.[0]

  if (!file) {
    emit('reset') // cleanup side effects (selected doc type)
    reset() // cleanup useFileDialog
    return
  }

  // validate file type
  if (props.accept) {
    const acceptedTypes = props.accept.split(',').map(type => type.trim())
    if (!acceptedTypes.includes(file.type)) {
      emit('error', 'fileType')
      emit('reset')
      reset()
      return
    }
  }

  // validate file size
  if (file.size > props.maxFileSize) {
    emit('error', 'fileSize')
    emit('reset')
    reset()
    return
  }

  emit('change', file)
  emit('reset')
  reset()
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
      :aria-label="label"
      :aria-required="isRequired"
      :aria-invalid="isInvalid"
      value-attribute="value"
      :aria-describedby="helpId"
      class="w-full"
      @change="open()"
    >
      <template #label>
        <span :class="!!error ? 'text-red-600' : 'text-gray-700'">{{ label }}</span>
      </template>
    </USelectMenu>
  </div>
</template>
