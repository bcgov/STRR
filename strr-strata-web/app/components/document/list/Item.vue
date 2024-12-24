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
        'opacity-90': doc.loading
      }"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            :name="doc.loading
              ? 'i-heroicons-arrow-path-20-solid'
              : 'i-mdi-check-circle'
            "
            class="size-6"
            :class="{
              'animate-spin': doc.loading,
              'text-green-500': !doc.loading
            }"
          />
          <div class="flex flex-col">
            <span class="text-sm font-bold">{{ $t(`docType.${doc.type}`) }}</span>
            <span>{{ doc.name }}</span>
          </div>
        </div>
      </div>
      <UButton
        :label="$t('word.Remove')"
        variant="link"
        :disabled="doc.loading"
        @click="$emit('remove', doc)"
      />
    </div>
  </li>
</template>
