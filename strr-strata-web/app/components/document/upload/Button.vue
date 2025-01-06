<script setup lang="ts">
const props = defineProps({
  id: { type: String, required: true },
  isDisabled: { type: Boolean, default: false },
  isRequired: { type: Boolean, default: false },
  isInvalid: { type: Boolean, default: false },
  label: { type: String, default: '' },
  helpId: { type: String, default: undefined },
  ariaLabel: { type: String, default: undefined },
  accept: { type: String, default: undefined }, // e.g., 'application/pdf, image/png'
  multiple: { type: Boolean, default: false },
  directory: { type: Boolean, default: false },
  maxFileSize: { type: Number, default: 10 * 1024 * 1024 } // in bytes - default 10mb
})

const emit = defineEmits<{
  change: [files: File[]]
  cancel: [void]
  error: [Array<{ file: File, reason: 'fileType' | 'fileSize' }>]
  reset: [void]
}>()

const inputRef = useTemplateRef('inputRef')

function onChange (e: Event) {
  const files = (e.target as HTMLInputElement).files

  if (!files || files.length === 0) {
    emit('reset')
    return
  }

  const validFiles: File[] = []
  const invalidFiles: Array<{ file: File, reason: 'fileType' | 'fileSize' }> = []

  const acceptedTypes: string[] = props.accept ? props.accept.split(',').map(type => type.trim()) : []

  for (const file of files) {
    // validate file type
    if (acceptedTypes.length && !acceptedTypes.includes(file.type)) {
      invalidFiles.push({ file, reason: 'fileType' })
      continue
    }

    // validate file size
    if (file.size > props.maxFileSize) {
      invalidFiles.push({ file, reason: 'fileSize' })
      continue
    }

    validFiles.push(file)
  }

  if (invalidFiles.length > 0) {
    emit('error', invalidFiles)
  }

  if (validFiles.length > 0) {
    emit('change', validFiles)
  }

  // TODO: assign valid files to file input or maybe use aria-describedby ?
  // reset to remove invalid files, this currently also removes valid files as well so will need some improvement
  if (inputRef.value) {
    inputRef.value.value = ''
  }
  emit('reset')
}
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
        :class="{
          'text-red-600': isInvalid
        }"
      >
        {{ label }}
      </label>
      <input
        id="file-input"
        ref="inputRef"
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
        @change="onChange"
      >
    </div>
  </div>
</template>
