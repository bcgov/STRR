<script setup lang="ts">
defineProps<{
  documents: UiDocument[]
}>()

defineEmits<{
  remove: [UiDocument]
}>()
</script>
<template>
  <li
    v-for="doc in documents"
    :key="doc.id"
    class="flex flex-col gap-1"
  >
    <div
      class="flex items-center justify-between rounded bg-gray-100 p-3"
      :class="{
        'opacity-90': doc.loading,
        'bg-red-100': doc.error
      }"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            :name="doc.loading
              ? 'i-heroicons-arrow-path-20-solid'
              : doc.error
                ? 'i-mdi-alert'
                : 'i-mdi-paperclip'
            "
            class="size-5"
            :class="{
              'animate-spin': doc.loading,
              'text-red-500': doc.error
            }"
          />
          <span>{{ doc.name }}</span>
          {{ doc.file.size }}
        </div>
      </div>
      <UButton
        :label="'Remove'"
        variant="link"
        trailing-icon="i-mdi-close"
        :disabled="doc.loading"
        @click="$emit('remove', doc)"
      />
    </div>
    <p
      class="ml-2 text-sm"
      :class="{
        'text-red-500': doc.error
      }"
    >
      {{ doc.message }}
    </p>
  </li>
</template>
