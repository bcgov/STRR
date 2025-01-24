<script setup lang="ts">
import type { TableColumn } from '#ui/types'
import type { TableSort } from '~/types/table-sort'
defineProps<{
  column: TableColumn
  sort?: TableSort
}>()

defineEmits<{
  sort: [void]
}>()
</script>
<template>
  <div class="flex h-14 items-center">
    <button
      v-if="column.sortable"
      class="inline-flex size-full items-center justify-between p-2 ring-inset
      ring-blue-500 hover:bg-gray-300 focus:outline-none focus-visible:ring-2"
      @click="$emit('sort')"
    >
      <span
        :class="sort?.column === column.key ? 'text-bcGovGray-900' : 'text-[#757575]'"
      >
        {{ column.label }}
      </span>
      <UIcon
        v-if="sort?.column === column.key"
        :name="sort?.direction === 'asc' ? 'i-mdi-arrow-up' : 'i-mdi-arrow-down'"
        class="size-5 shrink-0 text-gray-900"
      />
    </button>
    <span
      v-else
      class="w-full p-2 text-[#757575]"
    >
      {{ column.label }}
    </span>
  </div>
</template>
